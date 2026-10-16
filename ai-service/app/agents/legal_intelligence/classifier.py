from .models import LegalQueryIntent


LAW_KEYWORDS = [
    "law",
    "act",
    "ordinance",
    "regulation",
    "regulations",
    "bill",
    "amendment",
    "section",
    "article",
    "statute",
    "gazette",
    "legislation",
]

CASE_KEYWORDS = [
    "case",
    "cases",
    "judgment",
    "judgments",
    "judgement",
    "judgements",
    "court",
    "supreme court",
    "court of appeal",
    "district court",
    "high court",
    "fundamental rights case",
    "fundamental rights cases",
    "fr case",
    "fr cases",
]

UPDATE_KEYWORDS = [
    "latest",
    "recent",
    "update",
    "updates",
    "development",
    "developments",
    "legal news",
    "recent changes",
    "latest changes",
]


EXPLICIT_MIXED_PHRASES = [
    "laws and cases",
    "law and cases",
    "laws and court cases",
    "law and court cases",
    "legislation and cases",
    "legislation and court cases",
    "acts and cases",
    "acts and court cases",
    "laws and judgments",
    "law and judgments",
    "legislation and judgments",
    "acts and judgments",
    "cases and laws",
    "court cases and laws",
    "cases and legislation",
    "court cases and legislation",
    "judgments and laws",
    "judgments and legislation",
]


def classify_query(
    query: str,
) -> LegalQueryIntent:
    text = (
        query
        .strip()
        .lower()
    )

    has_law = any(
        keyword in text
        for keyword in LAW_KEYWORDS
    )

    has_case = any(
        keyword in text
        for keyword in CASE_KEYWORDS
    )

    has_update = any(
        keyword in text
        for keyword in UPDATE_KEYWORDS
    )

    explicitly_mixed = any(
        phrase in text
        for phrase in EXPLICIT_MIXED_PHRASES
    )

    # Only classify as mixed when the user explicitly asks
    # for both legislation and court decisions.
    #
    # Example:
    # "Find laws and court cases about unfair dismissal."
    if explicitly_mixed:
        return LegalQueryIntent.MIXED

    # Court-related queries take priority over legislation
    # references such as Article 140, Section 83, an Act name,
    # or an Ordinance name.
    #
    # Examples:
    # "Court cases about Article 140"
    # "Judgments interpreting Section 83"
    # "Cases under the Bail Act"
    if has_case:
        return LegalQueryIntent.COURT_CASE

    # Legislation-related queries take priority over update
    # modifiers such as "recent" or "latest".
    if has_law:
        return LegalQueryIntent.LAW

    # General legal news / development queries.
    if has_update:
        return LegalQueryIntent.LEGAL_UPDATE

    return LegalQueryIntent.UNKNOWN