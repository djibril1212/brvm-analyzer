"""
Point d'entrée uvicorn.
À lancer depuis la RACINE du repo (pas depuis backend/) :
    uvicorn backend.api.main:app --reload
"""

from backend.api.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=True)
