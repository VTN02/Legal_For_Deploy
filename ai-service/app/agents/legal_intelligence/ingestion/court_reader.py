from __future__ import annotations

import json
from pathlib import Path

from app.agents.legal_intelligence.models import (
    LegalCourtCaseListItem,
)


BASE_DIR = Path(__file__).resolve().parents[4]

COURT_CASES_FILE = (
    BASE_DIR
    / "data"
    / "legal_intelligence"
    / "ingested"
    / "court_of_appeal_cases.json"
)


def get_published_court_cases() -> list[LegalCourtCaseListItem]:
    if not COURT_CASES_FILE.exists():
        return []

    try:
        with COURT_CASES_FILE.open(
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

    results: list[LegalCourtCaseListItem] = []

    for document in data:
        metadata = document.get("metadata") or {}

        if not (
            metadata.get("listing_verified")
            and metadata.get("pdf_extracted")
            and metadata.get("pdf_identity_valid")
        ):
            continue

        case_number = (
            document.get("case_number")
            or document.get("external_id")
        )

        if not case_number:
            continue

        results.append(
            LegalCourtCaseListItem(
                id=str(
                    document.get("external_id")
                    or case_number
                ),
                case_number=case_number,
                title=document.get(
                    "title",
                    "Untitled case",
                ),
                decision_type=document.get(
                    "decision_type",
                    "judgment",
                ),
                court=document.get(
                    "court",
                    "Court of Appeal of Sri Lanka",
                ),
                decision_date=document.get(
                    "decision_date"
                ),
                judge=document.get(
                    "judge"
                ),
                keywords=document.get(
                    "keywords"
                ),
                legislation=document.get(
                    "legislation"
                ),
                source_name=document.get(
                    "source_name",
                    "Court of Appeal of Sri Lanka",
                ),
                source_url=(
                    document.get("download_url")
                    or document.get("page_url")
                ),
                is_published=True,
            )
        )

    results.sort(
        key=lambda item: (
            item.decision_date or ""
        ),
        reverse=True,
    )

    return results