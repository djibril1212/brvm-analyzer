# Environnements de Développement — BRVM Daily Analyzer

## Les 3 Environnements

### Développement (Local)

**Objectif** : Développer et tester rapidement sans impacter les données réelles.

**Configuration** :
- Frontend : `localhost:3000` (Next.js dev server)
- Backend : `localhost:8000` (FastAPI uvicorn --reload)
- Base de données : Supabase projet de développement séparé (ou branche Supabase)
- Pipeline : exécution manuelle via `python pipeline/run.py --date 2026-03-20`
- Claude API : appels réels mais limités (utiliser des BOC historiques, pas le BOC du jour)

**Variables d'env** (`.env.local` / `.env`) :
```env
SUPABASE_URL=https://xxx-dev.supabase.co
ANTHROPIC_API_KEY=sk-ant-...  # Clé de dev (budget limité)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Données de test** :
- `backend/tests/fixtures/` : 5 BOC PDF historiques
- `backend/tests/fixtures/seed.sql` : données de séance pré-insérées pour le frontend

**Vibe** : Expérimentation libre. Les erreurs de parsing n'ont pas de conséquences.

---

### Staging (Vercel Preview + Railway Staging)

**Objectif** : Valider le pipeline complet avant de déployer en production.

**Configuration** :
- Frontend : URL preview Vercel automatique sur chaque PR
- Backend : service Railway dédié "staging" (identique à prod, données séparées)
- Base de données : projet Supabase "staging" avec données réelles anonymisées
- Pipeline : cron désactivé, exécution manuelle pour les tests

**Checklist avant de passer en staging** :
- [ ] Parser testé sur les 5 BOC de référence
- [ ] Analyse IA validée (pas d'hallucination sur 3 BOC tests)
- [ ] Tous les endpoints API répondent correctement
- [ ] Dashboard mobile testé (Chrome DevTools + vrai device)
- [ ] ISR revalidation testée (TTL configuré)
- [ ] Variables d'env staging configurées dans Vercel/Railway

**Vibe** : Vérification méthodique. Chaque feature testée dans les conditions réelles.

---

### Production

**Objectif** : Servir les utilisateurs finaux avec des données BRVM exactes chaque jour de bourse.

**Configuration** :
- Frontend : `brvm-analyzer.com` (Vercel, CDN global)
- Backend : Railway production (redémarrage automatique, logs)
- Base de données : Supabase production (backups automatiques quotidiens)
- Pipeline : GitHub Actions cron `30 18 * * 1-5` (18h30 UTC, lundi-vendredi)
- Claude API : clé production avec limite de budget configurée

**Règles strictes** :
- Toute modification de la structure BDD doit passer par une migration versionnée
- Ne jamais modifier le prompt Claude en production sans test staging
- Le pipeline ne s'exécute que sur les jours de bourse BRVM
- Tout échec pipeline génère un log persistant dans Supabase (`pipeline_logs`)

**Monitoring** :
- Vercel Analytics : trafic et Core Web Vitals
- Railway logs : erreurs backend et pipeline
- Supabase dashboard : taille BDD, requêtes lentes
- GitHub Actions : statut des runs du pipeline

**Vibe** : Stabilité et fiabilité. Les utilisateurs comptent sur les données chaque soir.

---

## Flux Dev → Staging → Production

```
Code local (dev)
    ↓ git push → PR
Preview Vercel (staging auto)
    ↓ tests OK + review
Merge main → Deploy production automatique
    ↓
Pipeline GitHub Actions s'exécute chaque soir de bourse
```

---

## Checklist Dev → Staging

- [ ] Tests unitaires Python passent (`pytest backend/`)
- [ ] Parser validé sur les 5 BOC de référence
- [ ] `npm run build` sans erreur (frontend)
- [ ] Variables d'env staging configurées
- [ ] Migration BDD appliquée sur Supabase staging
- [ ] Tester le pipeline manuellement en staging : `python pipeline/run.py --date YYYY-MM-DD`
- [ ] Vérifier l'analyse IA générée (cohérence des chiffres)
- [ ] Tester toutes les pages du dashboard sur mobile

## Checklist Staging → Production

- [ ] Pipeline complet testé end-to-end en staging
- [ ] Analyse IA validée sur 3 BOC récents
- [ ] Pas de régression sur les pages existantes
- [ ] Migration BDD prête pour production
- [ ] Variables d'env production vérifiées
- [ ] Cron GitHub Actions configuré et testé
- [ ] Backup Supabase vérifié
- [ ] Rollback plan documenté

---

## Anti-patterns à Éviter

- **Tester en production** : Ne jamais modifier le prompt Claude directement en prod
- **Données réelles en dev** : Ne pas utiliser la BDD production pour développer
- **Pipeline cron en staging** : Désactiver le cron automatique sur les envs non-prod
- **Clés API partagées** : Chaque environnement a ses propres clés Anthropic et Supabase
