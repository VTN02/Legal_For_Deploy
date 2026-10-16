from __future__ import annotations

import io
import re

import httpx
from pypdf import PdfReader

from .models import DiscoveredCourtDecision


def _normalize_text(
    value: str,
) -> str:
    value = value.lower()

    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )

    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def _case_number_matches(
    case_number: str | None,
    raw_text: str,
) -> bool:
    if not case_number:
        return True

    normalized_case = _normalize_text(
        case_number
    )

    normalized_text = _normalize_text(
        raw_text
    )

    if normalized_case in normalized_text:
        return True

    case_tokens = [
        token
        for token in normalized_case.split()
        if len(token) >= 2
    ]

    if not case_tokens:
        return True

    matched = sum(
        1
        for token in case_tokens
        if token in normalized_text
    )

    required = max(
        1,
        int(
            len(case_tokens)
            * 0.6
        ),
    )

    return matched >= required


async def extract_court_pdf_text(
    document: DiscoveredCourtDecision,
) -> DiscoveredCourtDecision:

    if not document.download_url:
        document.metadata[
            "pdf_extracted"
        ] = False

        document.metadata[
            "pdf_identity_valid"
        ] = False

        document.metadata[
            "pdf_error"
        ] = "No judgment PDF URL available."

        return document

    headers = {
        "User-Agent": (
            "Mozilla/5.0 "
            "(Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/155.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(
            headers=headers,
            timeout=60.0,
            follow_redirects=True,
        ) as client:
            response = await client.get(
                document.download_url,
            )

            response.raise_for_status()

        reader = PdfReader(
            io.BytesIO(
                response.content
            )
        )

        page_texts: list[str] = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                page_texts.append(
                    text
                )

        raw_text = "\n\n".join(
            page_texts
        ).strip()

        document.metadata[
            "pdf_page_count"
        ] = len(
            reader.pages
        )

        document.metadata[
            "text_length"
        ] = len(
            raw_text
        )

        if not raw_text:
            document.metadata[
                "pdf_extracted"
            ] = False

            document.metadata[
                "pdf_identity_valid"
            ] = False

            document.metadata[
                "pdf_error"
            ] = (
                "PDF contained no "
                "extractable text."
            )

            return document

        case_matches = (
            _case_number_matches(
                document.case_number,
                raw_text,
            )
        )

        document.metadata[
            "case_number_matches"
        ] = case_matches

        if not case_matches:
            document.metadata[
                "pdf_extracted"
            ] = False

            document.metadata[
                "pdf_identity_valid"
            ] = False

            document.metadata[
                "pdf_error"
            ] = (
                "Downloaded PDF does "
                "not match the expected "
                "case number."
            )

            return document

        document.raw_text = raw_text

        document.metadata[
            "pdf_extracted"
        ] = True

        document.metadata[
            "pdf_identity_valid"
        ] = True

        document.metadata.pop(
            "pdf_error",
            None,
        )

    except Exception as error:
        document.metadata[
            "pdf_extracted"
        ] = False

        document.metadata[
            "pdf_identity_valid"
        ] = False

        document.metadata[
            "pdf_error"
        ] = str(error)

    return document