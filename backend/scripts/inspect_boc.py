#!/usr/bin/env python3
"""
Script de diagnostic pour inspecter la structure d'un BOC PDF.
À utiliser AVANT de calibrer le parser.

Usage :
    python -m backend.scripts.inspect_boc backend/data/raw/boc_YYYY-MM-DD.pdf

Ce script affiche :
  - Le nombre de pages
  - Le texte brut de chaque page (tronqué)
  - Tous les tableaux détectés avec leurs dimensions et premières lignes
  - Les coordonnées des bounding boxes

Cela permet d'identifier les patterns à utiliser dans parser.py.
"""

from __future__ import annotations

import sys
from pathlib import Path


def inspect(pdf_path: Path, max_chars_per_page: int = 2000) -> None:
    try:
        import pdfplumber
    except ImportError:
        print("pdfplumber non installé — pip install pdfplumber")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"INSPECTION BOC : {pdf_path.name}")
    print(f"{'='*60}\n")

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Nombre de pages : {len(pdf.pages)}\n")

        for page_num, page in enumerate(pdf.pages, start=1):
            print(f"\n{'─'*50}")
            print(f"PAGE {page_num} — dimensions : {page.width:.1f} x {page.height:.1f}")
            print(f"{'─'*50}")

            # Texte brut
            text = page.extract_text() or ""
            preview = text[:max_chars_per_page]
            if len(text) > max_chars_per_page:
                preview += f"\n... [{len(text) - max_chars_per_page} caractères supplémentaires]"
            print("\n[TEXTE BRUT]")
            print(preview)

            # Tableaux
            tables = page.extract_tables()
            print(f"\n[TABLEAUX DÉTECTÉS : {len(tables)}]")
            for t_idx, table in enumerate(tables):
                if not table:
                    continue
                rows_count = len(table)
                cols_count = max(len(row) for row in table)
                print(f"\n  Tableau #{t_idx + 1} — {rows_count} lignes × {cols_count} colonnes")
                # Affiche les 5 premières lignes
                for row_idx, row in enumerate(table[:5]):
                    print(f"    Ligne {row_idx}: {row}")
                if rows_count > 5:
                    print(f"    ... ({rows_count - 5} lignes supplémentaires)")

            # Tableaux avec bounding boxes (pour calibrer les zones)
            print("\n[BOUNDING BOXES DES TABLEAUX]")
            try:
                table_settings = {"vertical_strategy": "lines", "horizontal_strategy": "lines"}
                finder = page.find_tables(table_settings)
                for t_idx, tbl in enumerate(finder):
                    print(f"  Tableau #{t_idx + 1} bbox : {tbl.bbox}")
            except Exception as e:
                print(f"  (bbox non disponible : {e})")

            # Mots clés BRVM à rechercher
            keywords = ["BRVM", "COMPOSITE", "cours", "volume", "secteur", "BOC", "séance"]
            found_kw = [kw for kw in keywords if kw.lower() in text.lower()]
            if found_kw:
                print(f"\n[MOTS CLÉS TROUVÉS : {', '.join(found_kw)}]")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"Fichier non trouvé : {pdf_path}")
        sys.exit(1)

    inspect(pdf_path)


if __name__ == "__main__":
    main()
