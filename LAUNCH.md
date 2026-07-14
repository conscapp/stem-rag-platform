# conscRAG Launch Checklist — The consc company (conscrag.com)

## What conscRAG Is

**Company:** The consc company · **Product:** conscRAG · **Domain:** conscrag.com

**3 innovation domains:** Aerospace · Nanotechnology · Nuclear Fusion (`clean_energy`)  
**4 STEM subjects:** Physics · Chemistry · Math · Engineering  
**4 polymath agents:** Interpreter → Navigator → Connector → Synthesizer  
**Retrieval:** Hybrid search (BGE-M3 dense + BM25) over premium + STEM knowledge

## Multi-Agent Architecture

```
User plain-language idea + Domain
        │
        ▼
┌───────────────────┐
│ 1. Interpreter    │  Restate hunch → technical query + search terms
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 2. Navigator      │  Hybrid RAG (ontology-aware, multi-query)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 3. Connector      │  Cross-STEM links + gaps (no Pass/Fail)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 4. Synthesizer    │  Exploration paths + what's missing
└───────────────────┘
```

Agents never say possible/impossible — only evidence and retrieval gaps.

## Pre-Launch Steps

### 1. Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Required in `backend/.env`:
- `QDRANT_URL`, `QDRANT_API_KEY`
- `DEEPSEEK_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `ADMIN_API_KEY` (strong secret for review queue)
- `CORS_ORIGINS` (production frontend URLs)
- `CORS_ORIGIN_REGEX` (optional; e.g. `https://.*\\.vercel\\.app`)
- `EMBEDDING_MODEL=BAAI/bge-m3`, `HYBRID_SEARCH_ENABLED=true`

### 2. Database (Supabase SQL Editor)

Run in order on the **production** project:
1. [`supabase/schema.sql`](supabase/schema.sql)
2. [`supabase/migration_domain.sql`](supabase/migration_domain.sql)
3. [`supabase/migration_legal_consent.sql`](supabase/migration_legal_consent.sql)

### 3. Knowledge Base

Uses the same Qdrant Cloud collection for local and production (no re-ingest required if already filled).

```bash
cd backend
.\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python scripts/ingest_premium.py --fresh
```

Optional growth: `scripts/fetch_ntrs.py`, `scripts/fetch_arxiv.py --all-subjects`, then ingest again.

### 4. Local smoke test

```bash
# Backend
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

Test at http://localhost:3000/create:
- Domain: Nuclear Fusion
- Query: "nuclear energy at room temperature — what conditions would matter?"
- Confirm Interpreter restatement + Navigator / Connector / Synthesizer sections
- Confirm sources cite seed/premium content; no Pass/Fail verdict

Also: `GET http://127.0.0.1:8000/api/health` → `qdrant` and `supabase` ok.

### 5. Deploy

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Root: `frontend`, set `NEXT_PUBLIC_API_URL` |
| Backend | Railway | Repo root + `backend/Dockerfile`, **≥4 GB RAM** |
| Vectors | Qdrant Cloud | Same collection as local ingest |
| DB | Supabase | Free tier OK for beta |

See [`DEPLOY.md`](DEPLOY.md) for step-by-step Railway/Vercel/DNS.

Update `CORS_ORIGINS` on backend with `https://conscrag.com,https://www.conscrag.com` and your Vercel URL.

## Production smoke checklist

After deploy, run [`backend/scripts/smoke_prod.py`](backend/scripts/smoke_prod.py) or manually:

- [ ] `GET /api/health` → status ok
- [ ] `POST /api/query` lay fusion/aerospace query returns `agents[]` + `sources[]`
- [ ] `/create` requires terms + publish consent
- [ ] Submit post → pending (or novelty reject)
- [ ] Admin approve with `X-Admin-Key`

## Post-Launch: Growing the Database

1. Fetch/add premium markdown under `data/premium/`
2. Expand `data/ontology/stem_concepts.yaml`
3. Re-run `python scripts/ingest_premium.py --fresh` (points at same Qdrant)
4. Redeploy backend only if BM25 file must refresh in the image (or rely on boot rebuild from Qdrant)

## Cost Estimate (Beta)

| Service | Monthly |
|---------|---------|
| Qdrant Cloud free | $0 |
| Supabase free | $0 |
| Vercel free | $0 |
| Railway (4GB+) | paid tier typical |
| DeepSeek (multi-agent queries) | ~$10–25 |

## API

`POST /api/query`
```json
{
  "query": "other hydrogen isotope for fusion?",
  "domain": "clean_energy",
  "subject": null,
  "proof_mode": false
}
```

Response includes `interpreter_restatement`, `agents[]` trace, and `sources[]` citations.
