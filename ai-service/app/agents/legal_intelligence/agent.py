from typing import List

from .classifier import classify_query
from .models import (
    Citation,
    LegalIntelligenceResponse,
    LegalSource,
    LegalSourceResult,
)
from .planner import build_research_plan
from .retriever import execute_research_task
from .summarizer import generate_legal_summary
from .validator import validate_legal_response


def _to_public_source(
    source: LegalSource,
) -> LegalSourceResult:
    return LegalSourceResult(
        title=source.title,
        source_type=source.source_type,
        source_url=source.source_url,
        document_id=source.document_id,
        case_number=source.case_number,
        court=source.court,
        year=source.year,
        published_date=source.published_date,
        summary=source.summary,
        relevance_score=source.relevance_score,
    )


async def run_legal_intelligence_agent(
    query: str,
) -> LegalIntelligenceResponse:

    # 1. Understand the user's question
    intent = classify_query(query)

    # 2. Build research plan
    research_tasks = build_research_plan(
        query=query,
        intent=intent,
    )

    # 3. Execute retrieval
    retrieved_sources: List[LegalSource] = []

    for task in research_tasks:
        results = await execute_research_task(
            task
        )
        retrieved_sources.extend(results)

    # 4. Remove duplicate evidence
    unique_sources: dict[str, LegalSource] = {}

    for source in retrieved_sources:
        key = (
            source.document_id
            or source.case_number
            or source.title
        )

        existing = unique_sources.get(key)

        if (
            existing is None
            or source.relevance_score
            > existing.relevance_score
        ):
            unique_sources[key] = source

    sources = list(
        unique_sources.values()
    )

    # Highest relevance first
    sources.sort(
        key=lambda source: (
            source.relevance_score
        ),
        reverse=True,
    )

    # 5. Separate evidence categories
    laws = [
        source
        for source in sources
        if source.source_type.value
        in {
            "act",
            "bill",
            "amendment",
            "regulation",
            "gazette",
            "other",
        }
    ]

    cases = [
        source
        for source in sources
        if source.source_type.value
        == "judgment"
    ]

    updates = [
        source
        for source in sources
        if source.source_type.value
        == "legal_update"
    ]

    # 6. Generate grounded AI explanation
    # Full source content is still available
    # internally here.
    answer = await generate_legal_summary(
        query=query,
        sources=sources,
    )

    # 7. Build citations ourselves.
    # Gemini must not invent citations.
    citations = [
        Citation(
            title=source.title,
            source_url=source.source_url,
            source_type=(
                source.source_type.value
            ),
            reference=(
                source.case_number
                or source.document_id
                or source.title
            ),
        )
        for source in sources
    ]

    # 8. Validate retrieved evidence
    # and final response.
    (
        confidence,
        validation_errors,
        requires_human_review,
    ) = validate_legal_response(
        sources=sources,
        citations=citations,
        answer=answer,
    )

    # 9. Convert internal sources
    # to public API models.
    # This removes full content from
    # the API response.
    public_laws = [
        _to_public_source(source)
        for source in laws
    ]

    public_cases = [
        _to_public_source(source)
        for source in cases
    ]

    public_updates = [
        _to_public_source(source)
        for source in updates
    ]

    return LegalIntelligenceResponse(
        query=query,
        intent=intent,
        answer=answer,
        laws=public_laws,
        cases=public_cases,
        updates=public_updates,
        citations=citations,
        confidence=confidence,
        requires_human_review=(
            requires_human_review
        ),
        validation_errors=(
            validation_errors
        ),
    )