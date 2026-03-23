"""
Scraper temps réel des cours BRVM via getdoli.com.
getdoli.com scrape brvm.org et expose les données dans son payload RSC (Next.js).
On extrait le JSON embarqué dans les blocs self.__next_f.push([1,"..."]).

Données disponibles : ticker, last_price, variation_pct, prev_close, bid, ask, volume, etc.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DOLI_URL = "https://www.getdoli.com/fr/market"

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


def is_market_open() -> bool:
    """Retourne True si la BRVM est potentiellement ouverte (9h-14h UTC, lun-ven)."""
    now = datetime.now(timezone.utc)
    return now.weekday() < 5 and 8 <= now.hour < 15


def _extract_rsc_content(html: str) -> str:
    """Extrait et concatène les chunks RSC de getdoli.com."""
    chunks: list[str] = []
    pattern = re.compile(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)')
    for m in pattern.finditer(html):
        raw = m.group(1)
        try:
            chunks.append(json.loads('"' + raw + '"'))
        except (json.JSONDecodeError, ValueError):
            chunks.append(
                raw.replace("\\n", "\n")
                   .replace("\\r", "\r")
                   .replace("\\t", "\t")
                   .replace('\\"', '"')
                   .replace("\\\\", "\\")
            )
    return "\n".join(chunks)


def _find_stock_array(content: str) -> list[dict[str, Any]] | None:
    """
    Cherche le tableau de stocks dans le contenu RSC.
    Parcourt les lignes JSON du format 'id:payload'.
    """
    # Cherche le marker "data":[{ contenant des stocks (ticker présent)
    marker = '"data":['
    idx = -1
    search_from = 0
    while True:
        pos = content.find(marker, search_from)
        if pos == -1:
            break
        # Vérifie que cette section data contient bien des stocks
        snippet = content[pos : pos + 200]
        if '"ticker"' in snippet:
            idx = pos
            break
        search_from = pos + 1
    if idx == -1:
        return None

    # Remonte jusqu'au { parent du bloc "data"
    obj_start = idx
    while obj_start > 0 and content[obj_start] != "{":
        obj_start -= 1

    # Trouve la fin du JSON en comptant les accolades
    depth = 0
    in_str = False
    limit = min(obj_start + 1_000_000, len(content))
    for i in range(obj_start, limit):
        c = content[i]
        if c == '"' and (i == 0 or content[i - 1] != "\\"):
            in_str = not in_str
        elif not in_str:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads(content[obj_start : i + 1])
                        data = obj.get("data")
                        if isinstance(data, list) and data and isinstance(data[0], dict) and "ticker" in data[0]:
                            return data
                    except (json.JSONDecodeError, ValueError):
                        pass
                    break
    return None


def _parse_doli_stocks(stocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convertit les stocks getdoli en format live_quotes."""
    scraped_at = datetime.now(timezone.utc).isoformat()
    rows = []
    for s in stocks:
        ticker = s.get("ticker")
        if not ticker:
            continue
        rows.append({
            "ticker": ticker,
            "last_price": s.get("last_price"),
            "variation_pct": s.get("variation_pct"),
            "prev_close": s.get("prev_close"),
            "open_price": s.get("open_price"),
            "high": s.get("high"),
            "low": s.get("low"),
            "bid": s.get("bid"),
            "ask": s.get("ask"),
            "volume": s.get("qty_total") or s.get("volume"),
            "scraped_at": scraped_at,
            "status": "live",
        })
    return rows


async def run_live_scrape() -> list[dict[str, Any]]:
    """
    Scrape getdoli.com et retourne les cours live.
    Retourne une liste vide en cas d'échec.
    """
    logger.info("Démarrage scrape live via getdoli.com...")
    try:
        async with httpx.AsyncClient(
            timeout=25,
            follow_redirects=True,
            headers=BROWSER_HEADERS,
        ) as client:
            resp = await client.get(DOLI_URL)
            if resp.status_code != 200:
                logger.warning("getdoli: HTTP %s", resp.status_code)
                return []

            content = _extract_rsc_content(resp.text)
            stocks = _find_stock_array(content)
            if not stocks:
                logger.error("getdoli: aucune donnée stock dans le payload RSC")
                return []

            rows = _parse_doli_stocks(stocks)
            logger.info("Scrape getdoli OK: %d actions", len(rows))
            return rows

    except Exception as exc:
        logger.error("Scrape getdoli échoué: %s", exc)
        return []


def scrape_live_sync() -> list[dict[str, Any]]:
    """Wrapper synchrone pour run_live_scrape()."""
    return asyncio.run(run_live_scrape())
