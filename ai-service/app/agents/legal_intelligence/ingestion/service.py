from __future__ import annotations

import json

from app.services.backend_client import (
    BackendClientError,
    get_backend_client,
)

from .parliament_acts import discover_parliament_acts
from .parliament_act_details import enrich_parliament_act
from .pdf_extractor import extract_pdf_text
from .writer import write_documents_to_json


def _build_external_id(document) -> str:
    if document.external_id:
        return document.external_id

    act_number = (
        document.act_number
        or "unknown"
    ).strip()

    year = (
        str(document.year)
        if document.year is not None
        else "unknown"
    )

    return (
        f"parliament-act:"
        f"{year}:"
        f"{act_number}"
    )


def _to_backend_document(
    document,
) -> dict:
    return {
        "externalId": _build_external_id(
            document
        ),
        "title": document.title,
        "documentType":
            document.document_type,
        "actNumber":
            document.act_number,
        "year":
            document.year,
        "publishedDate":
            document.published_date,
        "officialUrl":
            document.download_url,
        "detailUrl":
            document.detail_url,
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
        "isVerified": True,
        "isPublished": True,
    }


async def ingest_parliament_acts() -> dict:
    discovered_documents = (
        await discover_parliament_acts()
    )

    valid_documents = []
    rejected_documents = []

    for document in discovered_documents:
        try:
            document = (
                await enrich_parliament_act(
                    document
                )
            )

            document = (
                await extract_pdf_text(
                    document
                )
            )

            metadata = (
                document.metadata
                or {}
            )

            is_valid = bool(
                metadata.get(
                    "detail_verified"
                )
                and metadata.get(
                    "pdf_extracted"
                )
                and metadata.get(
                    "pdf_identity_valid"
                )
                and document.raw_text
            )

            if is_valid:
                valid_documents.append(
                    document
                )
            else:
                rejected_documents.append(
                    {
                        "title":
                            document.title,
                        "act_number":
                            document.act_number,
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
                    "act_number":
                        document.act_number,
                    "reason":
                        str(error),
                }
            )

    output_path = (
        write_documents_to_json(
            documents=valid_documents,
            filename="parliament_acts.json",
        )
    )

    backend = get_backend_client()

    database_saved = 0
    database_failed = []

    for document in valid_documents:
        try:
            payload = (
                _to_backend_document(
                    document
                )
            )

            await (
                backend
                .upsert_legal_intelligence_document(
                    payload
                )
            )

            database_saved += 1

        except BackendClientError as error:
            database_failed.append(
                {
                    "title":
                        document.title,
                    "act_number":
                        document.act_number,
                    "reason":
                        str(error),
                }
            )

        except Exception as error:
            database_failed.append(
                {
                    "title":
                        document.title,
                    "act_number":
                        document.act_number,
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
                        "PARLIAMENT_ACTS",
                    "sourceName":
                        "Parliament of Sri Lanka",
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
                                "verified document(s) "
                                "could not be stored "
                                "in PostgreSQL."
                            )
                        ),
                    "metadata":
                        json.dumps(
                            {
                                "json_fallback_file":
                                    str(
                                        output_path
                                    ),
                                "verified_documents":
                                    len(
                                        valid_documents
                                    ),
                                "database_saved":
                                    database_saved,
                                "database_failed":
                                    len(
                                        database_failed
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
                valid_documents
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
        "database_saved":
            database_saved,
        "database_failed":
            len(
                database_failed
            ),
        "database_errors":
            database_failed,
    }