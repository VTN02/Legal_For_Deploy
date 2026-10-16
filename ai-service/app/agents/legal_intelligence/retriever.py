import json
import re
from pathlib import Path
from typing import List

from app.services.backend_client import (
    BackendClientError,
    get_backend_client,
)

from .models import (
    LegalResearchTask,
    LegalSource,
    LegalSourceType,
)




BASE_DIR = Path(__file__).resolve().parents[3]

DATA_DIR = (
    BASE_DIR
    / "data"
    / "legal_intelligence"
)

INGESTED_DIR = (
    DATA_DIR
    / "ingested"
)


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "what",
    "which",
    "who",
    "how",
    "why",
    "when",
    "where",
    "does",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "from",
    "into",
    "about",
    "show",
    "find",
    "related",
    "applies",
    "apply",
    "law",
    "laws",
    "legal",
    "sri",
    "lanka",
    "lankan",
    "amendment",
    "amended",
    "2026",
    "case",
    "cases",
    "court",
    "judgment",
    "judgments",
    "order",
    "orders",
    "recent",
    "latest",
}


QUERY_ALIASES = {
    "cybercrime": {
        "computer",
        "crime",
        "crimes",
        "cybercrime",
    },
    "cybercrimes": {
        "computer",
        "crime",
        "crimes",
        "cybercrime",
    },
    "employment": {
        "employment",
        "employee",
        "employees",
        "workmen",
        "labour",
    },
    "labor": {
        "labour",
        "employment",
    },
    "bail": {
        "bail",
        "exceptional",
        "circumstances",
    },
    "narcotics": {
        "narcotics",
        "drugs",
        "opium",
        "poisons",
        "trafficking",
        "possession",
    },
    "drug": {
        "drugs",
        "opium",
        "poisons",
        "narcotics",
    },
    "drugs": {
        "drug",
        "opium",
        "poisons",
        "narcotics",
    },
    "murder": {
        "murder",
        "penal",
        "homicide",
    },
    "writ": {
        "writ",
        "certiorari",
        "mandamus",
        "prohibition",
    },
}


# ============================================================
# JSON loading
# ============================================================

def _load_json_path(
    path: Path,
) -> list[dict]:
    if not path.exists():
        return []

    try:
        with path.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        if isinstance(data, list):
            return data

    except (
        json.JSONDecodeError,
        OSError,
    ):
        return []

    return []


def _load_json(
    filename: str,
) -> list[dict]:
    return _load_json_path(
        DATA_DIR / filename,
    )


def _load_ingested_json(
    filename: str,
) -> list[dict]:
    return _load_json_path(
        INGESTED_DIR / filename,
    )


# ============================================================
# Tokenization / ranking
# ============================================================

def _tokenize(
    text: str,
) -> set[str]:
    tokens = {
        token
        for token in re.findall(
            r"[a-zA-Z0-9]+",
            text.lower(),
        )
        if (
            len(token) > 2
            and token not in STOP_WORDS
        )
    }

    expanded_tokens = set(tokens)

    for token in tokens:
        aliases = QUERY_ALIASES.get(
            token,
        )

        if aliases:
            expanded_tokens.update(
                aliases
            )

    return expanded_tokens


def _calculate_relevance(
    query: str,
    document: dict,
) -> float:
    query_tokens = _tokenize(
        query,
    )

    if not query_tokens:
        return 0.0

    title_tokens = _tokenize(
        str(
            document.get(
                "title",
                "",
            )
        )
    )

    summary_tokens = _tokenize(
        str(
            document.get(
                "summary",
                "",
            )
            or ""
        )
    )

    content_text = (
        document.get("content")
        or document.get("raw_text")
        or ""
    )

    content_tokens = _tokenize(
        str(content_text)
    )

    metadata_tokens = _tokenize(
        " ".join(
            [
                str(
                    document.get(
                        "case_number",
                        "",
                    )
                ),
                str(
                    document.get(
                        "court",
                        "",
                    )
                ),
                str(
                    document.get(
                        "document_id",
                        "",
                    )
                ),
                str(
                    document.get(
                        "act_number",
                        "",
                    )
                ),
                str(
                    document.get(
                        "year",
                        "",
                    )
                ),
                str(
                    document.get(
                        "published_date",
                        "",
                    )
                ),
                str(
                    document.get(
                        "decision_type",
                        "",
                    )
                ),
                str(
                    document.get(
                        "judge",
                        "",
                    )
                ),
                str(
                    document.get(
                        "keywords",
                        "",
                    )
                ),
                str(
                    document.get(
                        "legislation",
                        "",
                    )
                ),
            ]
        )
    )

    score = 0.0

    for token in query_tokens:
        if token in title_tokens:
            score += 3.0

        elif token in summary_tokens:
            score += 2.5

        elif token in metadata_tokens:
            score += 2.0

        elif token in content_tokens:
            score += 1.0

    max_score = (
        len(query_tokens)
        * 3.0
    )

    return score / max_score


# ============================================================
# Parliament Act normalization
# ============================================================

def _normalize_ingested_act(
    document: dict,
) -> dict:
    metadata = (
        document.get("metadata")
        or {}
    )

    return {
        "title": document.get(
            "title",
            "Untitled Act",
        ),
        "source_type": "act",
        "source_url": (
            document.get(
                "download_url",
            )
            or document.get(
                "detail_url",
            )
        ),
        "document_id": (
            document.get(
                "external_id",
            )
            or document.get(
                "act_number",
            )
        ),
        "case_number": None,
        "court": None,
        "year": document.get(
            "year",
        ),
        "published_date": document.get(
            "published_date",
        ),
        "summary": document.get(
            "summary",
        ),
        "content": document.get(
            "raw_text",
        ),
        "metadata": metadata,
    }


def _is_valid_ingested_act(
    document: dict,
) -> bool:
    metadata = (
        document.get("metadata")
        or {}
    )

    return bool(
        metadata.get(
            "detail_verified"
        )
        and metadata.get(
            "pdf_extracted"
        )
        and metadata.get(
            "pdf_identity_valid"
        )
        and document.get(
            "raw_text"
        )
    )


# ============================================================
# Court of Appeal normalization
# ============================================================

def _build_court_summary(
    document: dict,
) -> str:
    parts: list[str] = []

    decision_type = (
        document.get(
            "decision_type"
        )
        or "judgment"
    )

    parts.append(
        f"Official Court of Appeal "
        f"{decision_type}."
    )

    judge = document.get(
        "judge"
    )

    if judge:
        parts.append(
            f"Judge: {judge}."
        )

    keywords = document.get(
        "keywords"
    )

    if keywords:
        parts.append(
            f"Keywords: {keywords}"
        )

    legislation = document.get(
        "legislation"
    )

    if legislation:
        parts.append(
            f"Legislation: {legislation}"
        )

    return " ".join(parts)


def _normalize_ingested_court_case(
    document: dict,
) -> dict:
    metadata = (
        document.get("metadata")
        or {}
    )

    decision_date = document.get(
        "decision_date"
    )

    year = None

    if (
        isinstance(
            decision_date,
            str,
        )
        and len(decision_date) >= 4
        and decision_date[:4].isdigit()
    ):
        year = int(
            decision_date[:4]
        )

    return {
        "title": document.get(
            "title",
            "Untitled Court Decision",
        ),

        # LegalSourceType currently has JUDGMENT,
        # but no separate ORDER enum.
        # Both official judgments and orders are
        # therefore represented as judgment sources.
        "source_type": "judgment",

        "source_url": (
            document.get(
                "download_url"
            )
            or document.get(
                "page_url"
            )
        ),

        "document_id": (
            document.get(
                "external_id"
            )
            or document.get(
                "case_number"
            )
        ),

        "case_number": document.get(
            "case_number"
        ),

        "court": document.get(
            "court",
            "Court of Appeal of Sri Lanka",
        ),

        "year": year,

        "published_date": (
            decision_date
        ),

        "summary": (
            _build_court_summary(
                document
            )
        ),

        "content": document.get(
            "raw_text"
        ),

        "decision_type": document.get(
            "decision_type"
        ),

        "judge": document.get(
            "judge"
        ),

        "keywords": document.get(
            "keywords"
        ),

        "legislation": document.get(
            "legislation"
        ),

        "metadata": metadata,
    }


def _is_valid_ingested_court_case(
    document: dict,
) -> bool:
    metadata = (
        document.get("metadata")
        or {}
    )

    return bool(
        metadata.get(
            "listing_verified"
        )
        and metadata.get(
            "pdf_extracted"
        )
        and metadata.get(
            "pdf_identity_valid"
        )
        and document.get(
            "raw_text"
        )
        and document.get(
            "case_number"
        )
    )


# ============================================================
# LegalSource conversion
# ============================================================

def _to_legal_source(
    document: dict,
    relevance_score: float,
) -> LegalSource:
    return LegalSource(
        title=document["title"],

        source_type=LegalSourceType(
            document["source_type"]
        ),

        source_url=document.get(
            "source_url"
        ),

        document_id=document.get(
            "document_id"
        ),

        case_number=document.get(
            "case_number"
        ),

        court=document.get(
            "court"
        ),

        year=document.get(
            "year"
        ),

        published_date=document.get(
            "published_date"
        ),

        summary=document.get(
            "summary"
        ),

        content=document.get(
            "content"
        ),

        relevance_score=(
            relevance_score
        ),
    )


# ============================================================
# Deduplication
# ============================================================

def _deduplicate_documents(
    documents: list[dict],
) -> list[dict]:
    deduplicated: dict[
        str,
        dict,
    ] = {}

    for document in documents:
        key = (
            document.get(
                "document_id"
            )
            or document.get(
                "case_number"
            )
            or document.get(
                "act_number"
            )
            or document.get(
                "title"
            )
        )

        if not key:
            continue

        normalized_key = str(
            key
        ).strip().lower()

        existing = (
            deduplicated.get(
                normalized_key
            )
        )

        if existing is None:
            deduplicated[
                normalized_key
            ] = document
            continue

        existing_content = (
            existing.get(
                "content"
            )
            or existing.get(
                "raw_text"
            )
            or ""
        )

        new_content = (
            document.get(
                "content"
            )
            or document.get(
                "raw_text"
            )
            or ""
        )

        # Prefer the record with more
        # verified legal text.
        if len(
            str(new_content)
        ) > len(
            str(existing_content)
        ):
            deduplicated[
                normalized_key
            ] = document

    return list(
        deduplicated.values()
    )

def _parse_backend_metadata(
    value,
) -> dict:
    if isinstance(value, dict):
        return value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)

            if isinstance(parsed, dict):
                return parsed

        except json.JSONDecodeError:
            pass

    return {}


def _normalize_backend_law(
    document: dict,
) -> dict:
    published_date = document.get(
        "publishedDate"
    )

    year = document.get("year")

    if year is None and published_date:
        try:
            year = int(
                str(published_date)[:4]
            )
        except (
            TypeError,
            ValueError,
        ):
            year = None

    document_type = (
        document.get("documentType")
        or "other"
    )

    document_type = str(
        document_type
    ).strip().lower()

    allowed_types = {
        "act",
        "bill",
        "amendment",
        "regulation",
        "gazette",
        "legal_update",
        "other",
    }

    if document_type not in allowed_types:
        document_type = "other"

    return {
        "title":
            document.get("title")
            or "Untitled legal document",

        "source_type":
            document_type,

        "source_url":
            document.get("officialUrl")
            or document.get("detailUrl"),

        "document_id":
            document.get("externalId")
            or (
                str(document.get("id"))
                if document.get("id")
                is not None
                else None
            ),

        "act_number":
            document.get("actNumber"),

        "case_number":
            None,

        "court":
            None,

        "year":
            year,

        "published_date":
            published_date,

        "summary":
            document.get("summary"),

        "content":
            document.get("rawText"),

        "metadata":
            _parse_backend_metadata(
                document.get("metadata")
            ),

        "source_name":
            document.get("sourceName"),

        "source_domain":
            document.get("sourceDomain"),

        "source_trust_level":
            document.get(
                "sourceTrustLevel"
            ),
    }


def _normalize_backend_case(
    document: dict,
) -> dict:
    decision_date = document.get(
        "decisionDate"
    )

    year = None

    if decision_date:
        try:
            year = int(
                str(decision_date)[:4]
            )
        except (
            TypeError,
            ValueError,
        ):
            year = None

    case_number = document.get(
        "caseNumber"
    )

    return {
        "title":
            document.get("title")
            or case_number
            or "Untitled court decision",

        "source_type":
            "judgment",

        "source_url":
            document.get("sourceUrl")
            or document.get("pageUrl"),

        "document_id":
            document.get("externalId")
            or case_number
            or (
                str(document.get("id"))
                if document.get("id")
                is not None
                else None
            ),

        "case_number":
            case_number,

        "court":
            document.get("court")
            or (
                "Court of Appeal "
                "of Sri Lanka"
            ),

        "year":
            year,

        "published_date":
            decision_date,

        "summary":
            document.get("summary"),

        "content":
            document.get("rawText"),

        "decision_type":
            document.get(
                "decisionType"
            ),

        "judge":
            document.get("judge"),

        "keywords":
            document.get("keywords"),

        "legislation":
            document.get("legislation"),

        "metadata":
            _parse_backend_metadata(
                document.get("metadata")
            ),

        "source_name":
            document.get("sourceName"),

        "source_domain":
            document.get("sourceDomain"),

        "source_trust_level":
            document.get(
                "sourceTrustLevel"
            ),
    }
# ============================================================
# Dataset loaders
# ============================================================

async def _load_law_documents(
) -> list[dict]:
    backend = get_backend_client()

    try:
        backend_documents = await (
            backend
            .get_legal_intelligence_documents()
        )

        normalized_backend = []

        for document in backend_documents:
            normalized = (
                _normalize_backend_law(
                    document
                )
            )

            if (
                normalized.get("title")
                and normalized.get(
                    "document_id"
                )
            ):
                normalized_backend.append(
                    normalized
                )

        if normalized_backend:
            return _deduplicate_documents(
                normalized_backend
            )

    except BackendClientError:
        pass

    except Exception:
        pass

    # JSON fallback
    manual_documents = _load_json(
        "laws.json"
    )

    ingested_documents = (
        _load_ingested_json(
            "parliament_acts.json"
        )
    )

    normalized_ingested = []

    for document in ingested_documents:
        if not _is_valid_ingested_act(
            document
        ):
            continue

        normalized_ingested.append(
            _normalize_ingested_act(
                document
            )
        )

    combined = (
        manual_documents
        + normalized_ingested
    )

    return _deduplicate_documents(
        combined
    )


async def _load_case_documents(
) -> list[dict]:
    backend = get_backend_client()

    try:
        backend_documents = await (
            backend
            .get_legal_intelligence_court_cases()
        )

        normalized_backend = []

        for document in backend_documents:
            normalized = (
                _normalize_backend_case(
                    document
                )
            )

            if (
                normalized.get(
                    "case_number"
                )
                and normalized.get(
                    "content"
                )
            ):
                normalized_backend.append(
                    normalized
                )

        if normalized_backend:
            return _deduplicate_documents(
                normalized_backend
            )

    except BackendClientError:
        pass

    except Exception:
        pass

    # JSON fallback
    ingested_documents = (
        _load_ingested_json(
            "court_of_appeal_cases.json"
        )
    )

    normalized_ingested = []

    for document in ingested_documents:
        if not (
            _is_valid_ingested_court_case(
                document
            )
        ):
            continue

        normalized_ingested.append(
            _normalize_ingested_court_case(
                document
            )
        )

    if normalized_ingested:
        return _deduplicate_documents(
            normalized_ingested
        )

    # Development sample fallback only
    return _deduplicate_documents(
        _load_json(
            "cases.json"
        )
    )




# ============================================================
# Searching
# ============================================================




def _search_documents(
    query: str,
    documents: list[dict],
    limit: int = 5,
    threshold: float = 0.20,
) -> List[LegalSource]:
    ranked_results: List[
        LegalSource
    ] = []

    for document in documents:
        score = (
            _calculate_relevance(
                query,
                document,
            )
        )

        if score >= threshold:
            ranked_results.append(
                _to_legal_source(
                    document,
                    score,
                )
            )

    ranked_results.sort(
        key=lambda source: (
            source.relevance_score
        ),
        reverse=True,
    )

    return ranked_results[
        :limit
    ]









def _search_dataset(
    query: str,
    filename: str,
    limit: int = 5,
) -> List[LegalSource]:
    documents = _load_json(
        filename
    )

    return _search_documents(
        query=query,
        documents=documents,
        limit=limit,
    )






async def _search_laws(
    query: str,
    limit: int = 5,
) -> List[LegalSource]:
    documents = await (
        _load_law_documents()
    )

    return _search_documents(
        query=query,
        documents=documents,
        limit=limit,
        threshold=0.40,
    )


async def _search_cases(
    query: str,
    limit: int = 5,
) -> List[LegalSource]:
    documents = await (
        _load_case_documents()
    )

    return _search_documents(
        query=query,
        documents=documents,
        limit=limit,
        threshold=0.35,
    )






# ============================================================
# Research task execution
# ============================================================
async def execute_research_task(
    task: LegalResearchTask,
) -> List[LegalSource]:

    if (
        task.task_type
        == "law_search"
    ):
        return await _search_laws(
            query=task.query,
        )

    if (
        task.task_type
        == "case_search"
    ):
        return await _search_cases(
            query=task.query,
        )

    if (
        task.task_type
        == "legal_update_search"
    ):
        return _search_dataset(
            query=task.query,
            filename="updates.json",
        )

    return []