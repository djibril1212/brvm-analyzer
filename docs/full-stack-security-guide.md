# Guide de Sécurité — BRVM Daily Analyzer

## Principes Fondamentaux

1. Jamais de clés API en dur dans le code
2. RLS activé sur toutes les tables Supabase
3. Le backend (Railway) est la seule couche avec accès service_role
4. Le frontend n'accède à Supabase qu'avec la clé anon (lecture publique uniquement)
5. Rate limiting sur tous les endpoints publics

---

## 1. Gestion des Credentials

### Variables d'Environnement

**Backend (Railway)** :
```env
ANTHROPIC_API_KEY=sk-ant-...          # Ne jamais exposer côté frontend
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # Accès complet BDD — backend uniquement
BRVM_BOC_URL=https://brvm.org/...
PIPELINE_SECRET=...                    # Secret pour déclencher le pipeline via webhook
```

**Frontend (Vercel)** :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Lecture seule, publique
NEXT_PUBLIC_API_URL=https://api.brvm-analyzer.com
```

**Règles** :
- `.env`, `.env.local`, `.env.production` dans `.gitignore`
- Variables sensibles définies dans Vercel Dashboard et Railway Settings, jamais dans le code
- Rotation de la clé Anthropic si elle est accidentellement exposée dans un commit

---

## 2. Sécurité Base de Données (Supabase)

### Row Level Security (RLS)

Toutes les tables ont RLS activé. Politique par défaut : lecture publique, écriture réservée au service_role.

```sql
-- Exemple : table stock_daily
ALTER TABLE stock_daily ENABLE ROW LEVEL SECURITY;

-- Lecture publique (frontend avec clé anon)
CREATE POLICY "stock_daily_read_public"
ON stock_daily FOR SELECT
USING (true);

-- Écriture réservée au backend (service_role bypasse RLS)
-- Aucune politique INSERT/UPDATE/DELETE pour les utilisateurs anonymes
```

### Protection contre l'Énumération

Utiliser des UUIDs pour tous les IDs primaires (pas d'IDs numériques séquentiels) :
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
```

### Requêtes Paramétrées

Toujours utiliser les paramètres Supabase, jamais de concaténation de chaînes :
```python
# Correct
result = supabase.table('stock_daily').select('*').eq('date', session_date).execute()

# INTERDIT
query = f"SELECT * FROM stock_daily WHERE date = '{session_date}'"
```

---

## 3. Sécurité API (FastAPI)

### Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/daily/{date}")
@limiter.limit("60/minute")
async def get_daily(date: str, request: Request):
    ...
```

Limites recommandées :
- Endpoints publics : 60 req/min par IP
- Endpoint /api/analysis : 30 req/min (réponses plus lourdes)
- Endpoint /api/picks : 30 req/min

### Validation des Inputs

```python
from pydantic import BaseModel, validator
import re

class DateParam(BaseModel):
    date: str

    @validator('date')
    def validate_date_format(cls, v):
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('Format invalide. Utiliser YYYY-MM-DD')
        return v
```

### CORS

Restreindre les origines autorisées :
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://brvm-analyzer.com", "https://www.brvm-analyzer.com"],
    allow_methods=["GET"],  # API publique en lecture seule
    allow_headers=["*"],
)
```

---

## 4. Sécurité Pipeline (GitHub Actions)

### Protection du Cron

Le webhook de déclenchement manuel du pipeline est protégé par un secret :
```python
# Vérification du secret dans l'endpoint de déclenchement
def verify_pipeline_secret(request: Request) -> bool:
    secret = request.headers.get("X-Pipeline-Secret")
    return hmac.compare_digest(secret or "", settings.PIPELINE_SECRET)
```

### Gitignore

```gitignore
# Credentials
.env
.env.local
.env.production
.env.staging
*.pem
*.key

# Python
__pycache__/
*.pyc
.venv/

# Node
node_modules/
.next/

# BOC PDFs (données brutes, ne pas commiter)
backend/data/raw/*.pdf
```

---

## 5. Sécurité Frontend (Next.js)

### Données Exposées

Le frontend ne doit jamais exposer :
- La clé service_role Supabase
- La clé Anthropic
- Les données personnelles utilisateurs (v2)

### Headers de Sécurité (next.config.js)

```js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

---

## 6. Disclaimer Légal (Obligatoire)

Chaque page du dashboard doit afficher :

> "Les analyses présentées ne constituent pas un conseil en investissement. Investir comporte des risques de perte en capital. BRVM Daily Analyzer est un outil d'information et non un service de conseil financier réglementé."

Ce disclaimer doit apparaître :
- Dans le footer de chaque page
- En en-tête de la section "Top Picks"
- Dans les CGU (Conditions Générales d'Utilisation)

---

## 7. Monitoring de Sécurité

- Activer les alertes Supabase pour les requêtes inhabituelles
- Logger tous les appels au pipeline (date, durée, succès/échec)
- Surveiller la consommation Claude API (alertes si >10€/mois)
- Vérifier les logs Railway pour les erreurs 4xx/5xx répétées
