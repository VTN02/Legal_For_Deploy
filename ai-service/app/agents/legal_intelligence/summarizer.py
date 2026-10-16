import ast
import logging
from typing import List

from app.services.gemini_service import get_gemini_service

from .models import LegalSource


logger = logging.getLogger(__name__)

MAX_CONTENT_CHARS_PER_SOURCE = 12000
MAX_SOURCES_FOR_AI = 5


LEGAL_INTELLIGENCE_SYSTEM_PROMPT = """
You are the Sri Lanka Legal Intelligence Agent.

Your task is to explain Sri Lankan legal information using ONLY the
retrieved legal evidence provided to you.

STRICT RULES:

1. Do not invent Acts, sections, case names, case numbers, judgments,
   dates, courts, regulations, or legal principles.

2. Do not rely on unsupported model knowledge when answering.

3. If the supplied evidence is insufficient, clearly state that the
   available verified information is insufficient.

4. Clearly distinguish:
   - legislation,
   - court judgments,
   - legal updates.

5. Never present sample/test court cases as genuine reported judgments.
   If a source is labelled "Sample", explicitly describe it as test data.

6. Do not provide a definitive lawyer-client legal opinion.

7. Explain the information clearly and professionally.

8. Preserve legal identifiers exactly as provided in the evidence.
   Do not rewrite, expand, shorten, or normalize case numbers,
   Act numbers, document references, dates, or court names.

9. Do not add a legal disclaimer at the end of the answer.
   The application displays its own disclaimer separately.

10. Do not create a separate sources list.
    The application will attach verified citations separately.
"""


def _truncate_content(
    content: str | None,
) -> str:
    if not content:
        return "N/A"

    content = content.strip()

    if len(content) <= MAX_CONTENT_CHARS_PER_SOURCE:
        return content

    return (
        content[:MAX_CONTENT_CHARS_PER_SOURCE]
        + "\n\n[Content truncated for AI processing.]"
    )


def _build_evidence(
    sources: List[LegalSource],
) -> str:
    evidence_blocks: list[str] = []

    selected_sources = sources[
        :MAX_SOURCES_FOR_AI
    ]

    for index, source in enumerate(
        selected_sources,
        start=1,
    ):
        evidence_blocks.append(
            "\n".join(
                [
                    f"[SOURCE {index}]",
                    f"Title: {source.title}",
                    f"Type: {source.source_type.value}",
                    (
                        "Document ID: "
                        f"{source.document_id or 'N/A'}"
                    ),
                    (
                        "Case Number: "
                        f"{source.case_number or 'N/A'}"
                    ),
                    (
                        "Court: "
                        f"{source.court or 'N/A'}"
                    ),
                    (
                        "Year: "
                        f"{source.year or 'N/A'}"
                    ),
                    (
                        "Published Date: "
                        f"{source.published_date or 'N/A'}"
                    ),
                    (
                        "Summary: "
                        f"{source.summary or 'N/A'}"
                    ),
                    (
                        "Content: "
                        f"{_truncate_content(source.content)}"
                    ),
                ]
            )
        )

    return "\n\n".join(
        evidence_blocks
    )


def _describe_source(
    source: LegalSource,
) -> str:
    details: list[str] = []

    if source.year:
        details.append(
            f"Year: {source.year}"
        )

    # For court decisions, show the case number only.
    # Do not expose the internal external/document ID.
    if source.case_number:
        details.append(
            f"Case number: {source.case_number}"
        )

    elif source.document_id:
        details.append(
            f"Reference: {source.document_id}"
        )

    if source.court:
        details.append(
            f"Court: {source.court}"
        )

    description = (
        f"**{source.title}**"
    )

    if details:
        description += (
            " ("
            + ", ".join(details)
            + ")"
        )

    if source.summary:
        description += (
            f"\n{source.summary.strip()}"
        )

    return description


def _fallback_summary(
    query: str,
    sources: List[LegalSource],
) -> str:
    if not sources:
        return (
            "I could not find sufficient verified legal "
            "information in the current knowledge base to "
            "answer this question."
        )

    primary_source = sources[0]

    answer_parts = [
        (
            "The most relevant verified material in the "
            "current legal knowledge base is:"
        ),
        _describe_source(
            primary_source
        ),
    ]

    if len(sources) > 1:
        answer_parts.append(
            "Additional potentially relevant material:"
        )

        for source in sources[1:]:
            answer_parts.append(
                f"- {_describe_source(source)}"
            )

    answer_parts.append(
        (
            "The AI summary service is currently unavailable, "
            "so this response is based only on the verified "
            "retrieval data and source summaries currently "
            "stored in the system."
        )
    )

    return "\n\n".join(
        answer_parts
    )


def _extract_gemini_text(
    response: str,
) -> str:
    response = response.strip()

    if not response:
        return ""

    if response.startswith("["):
        try:
            parsed = ast.literal_eval(
                response
            )

            if isinstance(
                parsed,
                list,
            ):
                text_parts: list[str] = []

                for item in parsed:
                    if isinstance(
                        item,
                        dict,
                    ):
                        text = item.get(
                            "text"
                        )

                        if text:
                            text_parts.append(
                                str(text)
                            )

                if text_parts:
                    return "\n".join(
                        text_parts
                    ).strip()

        except (
            ValueError,
            SyntaxError,
        ):
            pass

    return response


async def generate_legal_summary(
    query: str,
    sources: List[LegalSource],
) -> str:
    if not sources:
        return _fallback_summary(
            query=query,
            sources=sources,
        )

    evidence = _build_evidence(
        sources
    )

    prompt = f"""
User legal research question:

{query}

Retrieved legal evidence:

{evidence}

Using only the evidence above, answer the user's question.

Structure the answer where appropriate using:

- Relevant Law
- Relevant Court Cases
- Explanation
- Important Limitations

Do not mention categories for which no evidence was retrieved.
Do not invent missing information.
Clearly identify the most relevant source first.

Preserve every legal identifier exactly as supplied in the evidence.
For court cases, use the exact Case Number field.
Do not replace a case number with the Document ID.
"""

    try:
        gemini = get_gemini_service()

        response = await gemini.call(
            prompt=prompt,
            system_instruction=LEGAL_INTELLIGENCE_SYSTEM_PROMPT,
        )

        response = _extract_gemini_text(
            response
        )

        if not response:
            return _fallback_summary(
                query=query,
                sources=sources,
            )

        return response

    except Exception as exc:
        logger.warning(
            "Gemini legal summary unavailable: %s",
            exc,
        )

        return _fallback_summary(
            query=query,
            sources=sources,
        )