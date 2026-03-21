# Guide de Réponse aux Incidents — BRVM Daily Analyzer

## Incidents Spécifiques au Projet

Les incidents les plus probables sur BRVM Daily Analyzer sont :

| ID | Incident | Probabilité | Impact |
|----|----------|-------------|--------|
| I1 | BOC PDF non disponible à 18h30 | Moyenne | Dashboard sans données du jour |
| I2 | Changement de format du PDF BOC | Moyenne | Parser en échec, données manquantes |
| I3 | Supabase indisponible | Faible | Pipeline et dashboard hors service |
| I4 | Railway (backend) down | Faible | API inaccessible |
| I5 | Claude API timeout/erreur | Faible | Données présentes, analyse absente |
| I6 | Vercel deployment fail | Faible | Dashboard inaccessible |
| I7 | Analyse IA avec hallucinations | Moyenne | Publication d'informations incorrectes |
| I8 | Clé API exposée accidentellement | Faible | Sécurité compromise |

---

## Niveaux de Sévérité

### Sévérité 1 — Critique (réponse immédiate)
- Dashboard complètement inaccessible
- Données incorrectes publiées (hallucinations chiffrées non détectées)
- Clé API exposée publiquement

### Sévérité 2 — Haute (réponse dans l'heure)
- Pipeline en échec depuis >2 jours de bourse consécutifs
- Base de données corrompue ou inaccessible
- API REST retournant des erreurs 500

### Sévérité 3 — Moyenne (réponse dans la journée)
- Analyse IA absente mais données brutes présentes
- BOC d'un jour manquant (données de la veille affichées)
- Parsing partiel (< 40 symboles sur 47)

### Sévérité 4 — Faible (réponse en 48h)
- Bug d'affichage mineur sur une page
- Lenteur du dashboard (>3s)
- Données d'un secteur manquantes

---

## Playbooks par Incident

### I1 — BOC PDF Non Disponible

**Symptôme** : Le pipeline GitHub Actions retourne une erreur de téléchargement.

**Réponse** :
1. Vérifier manuellement `https://brvm.org` — est-ce que le site répond ?
2. Vérifier les logs GitHub Actions pour le message d'erreur exact
3. Le retry automatique (3x/15min) est-il actif ? Si non, le déclencher manuellement
4. Si le BOC n'est pas publié avant 20h UTC : accepter que le dashboard affiche "Données non disponibles pour ce jour"
5. Le lendemain, récupérer le BOC manquant et lancer le pipeline manuellement : `python pipeline/run.py --date YYYY-MM-DD --force`

**Template de log** :
```
INCIDENT I1 - BOC non disponible
Date : [date]
Heure détection : [heure]
Tentatives effectuées : [N]
Résolution : [description]
```

---

### I2 — Changement de Format PDF BOC

**Symptôme** : Le parser retourne 0 lignes ou des données aberrantes (variations de 10000%).

**Réponse** :
1. Télécharger manuellement le BOC du jour
2. Inspecter visuellement le PDF — y a-t-il un changement de structure ?
3. Comparer avec un BOC de référence dans `backend/tests/fixtures/`
4. Ajuster `parser.py` pour le nouveau format
5. Tester sur le BOC du jour + les 5 BOC de référence
6. Re-déployer et re-lancer le pipeline

**Note** : Ce scénario est prévu dans la gestion des risques (R1 du PRD). Maintenir un fallback OCR dans `parser_ocr.py`.

---

### I5 — Claude API Indisponible ou Timeout

**Symptôme** : Le pipeline réussit les étapes 1-3 (téléchargement, parsing, BDD) mais l'analyse IA échoue.

**Réponse** :
1. Vérifier le status Anthropic : `https://status.anthropic.com`
2. Vérifier les logs Railway pour le message d'erreur
3. Si timeout : augmenter le timeout dans `analyzer.py` et re-lancer
4. Si erreur API : attendre la résolution Anthropic, puis re-lancer `python pipeline/run.py --skip-download --date YYYY-MM-DD`
5. Publier les données brutes sans analyse (le dashboard affiche les cours sans l'analyse IA)

---

### I7 — Analyse IA avec Hallucinations

**Symptôme** : La validation post-génération détecte des symboles inexistants ou des chiffres non présents dans les données.

**Réponse** :
1. Ne pas publier l'analyse corrompue
2. Inspecter le prompt et les données injectées
3. Re-générer l'analyse avec un prompt légèrement modifié
4. Valider à nouveau
5. Si l'hallucination persiste : publier les données brutes sans analyse
6. Ouvrir un ticket pour améliorer le prompt de validation

**IMPORTANT** : Une analyse avec des chiffres erronés est pire que pas d'analyse du tout. En cas de doute, ne pas publier.

---

### I8 — Clé API Exposée

**Symptôme** : Clé `ANTHROPIC_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` commitée dans Git.

**Réponse (immédiate)** :
1. Révoquer la clé immédiatement depuis le dashboard Anthropic/Supabase
2. Générer une nouvelle clé
3. Mettre à jour dans Railway et Vercel
4. Supprimer le commit avec la clé exposée : `git rebase -i` + force push
5. Vérifier les logs d'utilisation pour détecter des appels non autorisés
6. Ajouter un hook pre-commit pour détecter les secrets : `git-secrets` ou `detect-secrets`

---

## Communication

Pour ce projet solo (Djibril Abaltou), la communication d'incident se fait via :
- **Log Supabase** (`pipeline_logs` table) — trace automatique de chaque run
- **GitHub Actions** — email de notification sur échec du workflow
- **Page status** (v2) — statut public du pipeline

---

## Post-Mortem

Après tout incident Sévérité 1-2, documenter dans `docs/incidents/YYYY-MM-DD-titre.md` :

```markdown
## Post-Mortem : [Titre de l'incident]
**Date** : YYYY-MM-DD
**Durée** : X heures
**Impact** : Données manquantes pour N jours de bourse

### Chronologie
- 18h32 : Le pipeline a détecté [X]
- 18h45 : Identification de la cause : [Y]
- 19h15 : Correction déployée

### Cause racine
[Description]

### Actions correctives
- [ ] [Action 1]
- [ ] [Action 2]
```
