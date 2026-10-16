from typing import List, Optional, TypedDict

from .models import (
    Citation,
    LegalQueryIntent,
    LegalResearchTask,
    LegalSource,
)


class LegalIntelligenceState(TypedDict, total=False):
    # Original user input
    query: str

    # Query understanding
    intent: LegalQueryIntent
    category: Optional[str]

    # Research plan
    research_tasks: List[LegalResearchTask]

    # Retrieved evidence
    retrieved_sources: List[LegalSource]
    relevant_laws: List[LegalSource]
    relevant_cases: List[LegalSource]
    legal_updates: List[LegalSource]

    # Generated response
    answer: str
    citations: List[Citation]

    # Validation
    confidence: float
    validation_errors: List[str]
    requires_human_review: bool