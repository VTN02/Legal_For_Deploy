from typing import List

from .models import Citation, LegalSource


MIN_CONFIDENCE = 0.30


def validate_legal_response(
    sources: List[LegalSource],
    citations: List[Citation],
    answer: str,
) -> tuple[float, list[str], bool]:
    errors: list[str] = []

    if not sources:
        errors.append(
            "No relevant legal sources were retrieved."
        )

    if sources and not citations:
        errors.append(
            "Retrieved legal sources are missing citations."
        )

    source_references = {
        source.case_number
        or source.document_id
        or source.title
        for source in sources
    }

    citation_references = {
        citation.reference
        for citation in citations
        if citation.reference
    }

    missing_citations = (
        source_references - citation_references
    )

    if missing_citations:
        errors.append(
            "Some retrieved legal sources are not represented "
            "in the citations."
        )

    sample_cases = [
        source
        for source in sources
        if (
            source.source_type.value == "judgment"
            and (
                "sample" in source.title.lower()
                or (
                    source.case_number
                    and "sample" in source.case_number.lower()
                )
            )
        )
    ]

    if sample_cases:
        errors.append(
            "One or more court judgments are sample/test data "
            "and must not be treated as verified real cases."
        )

    if not answer.strip():
        errors.append(
            "The legal intelligence answer is empty."
        )

    if sources:
        confidence = max(
            source.relevance_score
            for source in sources
        )
    else:
        confidence = 0.0

    if confidence < MIN_CONFIDENCE:
        errors.append(
            "Retrieved evidence confidence is below the "
            "minimum threshold."
        )

    requires_human_review = (
        not sources
        or confidence < MIN_CONFIDENCE
        or bool(sample_cases)
    )

    return (
        confidence,
        errors,
        requires_human_review,
    )