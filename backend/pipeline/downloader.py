"""Téléchargement du Bulletin Officiel de la Cote (BOC) depuis brvm.org."""
import logging
import time
from datetime import date
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


class BOCNotAvailableError(Exception):
    """Le BOC n'a pas encore été publié par la BRVM pour cette date."""


def get_boc_url(session_date: date) -> str:
    """Retourne l'URL du BOC pour une date donnée.
    Format : https://www.brvm.org/sites/default/files/boc_YYYYMMDD_2.pdf
    """
    formatted = session_date.strftime("%Y%m%d")
    return f"https://www.brvm.org/sites/default/files/boc_{formatted}_2.pdf"


def download_boc(session_date: date, max_retries: int = 3, delay_minutes: int = 2) -> Path:
    """
    Télécharge le BOC PDF pour la date donnée.
    Retente max_retries fois avec un délai de delay_minutes entre chaque tentative.
    Retourne le chemin vers le fichier téléchargé.
    """
    output_path = RAW_DIR / f"boc_{session_date.isoformat()}.pdf"

    if output_path.exists():
        logger.info(f"BOC déjà téléchargé : {output_path}")
        return output_path

    url = get_boc_url(session_date)
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Tentative {attempt}/{max_retries} — téléchargement BOC {session_date}")
            with httpx.Client(timeout=60, follow_redirects=True, verify=False) as client:
                response = client.get(url)

                # 404 = BOC pas encore publié par la BRVM (pas la peine de retenter)
                if response.status_code == 404:
                    raise BOCNotAvailableError(
                        f"BOC du {session_date} non disponible sur brvm.org (404) — "
                        f"sera réessayé au prochain cron."
                    )

                response.raise_for_status()

                if "application/pdf" not in response.headers.get("content-type", ""):
                    raise ValueError(f"Réponse non-PDF reçue : {response.headers.get('content-type')}")

                output_path.write_bytes(response.content)
                logger.info(f"BOC téléchargé avec succès : {output_path} ({len(response.content)} bytes)")
                return output_path

        except BOCNotAvailableError:
            raise  # Ne pas retenter pour un 404
        except Exception as e:
            last_error = e
            logger.warning(f"Échec tentative {attempt} : {e}")
            if attempt < max_retries:
                logger.info(f"Attente {delay_minutes} min avant la prochaine tentative...")
                time.sleep(delay_minutes * 60)

    raise RuntimeError(
        f"Impossible de télécharger le BOC pour {session_date} "
        f"après {max_retries} tentatives. Dernière erreur : {last_error}"
    )
