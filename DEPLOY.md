# conscRAG Production Deploy

Target: **Vercel** (frontend) + **Railway** (backend Docker) + existing **Qdrant Cloud** + **Supabase**.

## Prerequisites

- GitHub repo with this project
- Railway Hobby account (512MB–1GB RAM is enough with hosted embeddings)
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
4. Set memory ~1 GB (raise only if needed).
5. Environment variables (from `deploy/production.env.template`):

```env
QDRANT_URL=
QDRANT_API_KEY=
COLLECTION_NAME=stem_vectors
DEEPSEEK_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ADMIN_API_KEY=
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
HYBRID_SEARCH_ENABLED=true
CORS_ORIGINS=https://conscrag.com,https://www.conscrag.com,https://stem-rag-platform.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

See [docs/EMBEDDINGS.md](docs/EMBEDDINGS.md). **512MB–1GB RAM** is enough with hosted embeddings.

**Current production API:** `https://stem-rag-platform-production.up.railway.app`  
**Current production frontend:** `https://stem-rag-platform.vercel.app`

Paste CORS into Railway → Variables (no secrets), then Save / redeploy if Railway does not auto-redeploy:

```env
CORS_ORIGINS=https://conscrag.com,https://www.conscrag.com,https://stem-rag-platform.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

Optionally ping `https://stem-rag-platform-production.up.railway.app/api/health` every 5 minutes via UptimeRobot.

6. Deploy and wait for first boot (model is baked in the image; healthcheck start period is long).
7. Public HTTPS URL (this project): `https://stem-rag-platform-production.up.railway.app`

Verify:

```bash
curl https://stem-rag-platform-production.up.railway.app/api/health
```

Expect `"qdrant":"ok"` and `"supabase":"ok"`.

---

## Cold starts vs slow answers

Do **not** confuse a slow first answer with the website “cold starting.”

| Piece | Hobby behavior | Typical time |
|-------|----------------|--------------|
| **Vercel homepage** | CDN / serverless; usually warm | **1–5 seconds** — **not** 1–2 minutes |
| **Railway API** | Hobby stays warmer than the old free trial | Usually ready if the service is running |
| **First `/api/query`** | Calls OpenAI + DeepSeek + multi-agent pipeline | **10–60+ seconds** — LLM/agent time, not site wake |

| What you feel | Usual cause |
|---------------|-------------|
| Homepage blank / spinning briefly | Rare Vercel cold start (**1–5s**) |
| `/create` spinner for a long time | Normal query latency (**10–60+s**) |
| API “dead” after long idle | Old free-trial sleep; Hobby is warmer — still use a ping |

**Mitigation:** Optional free [UptimeRobot](https://uptimerobot.com) HTTP(s) monitor every **5 minutes** to:

`https://stem-rag-platform-production.up.railway.app/api/health`

(no auth needed). This keeps the API path warm and alerts you if health fails.

Do **not** upgrade Vercel just for “1–2 minute site starts” — that delay is almost never the Next.js app itself.

## 3. Vercel (frontend)

**Live production URL:** https://stem-rag-platform.vercel.app

1. Import the same GitHub repo (or deploy from `frontend/` with Vercel CLI).
2. **Root Directory:** `frontend`
3. Framework: Next.js (uses `frontend/vercel.json`)
4. Environment variable (Production + Preview):

```env
NEXT_PUBLIC_API_URL=https://stem-rag-platform-production.up.railway.app
```

No trailing slash. Same host that returns 200 on `/api/health`.

5. Redeploy after setting the env var. Open https://stem-rag-platform.vercel.app/create and run a short query.

**Expect:** homepage in about **1–5s**; first answer on `/create` may take **10–60+ seconds** (LLM/agents). That is not a Vercel cold start.

---

## 4. Custom domain (conscrag.com)

### Frontend

**Configured on Vercel (2026-07-15):** `conscrag.com` and `www.conscrag.com` → project **stem-rag-platform**.

At your DNS provider (registrar nameservers: `registrar-servers.com`), add:

| Type | Host | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| A | `www` | `76.76.21.21` |

Or switch nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.

Railway `CORS_ORIGINS` already includes `https://conscrag.com` and `https://www.conscrag.com`. No backend change required for the custom frontend domain.

### API (optional)

1. Railway → Custom domain → `api.conscrag.com`
2. CNAME to Railway’s target.
3. Set `NEXT_PUBLIC_API_URL=https://api.conscrag.com` on Vercel and redeploy.
4. Update `CORS_ORIGINS` on Railway to include `https://conscrag.com,https://www.conscrag.com`.

---

## 5. Smoke test

```bash
cd backend
python scripts/smoke_prod.py --base-url https://stem-rag-platform-production.up.railway.app
```

Or use the checklist in [LAUNCH.md](LAUNCH.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OOM / crash loop | Raise RAM slightly; confirm EMBEDDING_PROVIDER=openai/voyage (not local) |
| CORS errors in browser | Add exact frontend origin to `CORS_ORIGINS`; set `CORS_ORIGIN_REGEX` for Vercel previews |
| Empty / weak answers | Re-run `ingest_premium.py --fresh` with same embedding provider as Railway |
| Health supabase error | Service role key + migrations applied |
| Slow first request | Normal for LLM; embeddings are API calls now |
