from __future__ import annotations

import io
import re

import httpx
from pypdf import PdfReader

from .models import DiscoveredLegalDocument


def _normalize_text(value: str) -> str:
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


def _act_number_matches(
    act_number: str | None,
    raw_text: str,
) -> bool:
    if not act_number:
        return True

    match = re.match(
        r"(\d+)/(\d{4})",
        act_number.strip(),
    )

    if not match:
        return True

    number = match.group(1)
    year = match.group(2)

    normalized_text = raw_text.lower()

    patterns = [
        rf"\b{re.escape(number)}/{re.escape(year)}\b",
        rf"\bno\.?\s*{re.escape(number)}\s+of\s+{re.escape(year)}\b",
        rf"\bno\.?\s*{re.escape(number)}\s+OF\s+{re.escape(year)}\b",
    ]

    return any(
        re.search(
            pattern,
            normalized_text,
            re.IGNORECASE,
        )
        for pattern in patterns
    )


def _title_matches(
    expected_title: str | None,
    raw_text: str,
) -> bool:
    if not expected_title:
        return True

    normalized_title = _normalize_text(
        expected_title,
    )

    normalized_text = _normalize_text(
        raw_text,
    )

    # Exact normalized title match
    if normalized_title in normalized_text:
        return True

    # Fallback keyword matching
    title_words = [
        word
        for word in normalized_title.split()
        if len(word) >= 4
        and word
        not in {
            "amendment",
            "act",
            "the",
            "and",
            "with",
            "from",
        }
    ]

    if not title_words:
        return True

    matched_words = sum(
        1
        for word in title_words
        if word in normalized_text
    )

    required_matches = max(
        1,
        int(len(title_words) * 0.6),
    )

    return matched_words >= required_matches


async def extract_pdf_text(
    document: DiscoveredLegalDocument,
) -> DiscoveredLegalDocument:
    if not document.download_url:
        document.metadata["pdf_extracted"] = False
        document.metadata["pdf_identity_valid"] = False
        document.metadata["pdf_error"] = (
            "No download URL available."
        )

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

        content_type = response.headers.get(
            "content-type",
            "",
        ).lower()

        if (
            "pdf" not in content_type
            and not document.download_url
            .lower()
            .endswith(".pdf")
        ):
            document.metadata["pdf_extracted"] = False
            document.metadata["pdf_identity_valid"] = False
            document.metadata["pdf_error"] = (
                f"Unexpected content type: {content_type}"
            )

            return document

        pdf_stream = io.BytesIO(
            response.content,
        )

        reader = PdfReader(
            pdf_stream,
        )

        page_texts: list[str] = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                page_texts.append(
                    text,
                )

        raw_text = "\n\n".join(
            page_texts,
        )

        raw_text = raw_text.replace(
            "\x00",
            " ",
        )

        raw_text = re.sub(
            r"[ \t]+",
            " ",
            raw_text,
        )

        raw_text = re.sub(
            r"\n{3,}",
            "\n\n",
            raw_text,
        )

        raw_text = raw_text.strip()

        # Save extraction metadata BEFORE validation.
        document.metadata["pdf_page_count"] = len(
            reader.pages,
        )

        document.metadata["text_length"] = len(
            raw_text,
        )

        if not raw_text:
            document.metadata["pdf_extracted"] = False
            document.metadata["pdf_identity_valid"] = False
            document.metadata["pdf_error"] = (
                "PDF downloaded successfully but "
                "no extractable text was found."
            )

            return document

        number_matches = _act_number_matches(
            document.act_number,
            raw_text,
        )

        title_matches = _title_matches(
            document.title,
            raw_text,
        )

        document.metadata[
            "act_number_matches"
        ] = number_matches

        document.metadata[
            "title_matches"
        ] = title_matches

        if (
            not number_matches
            or not title_matches
        ):
            document.metadata["pdf_extracted"] = False
            document.metadata["pdf_identity_valid"] = False
            document.metadata["pdf_error"] = (
                "Downloaded PDF does not match "
                "the expected Act metadata."
            )

            document.raw_text = None

            return document

        document.raw_text = raw_text

        document.metadata["pdf_extracted"] = True
        document.metadata["pdf_identity_valid"] = True

        document.metadata.pop(
            "pdf_error",
            None,
        )

    except Exception as error:
        document.metadata["pdf_extracted"] = False
        document.metadata["pdf_identity_valid"] = False
        document.metadata["pdf_error"] = str(
            error,
        )

    return document