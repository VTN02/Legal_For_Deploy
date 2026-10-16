import os

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
)

from app.agents.legal_intelligence.agent import (
    run_legal_intelligence_agent,
)
from app.agents.legal_intelligence.ingestion.court_service import (
    ingest_court_of_appeal,
)
from app.agents.legal_intelligence.ingestion.service import (
    ingest_parliament_acts,
)
from app.agents.legal_intelligence.models import (
    LegalCourtCaseListItem,
    LegalIngestionResponse,
    LegalIntelligenceRequest,
    LegalIntelligenceResponse,
    LegalLawListItem,
)
from app.services.backend_client import (
    get_backend_client,
)


router = APIRouter(
    prefix="/api/legal-intelligence",
    tags=["Legal Intelligence"],
)


# ============================================================
# Public laws endpoint
# ============================================================

@router.get(
    "/laws",
    response_model=list[LegalLawListItem],
)
async def get_legal_intelligence_laws(
) -> list[LegalLawListItem]:

    backend = get_backend_client()

    try:
        documents = await (
            backend
            .get_legal_intelligence_documents()
        )

        results: list[
            LegalLawListItem
        ] = []

        for document in documents:
            results.append(
                LegalLawListItem(
                    id=str(
                        document.get("id")
                    ),
                    title=(
                        document.get("title")
                        or "Untitled legal document"
                    ),
                    document_type=(
                        document.get(
                            "documentType"
                        )
                        or "other"
                    ),
                    act_number=document.get(
                        "actNumber"
                    ),
                    published_date=(
                        document.get(
                            "publishedDate"
                        )
                    ),
                    official_url=(
                        document.get(
                            "officialUrl"
                        )
                        or document.get(
                            "detailUrl"
                        )
                    ),
                    summary=document.get(
                        "summary"
                    ),
                    source_name=(
                        document.get(
                            "sourceName"
                        )
                        or "Official Source"
                    ),
                    external_id=(
                        document.get(
                            "externalId"
                        )
                    ),
                    is_published=bool(
                        document.get(
                            "isPublished",
                            True,
                        )
                    ),
                )
            )

        return results

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Legal laws data is currently "
                "unavailable."
            ),
        ) from exc


# ============================================================
# Public court cases endpoint
# ============================================================

@router.get(
    "/cases",
    response_model=list[LegalCourtCaseListItem],
)
async def get_legal_intelligence_cases(
) -> list[LegalCourtCaseListItem]:

    backend = get_backend_client()

    try:
        cases = await (
            backend
            .get_legal_intelligence_court_cases()
        )

        results: list[
            LegalCourtCaseListItem
        ] = []

        for court_case in cases:
            results.append(
                LegalCourtCaseListItem(
                    id=str(
                        court_case.get("id")
                    ),
                    case_number=(
                        court_case.get(
                            "caseNumber"
                        )
                        or ""
                    ),
                    title=(
                        court_case.get("title")
                        or "Untitled court case"
                    ),
                    decision_type=(
                        court_case.get(
                            "decisionType"
                        )
                        or "judgment"
                    ),
                    court=(
                        court_case.get("court")
                        or (
                            "Court of Appeal "
                            "of Sri Lanka"
                        )
                    ),
                    decision_date=(
                        court_case.get(
                            "decisionDate"
                        )
                    ),
                    judge=court_case.get(
                        "judge"
                    ),
                    keywords=court_case.get(
                        "keywords"
                    ),
                    legislation=(
                        court_case.get(
                            "legislation"
                        )
                    ),
                    source_name=(
                        court_case.get(
                            "sourceName"
                        )
                        or (
                            "Court of Appeal "
                            "of Sri Lanka"
                        )
                    ),
                    source_url=(
                        court_case.get(
                            "sourceUrl"
                        )
                        or court_case.get(
                            "pageUrl"
                        )
                    ),
                    is_published=bool(
                        court_case.get(
                            "isPublished",
                            True,
                        )
                    ),
                )
            )

        return results

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Court cases data is currently "
                "unavailable."
            ),
        ) from exc


# ============================================================
# Legal Intelligence Agent
# ============================================================

@router.post(
    "/ask",
    response_model=LegalIntelligenceResponse,
)
async def ask_legal_intelligence(
    request: LegalIntelligenceRequest,
) -> LegalIntelligenceResponse:

    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail=(
                "Legal research query "
                "is required."
            ),
        )

    try:
        return await (
            run_legal_intelligence_agent(
                query,
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Legal Intelligence Agent "
                "could not process "
                "the request."
            ),
        ) from exc


# ============================================================
# Internal Parliament ingestion endpoint
# ============================================================

@router.post(
    "/ingest/parliament-acts",
    response_model=LegalIngestionResponse,
)
async def ingest_parliament_acts_endpoint(
    x_internal_admin_key: str | None = Header(
        default=None,
    ),
) -> LegalIngestionResponse:

    expected_key = os.getenv(
        "LEGAL_INGESTION_ADMIN_KEY",
    )

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Legal ingestion security key "
                "is not configured."
            ),
        )

    if x_internal_admin_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )

    try:
        result = await (
            ingest_parliament_acts()
        )

        return LegalIngestionResponse(
            **result,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Parliament Acts ingestion "
                "failed."
            ),
        ) from exc


# ============================================================
# Internal Court of Appeal ingestion endpoint
# ============================================================

@router.post(
    "/ingest/court-of-appeal",
    response_model=LegalIngestionResponse,
)
async def ingest_court_of_appeal_endpoint(
    x_internal_admin_key: str | None = Header(
        default=None,
    ),
) -> LegalIngestionResponse:

    expected_key = os.getenv(
        "LEGAL_INGESTION_ADMIN_KEY",
    )

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Legal ingestion security key "
                "is not configured."
            ),
        )

    if x_internal_admin_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )

    try:
        result = await (
            ingest_court_of_appeal()
        )

        return LegalIngestionResponse(
            **result,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Court of Appeal ingestion "
                "failed."
            ),
        ) from exc