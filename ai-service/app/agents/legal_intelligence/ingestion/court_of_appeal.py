from __future__ import annotations

import calendar
from datetime import datetime
from typing import List
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .models import DiscoveredCourtDecision


COURT_BASE_URL = "https://judgements.courtofappeal.lk"
COURT_HOME_URL = f"{COURT_BASE_URL}/"


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/155.0 Safari/537.36"
    )
}


async def fetch_court_page(
    page_url: str,
) -> str:
    async with httpx.AsyncClient(
        headers=HEADERS,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        response = await client.get(
            page_url
        )

        response.raise_for_status()

        return response.text


# ============================================================
# Archive discovery
# ============================================================

def _month_number(
    value: str,
) -> int | None:
    value = value.strip().lower()

    for month_number in range(
        1,
        13,
    ):
        month_name = calendar.month_name[
            month_number
        ].lower()

        month_abbr = calendar.month_abbr[
            month_number
        ].lower()

        if value in {
            month_name,
            month_abbr,
            str(month_number),
        }:
            return month_number

    return None


def _find_archive_section(
    soup: BeautifulSoup,
    section_name: str,
):
    """
    Locate the navigation <li> containing either
    the Judgments or Orders archive tree.
    """

    target = section_name.strip().lower()

    for anchor in soup.find_all(
        "a"
    ):
        text = anchor.get_text(
            " ",
            strip=True,
        ).lower()

        if text != target:
            continue

        parent = anchor.find_parent(
            "li"
        )

        if parent is not None:
            return parent

    return None


def _extract_year_month_links(
    section,
    year: int,
) -> list[tuple[int, str]]:
    """
    Extract month archive links for a particular year
    from the Judgments or Orders navigation tree.
    """

    if section is None:
        return []

    year_text = str(year)

    year_container = None

    for element in section.find_all(
        ["a", "span", "li"]
    ):
        text = element.get_text(
            " ",
            strip=True,
        )

        if text != year_text:
            continue

        if element.name == "li":
            year_container = element
        else:
            year_container = (
                element.find_parent("li")
            )

        if year_container is not None:
            break

    if year_container is None:
        return []

    results: list[
        tuple[int, str]
    ] = []

    seen: set[str] = set()

    for anchor in year_container.find_all(
        "a",
        href=True,
    ):
        text = anchor.get_text(
            " ",
            strip=True,
        )

        month = _month_number(
            text
        )

        if month is None:
            continue

        href = anchor.get(
            "href",
            "",
        ).strip()

        if not href:
            continue

        url = urljoin(
            COURT_BASE_URL,
            href,
        )

        if url in seen:
            continue

        seen.add(url)

        results.append(
            (
                month,
                url,
            )
        )

    return results


async def discover_archive_links(
) -> dict[str, list[tuple[int, str]]]:
    """
    Discover current-year Judgment and Order
    archive links from the Court of Appeal site.

    The site contains duplicated/nested navigation,
    so links are collected by traversing the full
    page rather than relying on one specific <li>.
    """

    html = await fetch_court_page(
        COURT_HOME_URL
    )

    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    now = datetime.now()

    current_year = str(
        now.year
    )

    results: dict[
        str,
        list[tuple[int, str]],
    ] = {
        "judgment": [],
        "order": [],
    }

    seen: dict[
        str,
        set[str],
    ] = {
        "judgment": set(),
        "order": set(),
    }

    current_section: str | None = None
    current_year_seen = False

    for anchor in soup.find_all(
        "a",
        href=True,
    ):
        text = anchor.get_text(
            " ",
            strip=True,
        )

        text_lower = (
            text.lower()
        )

        if text_lower == "judgments":
            current_section = "judgment"
            current_year_seen = False
            continue

        if text_lower == "orders":
            current_section = "order"
            current_year_seen = False
            continue

        if current_section is None:
            continue

        if text == current_year:
            current_year_seen = True
            continue

        if (
            text.isdigit()
            and len(text) == 4
            and text != current_year
        ):
            current_year_seen = False
            continue

        if not current_year_seen:
            continue

        month = _month_number(
            text
        )

        if month is None:
            continue

        if month > now.month:
            continue

        href = anchor.get(
            "href",
            "",
        ).strip()

        if not href:
            continue

        url = urljoin(
            COURT_BASE_URL,
            href,
        )

        if url in seen[
            current_section
        ]:
            continue

        seen[
            current_section
        ].add(url)

        results[
            current_section
        ].append(
            (
                month,
                url,
            )
        )

    results["judgment"].sort(
        key=lambda item: item[0],
        reverse=True,
    )

    results["order"].sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return results






# ============================================================
# Decision parser
# ============================================================

def parse_court_decisions(
    html: str,
    page_url: str,
    decision_type: str,
) -> List[DiscoveredCourtDecision]:
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    documents: list[
        DiscoveredCourtDecision
    ] = []

    seen: set[str] = set()

    tables = soup.find_all(
        "table"
    )

    for table in tables:
        rows = table.find_all(
            "tr"
        )

        for row in rows[1:]:
            cells = row.find_all(
                ["td", "th"]
            )

            if len(cells) < 3:
                continue

            values = [
                cell.get_text(
                    " ",
                    strip=True,
                )
                for cell in cells
            ]

            decision_date = (
                values[0]
                if len(values) > 0
                else None
            )

            case_number = (
                values[1]
                if len(values) > 1
                else None
            )

            parties = (
                values[2]
                if len(values) > 2
                else "Untitled case"
            )

            judge = (
                values[3]
                if len(values) > 3
                else None
            )

            keywords = (
                values[4]
                if len(values) > 4
                else None
            )

            legislation = (
                values[5]
                if len(values) > 5
                else None
            )

            if not case_number:
                continue

            dedupe_key = (
                f"{decision_type}:"
                f"{case_number}:"
                f"{decision_date}"
            ).lower()

            if dedupe_key in seen:
                continue

            seen.add(
                dedupe_key
            )

            download_url = None

            links = row.find_all(
                "a",
                href=True,
            )

            for link in links:
                href = link.get(
                    "href",
                    "",
                ).strip()

                if not href:
                    continue

                href_lower = (
                    href.lower()
                )

                if (
                    ".pdf" in href_lower
                    or "download" in href_lower
                    or "melsta_doc_download"
                    in href_lower
                ):
                    download_url = urljoin(
                        COURT_BASE_URL,
                        href,
                    )
                    break

            documents.append(
                DiscoveredCourtDecision(
                    external_id=(
                        f"{decision_type}:"
                        f"{case_number}:"
                        f"{decision_date}"
                    ),
                    title=parties,
                    decision_type=(
                        decision_type
                    ),
                    case_number=(
                        case_number
                    ),
                    decision_date=(
                        decision_date
                    ),
                    judge=judge,
                    keywords=keywords,
                    legislation=(
                        legislation
                    ),
                    page_url=page_url,
                    download_url=(
                        download_url
                    ),
                    metadata={
                        "listing_verified": True,
                    },
                )
            )

    return documents


async def discover_court_decisions(
    page_url: str,
    decision_type: str,
) -> List[DiscoveredCourtDecision]:
    html = await fetch_court_page(
        page_url
    )

    return parse_court_decisions(
        html=html,
        page_url=page_url,
        decision_type=decision_type,
    )


# ============================================================
# Latest non-empty archive discovery
# ============================================================

async def _find_latest_non_empty_archive(
    links: list[tuple[int, str]],
    decision_type: str,
) -> tuple[
    str | None,
    list[DiscoveredCourtDecision],
]:
    """
    Start with the latest month and move backwards
    until an archive containing actual decisions
    is found.
    """

    for month, page_url in links:
        try:
            documents = (
                await discover_court_decisions(
                    page_url=page_url,
                    decision_type=decision_type,
                )
            )

            if documents:
                for document in documents:
                    document.metadata[
                        "archive_month"
                    ] = month

                    document.metadata[
                        "archive_url"
                    ] = page_url

                return (
                    page_url,
                    documents,
                )

        except Exception:
            # A broken/empty archive should not stop
            # discovery of the previous month.
            continue

    return (
        None,
        [],
    )


async def discover_latest_court_decisions(
) -> tuple[
    list[DiscoveredCourtDecision],
    dict,
]:
    """
    Automatically find the latest non-empty
    Judgment archive and latest non-empty
    Order archive.
    """

    archive_links = (
        await discover_archive_links()
    )

    judgment_url, judgments = (
        await _find_latest_non_empty_archive(
            archive_links.get(
                "judgment",
                [],
            ),
            "judgment",
        )
    )

    order_url, orders = (
        await _find_latest_non_empty_archive(
            archive_links.get(
                "order",
                [],
            ),
            "order",
        )
    )

    documents = [
        *judgments,
        *orders,
    ]

    discovery_metadata = {
        "judgment_page": judgment_url,
        "judgments_found": len(
            judgments
        ),
        "order_page": order_url,
        "orders_found": len(
            orders
        ),
    }

    return (
        documents,
        discovery_metadata,
    )