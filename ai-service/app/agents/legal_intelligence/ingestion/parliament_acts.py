from __future__ import annotations

import re
from typing import List
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .models import DiscoveredLegalDocument


PARLIAMENT_ACTS_URL = (
    "https://www.parliament.lk/en/business-of-parliament/acts-listing"
)

PARLIAMENT_BASE_URL = "https://www.parliament.lk"


async def fetch_parliament_acts_page() -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 "
            "(Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/155.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(
        headers=headers,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        response = await client.get(PARLIAMENT_ACTS_URL)
        response.raise_for_status()
        return response.text


def _extract_year(act_number: str) -> int | None:
    match = re.search(r"/(\d{4})$", act_number)

    if not match:
        return None

    return int(match.group(1))


def parse_parliament_acts(
    html: str,
) -> List[DiscoveredLegalDocument]:
    soup = BeautifulSoup(html, "html.parser")

    documents: list[DiscoveredLegalDocument] = []
    seen: set[str] = set()

    # Parliament page is not a normal HTML table.
    # Search all links and identify Act-number/title patterns.
    links = soup.find_all("a", href=True)

    for link in links:
        link_text = link.get_text(
            " ",
            strip=True,
        )

        # Example:
        # 23/2026 : JUDICATURE (AMENDMENT)
        match = re.match(
            r"^\s*(\d+/\d{4})\s*:\s*(.+?)\s*$",
            link_text,
        )

        if not match:
            continue

        act_number = match.group(1).strip()
        title = match.group(2).strip()

        # Prevent duplicate Acts.
        if act_number in seen:
            continue

        seen.add(act_number)

        detail_url = urljoin(
            PARLIAMENT_BASE_URL,
            link["href"],
        )

        published_date = None
        download_url = None

        # Search nearby parent containers for endorsed date
        # and downloadable Act links.
        container = link.parent

        for _ in range(5):
            if container is None:
                break

            container_text = container.get_text(
                " ",
                strip=True,
            )

            date_match = re.search(
                r"Endorsed Date:\s*(\d{4}-\d{2}-\d{2})",
                container_text,
                re.IGNORECASE,
            )

            if date_match:
                published_date = date_match.group(1)

            for nearby_link in container.find_all(
                "a",
                href=True,
            ):
                nearby_text = nearby_link.get_text(
                    " ",
                    strip=True,
                ).lower()

                href = nearby_link.get("href", "")

                if (
                    "download act" in nearby_text
                    or ".pdf" in href.lower()
                ):
                    download_url = urljoin(
                        PARLIAMENT_BASE_URL,
                        href,
                    )
                    break

            if published_date and download_url:
                break

            container = container.parent

        documents.append(
            DiscoveredLegalDocument(
                external_id=act_number,
                title=title,
                document_type="act",
                act_number=act_number,
                year=_extract_year(act_number),
                published_date=published_date,
                detail_url=detail_url,
                download_url=download_url,
                source_name="Parliament of Sri Lanka",
                source_domain="parliament.lk",
                source_trust_level="OFFICIAL",
                metadata={
                    "listing_url": PARLIAMENT_ACTS_URL,
                },
            )
        )

    return documents


async def discover_parliament_acts(
) -> List[DiscoveredLegalDocument]:
    html = await fetch_parliament_acts_page()

    return parse_parliament_acts(html)