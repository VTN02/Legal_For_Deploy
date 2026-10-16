from typing import List

from .models import LegalQueryIntent, LegalResearchTask


def build_research_plan(
    query: str,
    intent: LegalQueryIntent,
) -> List[LegalResearchTask]:
    tasks: List[LegalResearchTask] = []

    if intent == LegalQueryIntent.LAW:
        tasks.append(
            LegalResearchTask(
                task_type="law_search",
                query=query,
                description="Search Sri Lankan laws, Acts, regulations, ordinances, and related legislation.",
            )
        )

    elif intent == LegalQueryIntent.COURT_CASE:
        tasks.append(
            LegalResearchTask(
                task_type="case_search",
                query=query,
                description="Search Sri Lankan court judgments and relevant case law.",
            )
        )

    elif intent == LegalQueryIntent.LEGAL_UPDATE:
        tasks.append(
            LegalResearchTask(
                task_type="legal_update_search",
                query=query,
                description="Search recent Sri Lankan legal developments, amendments, bills, and legal updates.",
            )
        )

    elif intent == LegalQueryIntent.MIXED:
        tasks.append(
            LegalResearchTask(
                task_type="law_search",
                query=query,
                description="Search relevant Sri Lankan laws and legislation.",
            )
        )

        tasks.append(
            LegalResearchTask(
                task_type="case_search",
                query=query,
                description="Search relevant Sri Lankan court judgments and case law.",
            )
        )

    else:
        tasks.extend(
            [
                LegalResearchTask(
                    task_type="law_search",
                    query=query,
                    description="Search potentially relevant Sri Lankan laws.",
                ),
                LegalResearchTask(
                    task_type="case_search",
                    query=query,
                    description="Search potentially relevant Sri Lankan court cases.",
                ),
                LegalResearchTask(
                    task_type="legal_update_search",
                    query=query,
                    description="Search potentially relevant Sri Lankan legal updates.",
                ),
            ]
        )

    return tasks