# Procédures de Récupération — BRVM Daily Analyzer

## Objectifs de Récupération

| Objectif | Valeur |
|----------|--------|
| RPO (perte de données acceptable) | 1 jour de bourse |
| RTO (temps de restauration max) | 4 heures |
| Priorité de récupération | 1. BDD → 2. Backend → 3. Frontend → 4. Pipeline |

---

## R1 — Récupération Données Supabase

### Scénario : Données corrompues ou accidentellement supprimées

**Supabase sauvegarde automatiquement** sur le plan gratuit (7 jours de rétention point-in-time).

```bash
# 1. Accéder au dashboard Supabase
# Dashboard → Settings → Backups → Point-in-time Recovery

# 2. Identifier le moment avant la corruption
# Consulter les logs : Dashboard → Logs → Postgres Logs

# 3. Restaurer vers le point souhaité
# (via l'interface Supabase Dashboard — pas de CLI disponible sur Free tier)
```

### Scénario : Réinsertion manuelle d'un jour de bourse manquant

```bash
# Re-lancer le pipeline pour une date spécifique
cd backend
python pipeline/run.py --date 2026-03-20 --force

# Ou uniquement le parsing et l'insertion (sans re-téléchargement si PDF disponible)
python pipeline/run.py --date 2026-03-20 --skip-download --boc-path data/raw/boc_2026-03-20.pdf
```

---

## R2 — Récupération Backend Railway

### Scénario : Service Python crashé

```bash
# Via Railway Dashboard
# Dashboard → Service → Deployments → Redéployer le dernier déploiement stable

# Ou via Railway CLI
railway redeploy --service backend
```

### Scénario : Déploiement défaillant

```bash
# Rollback vers la version précédente
railway rollback --service backend

# Vérifier que le service redémarre
railway logs --service backend --tail
```

### Vérification post-récupération
```bash
# Tester l'API
curl https://api.brvm-analyzer.com/api/sectors
# Doit retourner les 7 secteurs avec leur état actuel
```

---

## R3 — Récupération Frontend Vercel

### Scénario : Déploiement défaillant

Vercel garde l'historique de tous les déploiements. Rollback instantané :

```bash
# Via Vercel CLI
vercel rollback

# Ou via Vercel Dashboard
# Dashboard → Deployments → [déploiement stable] → Promote to Production
```

### Scénario : ISR bloquée (cache obsolète)

```bash
# Forcer la revalidation de toutes les pages
curl -X POST https://brvm-analyzer.com/api/revalidate \
  -H "Authorization: Bearer $REVALIDATION_SECRET"
```

---

## R4 — Récupération Pipeline GitHub Actions

### Scénario : Le cron ne s'est pas déclenché

```bash
# Déclencher manuellement le workflow
gh workflow run daily-pipeline.yml

# Ou avec une date spécifique
gh workflow run daily-pipeline.yml -f date=2026-03-20
```

### Scénario : Pipeline bloqué (pas de fin)

```bash
# Annuler le run bloqué
gh run cancel [run-id]

# Re-déclencher
gh workflow run daily-pipeline.yml
```

### Scénario : Plusieurs jours de bourse manquants

```bash
# Récupérer les BOC manquants depuis brvm.org (si disponibles)
# Puis re-lancer le pipeline pour chaque jour
for date in 2026-03-18 2026-03-19 2026-03-20; do
    python pipeline/run.py --date $date
    sleep 30  # Respecter la limite de rate de Claude API
done
```

---

## R5 — Récupération Clé API Compromise

**Priorité maximale — agir dans les 10 minutes.**

```bash
# 1. Révoquer la clé Anthropic compromise
# → anthropic.com/dashboard → API Keys → Revoke

# 2. Générer une nouvelle clé Anthropic
# → anthropic.com/dashboard → API Keys → Create

# 3. Mettre à jour dans Railway
railway variables set ANTHROPIC_API_KEY=sk-ant-[nouvelle-clé] --service backend

# 4. Redéployer le backend
railway redeploy --service backend

# 5. Vérifier les logs Anthropic pour détecter des appels non autorisés
# → anthropic.com/dashboard → Usage → Filter by date of compromise

# 6. Supprimer le commit contenant la clé exposée
git log --oneline | head -20  # Identifier le commit problématique
# Contacter GitHub support pour purger les secrets de l'historique
```

---

## R6 — Récupération Base de Données Supabase Full

### Scénario : Perte totale du projet Supabase

```bash
# 1. Créer un nouveau projet Supabase
# 2. Appliquer toutes les migrations dans l'ordre
cd backend
supabase db push  # Si Supabase CLI configuré

# Ou manuellement
psql $SUPABASE_DB_URL < db/migrations/001_initial.sql
psql $SUPABASE_DB_URL < db/migrations/002_indexes.sql
# etc.

# 3. Re-insérer les données historiques
# Si des exports CSV ont été faits, importer via Supabase Dashboard

# 4. Re-lancer le pipeline pour les derniers jours manquants
```

**Prévention** : Exporter un dump CSV mensuel des tables principales :
```bash
# Script à lancer manuellement le 1er de chaque mois
python scripts/export_backup.py --output backups/$(date +%Y-%m).csv
```

---

## Checklist Post-Récupération

Après toute récupération, vérifier :

- [ ] Le pipeline s'exécute correctement (`python pipeline/run.py --date [hier] --dry-run`)
- [ ] Les données du dernier jour de bourse sont présentes en BDD
- [ ] L'API retourne des données cohérentes (`curl /api/daily/[dernière date]`)
- [ ] Le dashboard affiche les bonnes données
- [ ] Les logs ne montrent pas d'erreurs persistantes
- [ ] Documenter l'incident dans `docs/incidents/`
