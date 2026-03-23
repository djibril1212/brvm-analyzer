"""
Appel à l'API Claude pour l'analyse quotidienne BRVM.
Modèle : claude-sonnet-4-20250514 (~$0.028/appel pour ~2000 tokens output)
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import anthropic

from ..pipeline.models import MarketSession
from .prompt_builder import build_analysis_prompt, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 6000   # Augmenté pour le schéma enrichi (régime, rotation, 4 couches, scénarios)
TEMPERATURE = 0.3   # Faible pour maximiser la reproductibilité factuelle


def analyze_session(session: MarketSession) -> dict[str, Any]:
    """
    Appelle l'API Claude pour analyser la séance BRVM.

    Returns:
        Dict correspondant au schéma d'analyse (voir prompt_builder._get_output_schema)

    Raises:
        anthropic.APIError: Si l'API Claude est indisponible
        ValueError: Si la réponse n'est pas du JSON valide
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY non configurée")

    client = anthropic.Anthropic(api_key=api_key)

    user_prompt = build_analysis_prompt(session)

    logger.info(
        "Appel Claude %s pour la séance du %s — ~%d tokens estimés",
        MODEL,
        session.session_date,
        _estimate_tokens(user_prompt),
    )

    message = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = message.content[0].text
    logger.info(
        "Réponse Claude reçue — input: %d tokens, output: %d tokens",
        message.usage.input_tokens,
        message.usage.output_tokens,
    )

    analysis = _parse_json_response(raw_text, session)

    # S'assurer que le disclaimer est toujours présent
    if "disclaimer" not in analysis:
        analysis["disclaimer"] = "Ceci n'est pas un conseil en investissement."

    return analysis


def _parse_json_response(raw: str, session: MarketSession) -> dict[str, Any]:
    """
    Parse la réponse Claude en JSON.
    Tente d'extraire le JSON même si Claude a ajouté du texte autour.
    """
    import re

    # Tentative directe
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Extraction entre ```json ... ``` ou ``` ... ``` (avec ou sans backtick fermant)
    match = re.search(r"```(?:json)?\s*([\s\S]*?)(?:```|$)", raw)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Si la réponse commence par ```json, strip la première ligne et parse le reste
    stripped = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    stripped = re.sub(r"\s*```\s*$", "", stripped)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Extraction du premier { ... } (le plus grand bloc)
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Impossible de parser la réponse Claude en JSON pour la séance {session.session_date}. "
        f"Début de la réponse : {raw[:200]}"
    )


def _estimate_tokens(text: str) -> int:
    """Estimation grossière : ~4 caractères par token."""
    return len(text) // 4
