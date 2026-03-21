# Runbooks Opérationnels — BRVM Daily Analyzer

---

## RB-01 — Lancement Manuel du Pipeline

**Quand utiliser** : Pipeline cron raté, re-traitement d'une date, test en staging.

**Durée estimée** : 3-5 minutes

### Prérequis
- Accès SSH au serveur Railway ou environnement Python local configuré
- Variables d'env chargées (`.env` présent ou Railway CLI connecté)
- BOC du jour disponible sur brvm.org ou dans `backend/data/raw/`

### Étapes

```bash
# 1. Se placer dans le répertoire backend
cd backend

# 2. Vérifier que les variables d'env sont chargées
echo $ANTHROPIC_API_KEY | head -c 10  # Doit afficher "sk-ant-api"
echo $SUPABASE_URL  # Doit afficher l'URL Supabase

# 3. Lancer le pipeline complet pour une date
python pipeline/run.py --date 2026-03-20

# 4. Ou uniquement le parsing (si PDF déjà téléchargé)
python pipeline/run.py --date 2026-03-20 --skip-download --boc-path data/raw/boc_2026-03-20.pdf

# 5. Ou dry-run pour tester sans écrire en BDD
python pipeline/run.py --date 2026-03-20 --dry-run
```

### Vérification Succès
```bash
# Vérifier les données insérées
python scripts/check_session.py --date 2026-03-20
# Output attendu: "47 actions, 7 secteurs, analyse IA présente"
```

### Échec Possible
- `FileNotFoundError: boc_*.pdf` → Télécharger manuellement le BOC
- `AnthropicAPIError` → Vérifier la clé API et le status Anthropic
- `SupabaseError` → Vérifier les variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY

---

## RB-02 — Vérification Quotidienne du Pipeline

**Quand utiliser** : Chaque matin de bourse pour confirmer que le pipeline du soir a réussi.

**Durée estimée** : 2 minutes

### Étapes

```bash
# 1. Vérifier le dernier run GitHub Actions
gh run list --workflow=daily-pipeline.yml --limit=5

# 2. Si le dernier run a échoué, voir les logs
gh run view [run-id] --log

# 3. Vérifier que les données sont en BDD
curl https://api.brvm-analyzer.com/api/daily/$(date +%Y-%m-%d -d "yesterday")
# Doit retourner un JSON avec les données de la veille
```

### Interprétation
- `conclusion: success` → Pipeline OK, rien à faire
- `conclusion: failure` → Voir les logs, identifier l'étape en échec
- Pas de run récent → Le cron ne s'est pas déclenché (vérifier GitHub Actions settings)

---

## RB-03 — Ajout d'un Jour Férié UEMOA

**Quand utiliser** : Quand un nouveau jour férié UEMOA est annoncé et doit être exclu du pipeline.

**Durée estimée** : 10 minutes

### Étapes

```bash
# 1. Éditer la liste des jours fériés
vi backend/pipeline/trading_days.py

# Ajouter dans la liste UEMOA_HOLIDAYS :
UEMOA_HOLIDAYS = [
    # ... jours existants ...
    date(2026, 8, 7),   # Fête Nationale Côte d'Ivoire
    # Nouveau :
    date(2026, 11, 1),  # Toussaint
]

# 2. Tester que la date est bien exclue
python -c "from pipeline.trading_days import is_trading_day; print(is_trading_day('2026-11-01'))"
# Doit retourner False

# 3. Commiter le changement
git add backend/pipeline/trading_days.py
git commit -m "chore: ajouter Toussaint 2026 aux jours fériés UEMOA"
git push
```

---

## RB-04 — Re-génération de l'Analyse IA

**Quand utiliser** : L'analyse du jour est absente, incorrecte, ou a échoué la validation.

**Durée estimée** : 2 minutes

### Prérequis
- Les données de la séance sont déjà en BDD (`stock_daily`, `daily_sessions`)
- Seule l'analyse IA est à régénérer

### Étapes

```bash
# 1. Re-générer l'analyse pour une date (sans re-télécharger ni re-parser)
python pipeline/run.py --date 2026-03-20 --only-analysis

# 2. Vérifier la nouvelle analyse
python scripts/check_analysis.py --date 2026-03-20
# Output attendu: "Sentiment: bullish, Picks: 4, Alertes: 2, Validation: OK"

# 3. Si validation échoue encore, inspecter le prompt et les données
python scripts/debug_analysis.py --date 2026-03-20
```

---

## RB-05 — Déploiement Frontend (Vercel)

**Quand utiliser** : Après merge d'une PR frontend.

**Durée estimée** : 3 minutes (déploiement automatique)

### Flux Normal (automatique)
```bash
git push origin main
# → Vercel détecte le push → Build automatique → Deploy en production
# → Vérifier sur https://vercel.com/dashboard
```

### Déploiement Manuel si Auto Échoue
```bash
vercel --prod
```

### Rollback si Problème
```bash
vercel rollback
# Ou via Dashboard : Deployments → [déploiement stable] → Promote to Production
```

### Vérification
```bash
# Vérifier que la homepage charge
curl -I https://brvm-analyzer.com
# Doit retourner HTTP/2 200

# Vérifier les Core Web Vitals
# → Vercel Dashboard → Analytics → Web Vitals
```

---

## RB-06 — Déploiement Backend (Railway)

**Quand utiliser** : Après merge d'une PR backend.

**Durée estimée** : 5 minutes

### Flux Normal (automatique)
```bash
git push origin main
# → Railway détecte le push → Build Docker → Deploy
```

### Vérification
```bash
# Tester l'API
curl https://api.brvm-analyzer.com/health
# Doit retourner {"status": "ok", "version": "X.Y.Z"}

# Vérifier les logs Railway
railway logs --service backend --tail 50
```

### Rollback
```bash
# Via Railway Dashboard : Deployments → [déploiement stable] → Redeploy
railway rollback --service backend
```

---

## RB-07 — Export de Sauvegarde Mensuel

**Quand utiliser** : Le 1er de chaque mois, pour garder une copie locale des données.

**Durée estimée** : 5 minutes

```bash
# Exporter toutes les données de production
cd backend
python scripts/export_backup.py --output backups/$(date +%Y-%m).json

# Vérifier l'export
python scripts/validate_backup.py --file backups/$(date +%Y-%m).json
# Output attendu: "N sessions, M actions, validation OK"

# Stocker en sécurité (ex: copier sur disque local ou cloud personnel)
cp backups/$(date +%Y-%m).json ~/Backups/brvm-analyzer/
```

---

## RB-08 — Rotation des Clés API

**Quand utiliser** : Tous les 3 mois, ou immédiatement si clé compromise.

```bash
# 1. Générer nouvelle clé Anthropic
# → anthropic.com/dashboard → API Keys → Create New Key

# 2. Mettre à jour dans Railway (sans downtime)
railway variables set ANTHROPIC_API_KEY=sk-ant-[nouvelle-clé] --service backend

# 3. Redéployer pour prendre en compte
railway redeploy --service backend

# 4. Vérifier que le pipeline fonctionne
python pipeline/run.py --date $(date +%Y-%m-%d -d "last monday") --dry-run

# 5. Révoquer l'ancienne clé
# → anthropic.com/dashboard → API Keys → Revoke [ancienne clé]
```
