from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class LegalQueryIntent(str, Enum):
    LAW = "law"
    COURT_CASE = "court_case"
    LEGAL_UPDATE = "legal_update"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class LegalSourceType(str, Enum):
    ACT = "act"
    BILL = "bill"
    AMENDMENT = "amendment"
    REGULATION = "regulation"
    GAZETTE = "gazette"
    JUDGMENT = "judgment"
    LEGAL_UPDATE = "legal_update"
    OTHER = "other"


# Internal source model used by the AI/retrieval pipeline.
# This model keeps the full extracted legal content.
class LegalSource(BaseModel):
    title: str
    source_type: LegalSourceType
    source_url: Optional[str] = None
    document_id: Optional[str] = None
    case_number: Optional[str] = None
    court: Optional[str] = None
    year: Optional[int] = None
    published_date: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    relevance_score: float = 0.0


# Public source model returned to frontend/mobile.
# Full legal document content is intentionally excluded
# to keep API responses small.
class LegalSourceResult(BaseModel):
    title: str
    source_type: LegalSourceType
    source_url: Optional[str] = None
    document_id: Optional[str] = None
    case_number: Optional[str] = None
    court: Optional[str] = None
    year: Optional[int] = None
    published_date: Optional[str] = None
    summary: Optional[str] = None
    relevance_score: float = 0.0


class LegalResearchTask(BaseModel):
    task_type: str
    query: str
    description: Optional[str] = None


class Citation(BaseModel):
    title: str
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    reference: Optional[str] = None


class LegalIntelligenceRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
    )


class LegalIntelligenceResponse(BaseModel):
    query: str
    intent: LegalQueryIntent
    answer: str

    laws: List[LegalSourceResult] = Field(
        default_factory=list
    )

    cases: List[LegalSourceResult] = Field(
        default_factory=list
    )

    updates: List[LegalSourceResult] = Field(
        default_factory=list
    )

    citations: List[Citation] = Field(
        default_factory=list
    )

    confidence: float = 0.0
    requires_human_review: bool = False

    validation_errors: List[str] = Field(
        default_factory=list
    )
class LegalIngestionResponse(BaseModel):
    discovered: int
    saved: int
    rejected: int
    output_file: str

    rejected_documents: List[dict] = Field(
        default_factory=list
    )

    database_saved: int = 0
    database_failed: int = 0

    database_errors: List[dict] = Field(
        default_factory=list
    )

class LegalLawListItem(BaseModel):
    id: str
    title: str
    document_type: str
    act_number: Optional[str] = None
    published_date: Optional[str] = None
    official_url: Optional[str] = None
    summary: Optional[str] = None
    source_name: str
    external_id: Optional[str] = None
    is_published: bool = True


class LegalCourtCaseListItem(BaseModel):
    id: str
    case_number: str
    title: str
    decision_type: str
    court: str
    decision_date: Optional[str] = None
    judge: Optional[str] = None
    keywords: Optional[str] = None
    legislation: Optional[str] = None
    source_name: str
    source_url: Optional[str] = None
    is_published: bool = True
