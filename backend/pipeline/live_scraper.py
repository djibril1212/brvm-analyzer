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
    """
    Parse le HTML de la page BRVM pour extraire les cours.
    Extrait depuis le widget ticker : <div class="item"><span>TICKER</span>...
    Format : ticker, last_price (ex: "5 200"), variation_pct (ex: "-0,77%")
    """
    rows: list[dict[str, Any]] = []
    scraped_at = datetime.now(timezone.utc).isoformat()

    # Pattern du widget ticker (tous les 47 titres)
    item_pattern = re.compile(
        r'<div class="item"><span>([A-Z]+)</span>&nbsp;'
        r'<span>([\d\s]+)</span>&nbsp;'
        r'<span>([+-]?[\d,]+%)</span>',
        re.IGNORECASE,
    )

    def to_float(s: str) -> float | None:
        s = s.strip().replace("\xa0", "").replace(" ", "").replace(",", ".").replace("%", "")
        try:
            return float(s)
        except (ValueError, TypeError):
            return None

    for m in item_pattern.finditer(html):
        ticker = m.group(1).upper()
        last_price = to_float(m.group(2))
        variation_pct = to_float(m.group(3))
        rows.append({
            "ticker": ticker,
            "last_price": last_price,
            "variation_pct": variation_pct,
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
