from __future__ import annotations

import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .models import DiscoveredLegalDocument


PARLIAMENT_BASE_URL = "https://www.parliament.lk"


async def enrich_parliament_act(
    document: DiscoveredLegalDocument,
) -> DiscoveredLegalDocument:
    if not document.detail_url:
        return document

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
        response = await client.get(document.detail_url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    page_text = soup.get_text(
        " ",
        strip=True,
    )

    title_match = re.search(
        r"(\d+/\d{4})\s*:\s*(.+?)\s+Endorsed Date:",
        page_text,
        re.IGNORECASE,
    )

    if title_match:
        document.act_number = title_match.group(1).strip()
        document.external_id = document.act_number
        document.title = title_match.group(2).strip()

        year_match = re.search(
            r"/(\d{4})$",
            document.act_number,
        )

        if year_match:
            document.year = int(year_match.group(1))

    date_match = re.search(
        r"Endorsed Date:\s*(\d{4}-\d{2}-\d{2})",
        page_text,
        re.IGNORECASE,
    )

    if date_match:
        document.published_date = date_match.group(1)

    for link in soup.find_all("a", href=True):
        href = link.get("href", "").strip()

        if not href:
            continue

        href_lower = href.lower()

        # Only replace the existing download URL
        # when the detail page provides a real PDF.
        if ".pdf" in href_lower:
            document.download_url = urljoin(
                PARLIAMENT_BASE_URL,
                href,
            )
            break

    document.metadata["detail_verified"] = True

    return document