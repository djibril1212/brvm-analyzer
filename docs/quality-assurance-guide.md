# Guide QA — BRVM Daily Analyzer

## Les 3 Niveaux de Qualité

### 1. Qualité des Données
Les données doivent être exactes avant tout. Un dashboard beau avec des données fausses est inutilisable.

### 2. Qualité de l'Analyse IA
L'analyse doit être cohérente avec les données, sans hallucinations, respectant les contraintes légales.

### 3. Qualité du Dashboard
L'interface doit être utilisable, rapide, et correcte sur mobile.

---

## QA du Pipeline de Données

### Tests Unitaires (automatisés)

```python
# backend/tests/test_parser.py

def test_parser_boc_standard():
    """Test sur un BOC standard avec 47 actions."""
    result = parse_boc("tests/fixtures/boc_2025-03-20.pdf")
    assert len(result['stocks']) == 47
    assert all('symbol' in s for s in result['stocks'])
    assert all('cours' in s for s in result['stocks'])

def test_parser_action_non_transigee():
    """Une action non transigée doit avoir volume=0, cours=cours_veille."""
    result = parse_boc("tests/fixtures/boc_2025-06-10.pdf")
    snts = next(s for s in result['stocks'] if s['symbol'] == 'SNTS')
    assert snts['volume'] == 0
    assert snts['variation'] == 0.0

def test_parser_indices_presents():
    """Les 3 indices principaux doivent être présents."""
    result = parse_boc("tests/fixtures/boc_2025-03-20.pdf")
    assert 'composite' in result['indices']
    assert 'brvm30' in result['indices']
    assert 'prestige' in result['indices']

def test_parser_5_boc_historiques():
    """Le parser doit fonctionner sur 5 BOC de formats différents."""
    fixtures = [
        "tests/fixtures/boc_2025-01-15.pdf",
        "tests/fixtures/boc_2025-03-20.pdf",
        "tests/fixtures/boc_2025-06-10.pdf",
        "tests/fixtures/boc_2025-09-05.pdf",
        "tests/fixtures/boc_2025-12-20.pdf",
    ]
    for path in fixtures:
        result = parse_boc(path)
        assert len(result['stocks']) >= 40, f"Moins de 40 actions pour {path}"
```

### Tests de Validation des Données

```python
# backend/tests/test_validator.py

def test_validation_rejects_negative_cours():
    """Un cours négatif doit être rejeté."""
    bad_data = {'symbol': 'TEST', 'cours': -100, 'variation': 0}
    with pytest.raises(ValidationError):
        validate_stock(bad_data)

def test_validation_accepts_zero_volume():
    """Volume zéro est valide (action non transigée)."""
    data = {'symbol': 'TEST', 'cours': 1000, 'volume': 0, 'variation': 0}
    result = validate_stock(data)
    assert result is not None
```

### Checklist QA Pipeline (manuelle)

Avant chaque déploiement d'une modification du pipeline :

- [ ] `pytest backend/` — tous les tests passent
- [ ] Parser testé sur les 5 BOC de référence
- [ ] Données insérées en BDD de staging vérifiées manuellement
- [ ] Analyse IA générée et validée (chiffres cohérents avec données)
- [ ] Pipeline end-to-end exécuté en staging : `python pipeline/run.py --date YYYY-MM-DD`

---

## QA de l'Analyse IA

### Validation Automatique (post-génération)

```python
def qa_analysis(analysis: dict, market_data: dict) -> QAResult:
    issues = []

    # 1. Format JSON valide
    required_fields = ['synthese', 'sentiment', 'picks', 'alertes', 'analyse_sectorielle']
    for field in required_fields:
        if field not in analysis:
            issues.append(f"Champ manquant: {field}")

    # 2. Sentiment valide
    if analysis.get('sentiment') not in ['bullish', 'neutre', 'bearish']:
        issues.append(f"Sentiment invalide: {analysis.get('sentiment')}")

    # 3. Symboles des picks valides
    valid_symbols = {s['symbol'] for s in market_data['stocks']}
    for pick in analysis.get('picks', []):
        if pick['symbol'] not in valid_symbols:
            issues.append(f"Symbole inexistant dans les picks: {pick['symbol']}")

    # 4. Nombre de picks raisonnable
    if len(analysis.get('picks', [])) > 5:
        issues.append(f"Trop de picks: {len(analysis['picks'])} (max 5)")

    # 5. Formulations interdites
    forbidden = ['achetez', 'vendez', 'investissez', 'conseil d\'achat', 'conseil de vente']
    text = (analysis.get('synthese', '') + analysis.get('analyse_sectorielle', '')).lower()
    for word in forbidden:
        if word in text:
            issues.append(f"Formulation interdite détectée: '{word}'")

    return QAResult(passed=len(issues) == 0, issues=issues)
```

### QA Manuelle de l'Analyse (hebdomadaire)

Chaque semaine, relire 2-3 analyses générées et vérifier :
- [ ] La synthèse est-elle compréhensible pour un investisseur particulier ?
- [ ] Les picks sont-ils cohérents avec les données du jour ?
- [ ] Les alertes sont-elles légitimes (pas de faux positifs) ?
- [ ] L'analyse sectorielle est-elle précise ?

---

## QA du Dashboard

### Tests Automatisés (Frontend)

```bash
# Tests de composants (Jest + React Testing Library)
npm run test

# Vérification TypeScript
npm run type-check

# Lint
npm run lint

# Build de production (détecte les erreurs build-time)
npm run build
```

### Checklist QA Dashboard (avant chaque release)

**Mobile (prioritaire)** :
- [ ] iPhone 12 / Samsung Galaxy S21 (375px-390px)
- [ ] Bottom navigation fonctionnelle
- [ ] Cartes actions : scroll horizontal correct
- [ ] Graphiques : lisibles et zoomables sur mobile
- [ ] Texte : pas de débordement, taille lisible sans zoom

**Performance** :
- [ ] Lighthouse score ≥ 85 sur mobile
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] Pas de layout shift visible (CLS < 0.1)

**Données** :
- [ ] Page accueil affiche les données du dernier jour de bourse
- [ ] Les variations sont colorées correctement (vert hausse, rouge baisse)
- [ ] Les pourcentages sont correctement formatés (ex: +2.34%)
- [ ] Le disclaimer légal est visible sur toutes les pages

**États spéciaux** :
- [ ] État chargement : skeleton loaders présents
- [ ] État erreur API : message d'erreur utile
- [ ] Pas de données (week-end, férié) : message approprié
- [ ] Historique : navigation par date fonctionne sur 12 mois

---

## QA de l'API REST

### Tests d'Intégration

```python
# backend/tests/test_api.py

def test_get_daily_valid_date(client):
    response = client.get("/api/daily/2026-03-20")
    assert response.status_code == 200
    data = response.json()
    assert 'stocks' in data
    assert 'indices' in data

def test_get_daily_weekend_returns_404(client):
    response = client.get("/api/daily/2026-03-22")  # Dimanche
    assert response.status_code == 404

def test_get_stock_invalid_symbol(client):
    response = client.get("/api/stock/INVALID")
    assert response.status_code == 404

def test_rate_limiting(client):
    """Après 60 requêtes/min, retourner 429."""
    for _ in range(61):
        response = client.get("/api/daily/2026-03-20")
    assert response.status_code == 429
```
