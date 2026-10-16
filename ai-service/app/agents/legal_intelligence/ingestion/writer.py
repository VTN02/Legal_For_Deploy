from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .models import DiscoveredLegalDocument


BASE_DIR = Path(__file__).resolve().parents[4]

OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "legal_intelligence"
    / "ingested"
)


def write_documents_to_json(
    documents: Iterable[DiscoveredLegalDocument],
    filename: str,
) -> Path:
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = OUTPUT_DIR / filename

    data = [
        document.model_dump()
        for document in documents
    ]

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return output_path