from __future__ import annotations

import json
from pathlib import Path

from app.agents.legal_intelligence.models import (
    LegalLawListItem,
)


BASE_DIR = Path(__file__).resolve().parents[4]

PARLIAMENT_ACTS_FILE = (
    BASE_DIR
    / "data"
    / "legal_intelligence"
    / "ingested"
    / "parliament_acts.json"
)


def get_published_parliament_acts() -> list[LegalLawListItem]:
    if not PARLIAMENT_ACTS_FILE.exists():
        return []

    try:
        with PARLIAMENT_ACTS_FILE.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

    except (
        OSError,
        json.JSONDecodeError,
    ):
        return []

    if not isinstance(data, list):
        return []

    results: list[LegalLawListItem] = []

    for document in data:
        metadata = (
            document.get("metadata")
            or {}
        )

        # Defensive validation.
        # Only verified Acts may be exposed publicly.
        if not (
            metadata.get("detail_verified")
            and metadata.get("pdf_extracted")
            and metadata.get("pdf_identity_valid")
        ):
            continue

        act_number = document.get(
            "act_number"
        )

        external_id = (
            document.get("external_id")
            or act_number
        )

        results.append(
            LegalLawListItem(
                id=str(
                    external_id
                    or document.get("title")
                ),
                title=document.get(
                    "title",
                    "Untitled Act",
                ),
                document_type=(
                    document.get(
                        "document_type"
                    )
                    or "act"
                ),
                act_number=act_number,
                published_date=document.get(
                    "published_date"
                ),
                official_url=(
                    document.get(
                        "download_url"
                    )
                    or document.get(
                        "detail_url"
                    )
                ),
                summary=document.get(
                    "summary"
                ),
                source_name=document.get(
                    "source_name",
                    "Parliament of Sri Lanka",
                ),
                external_id=external_id,
                is_published=True,
            )
        )

    results.sort(
        key=lambda item: (
            item.published_date or ""
        ),
        reverse=True,
    )

    return results