from __future__ import annotations

import json
from pathlib import Path

from app.services.backend_client import (
    BackendClientError,
    get_backend_client,
)

from .court_of_appeal import (
    discover_latest_court_decisions,
)
from .court_pdf_extractor import (
    extract_court_pdf_text,
)
from .models import (
    DiscoveredCourtDecision,
)
from .writer import (
    write_documents_to_json,
)


BASE_DIR = Path(
    __file__
).resolve().parents[4]

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "legal_intelligence"
    / "ingested"
    / "court_of_appeal_cases.json"
)


def _decision_key(
    document: DiscoveredCourtDecision,
) -> str:
    return (
        f"{document.decision_type}|"
        f"{document.case_number}|"
        f"{document.decision_date}"
    ).lower().strip()


def _load_existing_documents(
) -> list[DiscoveredCourtDecision]:
    if not OUTPUT_FILE.exists():
        return []

    try:
        with OUTPUT_FILE.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        if not isinstance(data, list):
            return []

        documents: list[
            DiscoveredCourtDecision
        ] = []

        for item in data:
            try:
                documents.append(
                    DiscoveredCourtDecision(
                        **item
                    )
                )
            except Exception:
                continue

        return documents

    except (
        OSError,
        json.JSONDecodeError,
    ):
        return []


def _build_external_id(
    document: DiscoveredCourtDecision,
) -> str:
    if document.external_id:
        return document.external_id

    return (
        f"court-of-appeal:"
        f"{document.decision_type or 'unknown'}:"
        f"{document.case_number or 'unknown'}:"
        f"{document.decision_date or 'unknown'}"
    )


def _to_backend_court_case(
    document: DiscoveredCourtDecision,
) -> dict:
    return {
        "externalId":
            _build_external_id(document),

        "caseNumber":
            document.case_number or "",

        "title":
            document.title,

        "decisionType":
            document.decision_type,

        "court":
            document.court,

        "decisionDate":
            document.decision_date,

        "judge":
            document.judge,

        "keywords":
            document.keywords,

        "legislation":
            document.legislation,

        "pageUrl":
            document.page_url,

        "sourceUrl":
            document.download_url,

        "sourceName":
            document.source_name,

        "sourceDomain":
            document.source_domain,

        "sourceTrustLevel":
            document.source_trust_level,

        "rawText":
            document.raw_text,

        "summary":
            document.summary,

        "metadata":
            json.dumps(
                document.metadata or {},
                ensure_ascii=False,
            ),

        "isVerified":
            True,

        "isPublished":
            True,
    }


async def ingest_court_of_appeal() -> dict:
    (
        discovered_documents,
        discovery_metadata,
    ) = await discover_latest_court_decisions()

    valid_new_documents: list[
        DiscoveredCourtDecision
    ] = []

    rejected_documents: list[dict] = []

    for document in discovered_documents:
        try:
            document = await extract_court_pdf_text(
                document
            )

            metadata = document.metadata or {}

            is_valid = bool(
                metadata.get("listing_verified")
                and metadata.get("pdf_extracted")
                and metadata.get(
                    "pdf_identity_valid"
                )
                and document.raw_text
                and document.case_number
            )

            if is_valid:
                valid_new_documents.append(
                    document
                )
            else:
                rejected_documents.append(
                    {
                        "title":
                            document.title,
                        "case_number":
                            document.case_number,
                        "decision_type":
                            document.decision_type,
                        "reason":
                            metadata.get(
                                "pdf_error",
                                "Document failed validation.",
                            ),
                    }
                )

        except Exception as error:
            rejected_documents.append(
                {
                    "title":
                        document.title,
                    "case_number":
                        document.case_number,
                    "decision_type":
                        document.decision_type,
                    "reason":
                        str(error),
                }
            )

    existing_documents = (
        _load_existing_documents()
    )

    merged: dict[
        str,
        DiscoveredCourtDecision,
    ] = {}

    for document in existing_documents:
        metadata = document.metadata or {}

        if not (
            metadata.get("listing_verified")
            and metadata.get("pdf_extracted")
            and metadata.get(
                "pdf_identity_valid"
            )
            and document.raw_text
            and document.case_number
        ):
            continue

        merged[
            _decision_key(document)
        ] = document

    for document in valid_new_documents:
        merged[
            _decision_key(document)
        ] = document

    merged_documents = list(
        merged.values()
    )

    merged_documents.sort(
        key=lambda document: (
            document.decision_date or ""
        ),
        reverse=True,
    )

    output_path = write_documents_to_json(
        documents=merged_documents,
        filename="court_of_appeal_cases.json",
    )

    backend = get_backend_client()

    database_saved = 0
    database_failed: list[dict] = []

    for document in merged_documents:
        try:
            payload = _to_backend_court_case(
                document
            )

            await (
                backend
                .upsert_legal_intelligence_court_case(
                    payload
                )
            )

            database_saved += 1

        except BackendClientError as error:
            database_failed.append(
                {
                    "title":
                        document.title,
                    "case_number":
                        document.case_number,
                    "reason":
                        str(error),
                }
            )

        except Exception as error:
            database_failed.append(
                {
                    "title":
                        document.title,
                    "case_number":
                        document.case_number,
                    "reason":
                        str(error),
                }
            )

    ingestion_status = (
        "COMPLETED"
        if not database_failed
        else "PARTIAL"
    )

    try:
        await (
            backend
            .create_legal_intelligence_ingestion_run(
                {
                    "sourceType":
                        "COURT_OF_APPEAL",

                    "sourceName":
                        "Court of Appeal of Sri Lanka",

                    "discoveredCount":
                        len(
                            discovered_documents
                        ),

                    "savedCount":
                        database_saved,

                    "rejectedCount":
                        len(
                            rejected_documents
                        ),

                    "status":
                        ingestion_status,

                    "errorMessage":
                        (
                            None
                            if not database_failed
                            else (
                                f"{len(database_failed)} "
                                "verified court decision(s) "
                                "could not be stored."
                            )
                        ),

                    "metadata":
                        json.dumps(
                            {
                                "json_fallback_file":
                                    str(output_path),

                                "total_verified":
                                    len(
                                        merged_documents
                                    ),

                                "database_saved":
                                    database_saved,

                                "database_failed":
                                    len(
                                        database_failed
                                    ),

                                "judgment_page":
                                    discovery_metadata.get(
                                        "judgment_page"
                                    ),

                                "order_page":
                                    discovery_metadata.get(
                                        "order_page"
                                    ),
                            },
                            ensure_ascii=False,
                        ),
                }
            )
        )

    except Exception:
        pass

    return {
        "discovered":
            len(
                discovered_documents
            ),

        "saved":
            len(
                valid_new_documents
            ),

        "rejected":
            len(
                rejected_documents
            ),

        "output_file":
            str(
                output_path
            ),

        "rejected_documents":
            rejected_documents,

        "total_stored":
            len(
                merged_documents
            ),

        "database_saved":
            database_saved,

        "database_failed":
            len(
                database_failed
            ),

        "database_errors":
            database_failed,

        "judgment_page":
            discovery_metadata.get(
                "judgment_page"
            ),

        "judgments_found":
            discovery_metadata.get(
                "judgments_found",
                0,
            ),

        "order_page":
            discovery_metadata.get(
                "order_page"
            ),

        "orders_found":
            discovery_metadata.get(
                "orders_found",
                0,
            ),
    }