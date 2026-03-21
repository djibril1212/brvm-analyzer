"""
Scraper temps réel des cours BRVM.
Stratégie 1 : httpx avec headers navigateur (rapide, sans Playwright)
Stratégie 2 : Playwright headless (si stratégie 1 échoue)

Données cibles : last_price, variation_pct, open_price, high, low,
                 bid, ask, volume, status pour les 47 actions BRVM.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BRVM_LIVE_URL = "https://www.brvm.org/fr/cours-de-bourse/0"
SIKA_URL = "https://www.sikafinance.com/marches/cotation"

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}


def is_market_open() -> bool:
    """Retourne True si la BRVM est potentiellement ouverte (9h-14h UTC, lun-ven)."""
    now = datetime.now(timezone.utc)
    return (
        now.weekday() < 5  # lundi-vendredi
        and 8 <= now.hour < 15  # fenêtre large autour de 9h-14h UTC
    )


async def scrape_with_httpx() -> list[dict[str, Any]] | None:
    """Tente de scraper le site BRVM via httpx (sans Playwright)."""
    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            verify=False,
            headers=BROWSER_HEADERS,
        ) as client:
            resp = await client.get(BRVM_LIVE_URL)
            if resp.status_code != 200:
                logger.warning("httpx scrape: HTTP %s", resp.status_code)
                return None

            return _parse_brvm_html(resp.text)

    except Exception as exc:
        logger.warning("httpx scrape échoué: %s", exc)
        return None


async def scrape_with_playwright() -> list[dict[str, Any]] | None:
    """Scrape via Playwright (vrai navigateur headless)."""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            )
            page = await browser.new_page(
                extra_http_headers={"Accept-Language": "fr-FR,fr;q=0.9"}
            )
            await page.goto(BRVM_LIVE_URL, wait_until="networkidle", timeout=30000)
            # Attendre que le tableau soit chargé
            await page.wait_for_selector("table", timeout=15000)
            html = await page.content()
            await browser.close()

        return _parse_brvm_html(html)

    except ImportError:
        logger.warning("playwright non installé")
        return None
    except Exception as exc:
        logger.warning("Playwright scrape échoué: %s", exc)
        return None


def _parse_brvm_html(html: str) -> list[dict[str, Any]]:
    """Parse le HTML de la page BRVM pour extraire les cours."""
    from html.parser import HTMLParser

    rows: list[dict[str, Any]] = []
    scraped_at = datetime.now(timezone.utc).isoformat()

    # Pattern de parsing des tableaux HTML
    # La page BRVM contient un tableau avec : symbole, nom, cours_veille,
    # ouv, cloture, var%, volume, valeur, ...
    table_pattern = re.compile(
        r"<tr[^>]*>(.*?)</tr>", re.DOTALL | re.IGNORECASE
    )
    cell_pattern = re.compile(
        r"<t[dh][^>]*>(.*?)</t[dh]>", re.DOTALL | re.IGNORECASE
    )
    tag_pattern = re.compile(r"<[^>]+>")

    def clean(text: str) -> str:
        return tag_pattern.sub("", text).strip().replace("\xa0", " ").replace(",", ".")

    def to_float(s: str) -> float | None:
        s = clean(s).replace(" ", "").replace("%", "")
        try:
            return float(s)
        except (ValueError, TypeError):
            return None

    known_symbols = {
        "ABJC", "BICB", "BICC", "BNBC", "BOAB", "BOABF", "BOAC", "BOAM",
        "BOAN", "BOAS", "CABC", "CBIBF", "CFAC", "CIEC", "ECOC", "ETIT",
        "FTSC", "LNBB", "NEIC", "NSBC", "NTLC", "ONTBF", "ORAC", "ORGT",
        "PALC", "PRSC", "SAFC", "SCRC", "SDCC", "SDSC", "SEMC", "SGBC",
        "SHEC", "SIBC", "SICC", "SIVC", "SLBC", "SMBC", "SNTS", "SOGC",
        "SPHC", "STAC", "STBC", "SVOC", "TTLC", "TTLS", "UNLC", "UNXC",
    }

    for match in table_pattern.finditer(html):
        cells = [clean(m.group(1)) for m in cell_pattern.finditer(match.group(1))]
        if len(cells) < 7:
            continue

        # Trouver le symbole dans les cellules
        symbol = None
        for cell in cells[:4]:
            upper = cell.upper().strip()
            if upper in known_symbols:
                symbol = upper
                break

        if not symbol:
            continue

        # Mapping selon l'ordre habituel du tableau BRVM
        # [0] secteur/vide, [1] symbole, [2] nom, [3] cours_veille,
        # [4] ouv, [5] cloture, [6] var%, [7] volume, [8] valeur
        try:
            idx = next(i for i, c in enumerate(cells) if c.upper() == symbol)
        except StopIteration:
            continue

        def get(offset: int) -> str:
            i = idx + offset
            return cells[i] if 0 <= i < len(cells) else ""

        variation_str = get(5).replace("+", "")
        rows.append({
            "ticker": symbol,
            "prev_close": to_float(get(2)),
            "open_price": to_float(get(3)),
            "last_price": to_float(get(4)),
            "variation_pct": to_float(variation_str),
            "volume": to_float(get(6)),
            "scraped_at": scraped_at,
            "status": "live",
        })

    logger.info("HTML parsé: %d actions trouvées", len(rows))
    return rows if rows else []


async def run_live_scrape() -> list[dict[str, Any]]:
    """
    Lance le scraping live. Essaie httpx d'abord, puis Playwright.
    Retourne la liste des cours ou une liste vide en cas d'échec.
    """
    logger.info("Démarrage scrape live BRVM...")

    # Stratégie 1 : httpx (léger)
    data = await scrape_with_httpx()
    if data:
        logger.info("Scrape httpx OK: %d actions", len(data))
        return data

    # Stratégie 2 : Playwright (lourd mais fiable)
    logger.info("httpx échoué, tentative Playwright...")
    data = await scrape_with_playwright()
    if data:
        logger.info("Scrape Playwright OK: %d actions", len(data))
        return data

    logger.error("Toutes les stratégies de scrape ont échoué")
    return []


def scrape_live_sync() -> list[dict[str, Any]]:
    """Wrapper synchrone pour run_live_scrape()."""
    return asyncio.run(run_live_scrape())
