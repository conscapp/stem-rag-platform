# conscRAG Production Deploy

Target: **Vercel** (frontend) + **Railway** (backend Docker) + existing **Qdrant Cloud** + **Supabase**.

## Prerequisites

- GitHub repo with this project
- Railway account with a service that has **≥4 GB RAM**
- Vercel account
- DNS control for `conscrag.com` (optional for first preview)

Rotate any API keys that were ever pasted into chat before production.

---

## 1. Supabase (production project)

In SQL Editor, run in order:

1. `supabase/schema.sql`
2. `supabase/migration_domain.sql`
3. `supabase/migration_legal_consent.sql`

Confirm `public_posts` has `terms_accepted_at`, `terms_version`, `publish_consent`, `domain`.

---

## 2. Railway (API)

1. **New project** → Deploy from GitHub → select this repo.
2. **Root directory:** leave empty (repository root).
3. Build uses [`backend/Dockerfile`](backend/Dockerfile) via [`railway.toml`](railway.toml).
4. Set **memory ≥ 4 GB**.
5. Environment variables (from `backend/.env.example`):

```env
QDRANT_URL=
QDRANT_API_KEY=
COLLECTION_NAME=stem_vectors
DEEPSEEK_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ADMIN_API_KEY=  # generate a long random string
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_QUERY_PREFIX=true
HYBRID_SEARCH_ENABLED=true
CORS_ORIGINS=https://conscrag.com,https://www.conscrag.com
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

After Vercel gives a stable URL, add it to `CORS_ORIGINS` exactly (e.g. `https://stem-rag-platform.vercel.app`).

6. Deploy and wait for first boot (model is baked in the image; healthcheck start period is long).
7. Copy the public HTTPS URL → e.g. `https://conscrag-api.up.railway.app`

Verify:

```bash
curl https://YOUR-RAILWAY-URL/api/health
```

Expect `"qdrant":"ok"` and `"supabase":"ok"`.

---

## 3. Vercel (frontend)

1. Import the same GitHub repo.
2. **Root Directory:** `frontend`
3. Framework: Next.js (uses `frontend/vercel.json`)
4. Environment variable:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL
```

5. Deploy. Open the Vercel URL and run a query on `/create`.

---

## 4. Custom domain (conscrag.com)

### Frontend

1. Vercel → Project → Domains → add `conscrag.com` and `www.conscrag.com`.
2. At your DNS provider, add the records Vercel shows (usually A/CNAME).

### API (optional)

1. Railway → Custom domain → `api.conscrag.com`
2. CNAME to Railway’s target.
3. Set `NEXT_PUBLIC_API_URL=https://api.conscrag.com` on Vercel and redeploy.
4. Update `CORS_ORIGINS` on Railway to include `https://conscrag.com,https://www.conscrag.com`.

---

## 5. Smoke test

```bash
cd backend
python scripts/smoke_prod.py --base-url https://YOUR-RAILWAY-URL
```

Or use the checklist in [LAUNCH.md](LAUNCH.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OOM / crash loop | Raise Railway memory to 4–8 GB |
| CORS errors in browser | Add exact frontend origin to `CORS_ORIGINS`; set `CORS_ORIGIN_REGEX` for Vercel previews |
| Empty / weak answers | Confirm Railway uses same `QDRANT_*` as local ingest; check BM25 rebuild logs on boot |
| Health supabase error | Service role key + migrations applied |
| Slow first request | Image should pre-download BGE-M3; check build logs |
