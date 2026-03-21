# Maintenance Infrastructure — BRVM Daily Analyzer

## Stack Infrastructure

| Service | Rôle | Plan | Coût |
|---------|------|------|------|
| Vercel | Hosting frontend Next.js | Hobby (gratuit) | 0€ |
| Railway | Hosting backend FastAPI | Starter | ~5€/mois |
| Supabase | Base de données PostgreSQL | Free tier | 0€ |
| GitHub Actions | Cron pipeline quotidien | Free (public repo) | 0€ |
| Anthropic | Claude API | Pay-as-you-go | ~5€/mois |
| Domaine | brvm-analyzer.com | Annuel | ~1€/mois |

---

## Maintenance Quotidienne (Automatisée)

Le pipeline lui-même est la maintenance quotidienne principale :

```
18h30 UTC — GitHub Actions déclenche le pipeline
18h30-18h35 — Exécution automatique (download → parse → BDD → IA → ISR)
```

**Vérifications manuelles recommandées** : Consulter les GitHub Actions logs chaque matin de bourse pour s'assurer que le pipeline du soir précédent a réussi.

---

## Maintenance Hebdomadaire

- [ ] Vérifier les logs Railway : erreurs 500 répétées ? Logs d'erreur inhabituels ?
- [ ] Vérifier la taille de la BDD Supabase (limite free tier : 500 MB)
- [ ] Consulter Vercel Analytics : Core Web Vitals, pages lentes
- [ ] Vérifier la consommation Claude API (rester sous 5€/semaine)

---

## Maintenance Mensuelle

### Supabase
- [ ] Vérifier l'espace de stockage (tables + objets)
- [ ] Analyser les requêtes lentes (Supabase Dashboard → Query Performance)
- [ ] Vérifier les index (`EXPLAIN ANALYZE` sur les requêtes fréquentes)
- [ ] Confirmer que les backups automatiques fonctionnent

```sql
-- Requêtes de monitoring utiles
SELECT pg_size_pretty(pg_database_size('postgres')) as db_size;

SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Railway
- [ ] Vérifier les métriques CPU/RAM (Railway Dashboard)
- [ ] Mettre à jour les dépendances Python (`pip list --outdated`)
- [ ] Vérifier les certificats SSL

### Vercel
- [ ] Vérifier les déploiements récents (pas de rollback non voulu)
- [ ] Mettre à jour les variables d'env si nécessaire
- [ ] Vérifier les Edge Functions (si utilisées)

### GitHub Actions
- [ ] Vérifier que le cron tourne bien les jours de bourse
- [ ] Mettre à jour les versions des actions (`actions/checkout@v4`, etc.)

---

## Maintenance Trimestrielle

### Mise à Jour des Dépendances

**Frontend** :
```bash
cd frontend
npx npm-check-updates -u   # Voir les mises à jour disponibles
npm install                 # Appliquer
npm run build               # Vérifier que tout compile
npm run test                # Lancer les tests
```

**Backend** :
```bash
cd backend
pip list --outdated
pip install --upgrade pdfplumber tabula-py fastapi anthropic supabase
pytest                      # Vérifier que les tests passent
```

### Tests de Régression Pipeline

Lancer le pipeline sur 5 BOC historiques pour valider que les mises à jour n'ont pas cassé le parsing :
```bash
for date in 2025-01-15 2025-03-20 2025-06-10 2025-09-05 2025-12-20; do
    python pipeline/run.py --date $date --dry-run --validate
done
```

### Review du Prompt Claude

- Comparer les analyses générées ce trimestre avec les données réelles
- Identifier les patterns d'erreurs récurrents
- Améliorer le prompt si nécessaire
- Documenter les changements dans `backend/ai/CHANGELOG_PROMPT.md`

---

## Maintenance Evolutive — Approche à Long Terme

### Limites à Surveiller

| Ressource | Limite free tier | Action si approché |
|-----------|-----------------|-------------------|
| Supabase BDD | 500 MB | Passer au plan Pro (25$/mois) ou archiver les obligations >1 an |
| Supabase rows | 50 000 | Archiver les données > 2 ans dans du stockage froid |
| Vercel bandwidth | 100 GB/mois | Optimiser les assets, activer le cache CDN |
| GitHub Actions | 2000 min/mois | Le pipeline prend ~3 min/jour = 66 min/mois (largement sous la limite) |

### Scalabilité Données

La BDD grossit de ~250 lignes/jour de bourse (47 actions + indices + analyse).
Estimation croissance :
- 1 an : ~60 000 lignes → ~50 MB
- 3 ans : ~180 000 lignes → ~150 MB
- 5 ans : ~300 000 lignes → ~250 MB

Bien sous les limites du plan gratuit pour les 5 premières années.

---

## Anti-patterns à Éviter

- **Ne pas laisser les logs Railway sans surveillance** : ils saturent et les erreurs passent inaperçues
- **Ne pas ignorer les mises à jour de pdfplumber** : le parsing du BOC dépend de sa version
- **Ne pas modifier le schéma BDD sans migration** : toujours versionner les changements de structure
- **Ne pas mettre à jour Claude Sonnet sans re-valider le prompt** : les nouvelles versions peuvent changer le comportement
