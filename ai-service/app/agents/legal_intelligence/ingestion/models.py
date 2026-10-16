from typing import Optional

from pydantic import BaseModel, Field


class DiscoveredLegalDocument(BaseModel):
    external_id: Optional[str] = None
    title: str
    document_type: str

    act_number: Optional[str] = None
    year: Optional[int] = None
    published_date: Optional[str] = None

    detail_url: Optional[str] = None
    download_url: Optional[str] = None

    source_name: str
    source_domain: str
    source_trust_level: str = "OFFICIAL"

    raw_text: Optional[str] = None
    summary: Optional[str] = None

    metadata: dict = Field(
        default_factory=dict
    )
class DiscoveredCourtDecision(BaseModel):
    external_id: Optional[str] = None

    title: str
    decision_type: str

    case_number: Optional[str] = None
    court: str = "Court of Appeal of Sri Lanka"

    decision_date: Optional[str] = None
    judge: Optional[str] = None

    keywords: Optional[str] = None
    legislation: Optional[str] = None

    page_url: Optional[str] = None
    download_url: Optional[str] = None

    source_name: str = "Court of Appeal of Sri Lanka"
    source_domain: str = "judgements.courtofappeal.lk"
    source_trust_level: str = "OFFICIAL"

    raw_text: Optional[str] = None
    summary: Optional[str] = None

    metadata: dict = Field(
        default_factory=dict
    )