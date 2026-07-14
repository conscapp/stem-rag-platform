# conscRAG

Turn intuition into innovation — **aerospace**, **nanotechnology**, and **nuclear fusion** — powered by a polymath agent pipeline across physics, chemistry, math, and engineering.

**The consc company** · [conscrag.com](https://conscrag.com)

## Multi-Agent Pipeline

```
Interpreter → Navigator → Connector → Synthesizer
```

| Agent | Role |
|-------|------|
| **Interpreter** | Plain language → technical query + search terms |
| **Navigator** | Hybrid RAG (hosted embeddings + BM25) with ontology routing |
| **Connector** | Cross-STEM links and gaps (no Pass/Fail) |
| **Synthesizer** | Exploration paths + what evidence is missing |

See [LAUNCH.md](LAUNCH.md) and [DEPLOY.md](DEPLOY.md) for launch and production deploy.

## Architecture

```
User (Next.js) → FastAPI → 4 Agents → DeepSeek API
                    ↓
         Qdrant Cloud (vectors) + BM25 + Supabase (posts)
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Qdrant Cloud](https://cloud.qdrant.io) free account (or Docker for local Qdrant)
- [Supabase](https://supabase.com) free account
- [DeepSeek API](https://platform.deepseek.com) key (~$5 credit)

### 1. Clone and configure

```bash
cd stem-rag-platform
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env` with your credentials (see `.env.example`).

### 2. Set up Supabase

Run in order in the SQL Editor:
1. [`supabase/schema.sql`](supabase/schema.sql)
2. [`supabase/migration_domain.sql`](supabase/migration_domain.sql)
3. [`supabase/migration_legal_consent.sql`](supabase/migration_legal_consent.sql)

### 3. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Ingest seed + premium knowledge (hybrid BM25 index included)
python scripts/ingest_premium.py --fresh

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Grow the knowledge base (optional)

```bash
cd backend
python scripts/fetch_ntrs.py --all-domains --max 20
python scripts/fetch_arxiv.py --all-subjects --max 30
python scripts/ingest_premium.py --fresh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/query` | Polymath query `{ query, domain, subject?, proof_mode? }` |
| GET | `/api/posts` | List approved innovations |
| POST | `/api/posts` | Submit innovation (terms + publish consent required) |

API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## Deployment

**Frontend:** Vercel — root `frontend`, set `NEXT_PUBLIC_API_URL`.  
**Backend:** Railway — Docker from repo root (`Dockerfile`), **small RAM OK** with hosted OpenAI/Voyage embeddings.

Full steps: [DEPLOY.md](DEPLOY.md). Go-live checkbox list: [GO_LIVE.md](GO_LIVE.md). Embeddings: [docs/EMBEDDINGS.md](docs/EMBEDDINGS.md).

### Local Qdrant (alternative to cloud)

```bash
docker compose up -d
# Set QDRANT_URL=http://localhost:6333 in backend/.env
```

## Cost Estimate (Beta)

| Service | Monthly Cost |
|---------|-------------|
| Qdrant Cloud free tier | $0 |
| Supabase free tier | $0 |
| Vercel free tier | $0 |
| Railway (small API; hosted embeddings) | low |
| OpenAI or Voyage embeddings | pay-per-use |
| DeepSeek API (multi-agent queries) | ~$10–25 |

## Project Structure

```
stem-rag-platform/
├── backend/          # FastAPI RAG API + Dockerfile
│   ├── app/          # Application code
│   └── scripts/      # Ingest, fetch, smoke
├── frontend/         # Next.js web app
├── data/
│   ├── seed/         # STEM fundamentals + domains
│   ├── premium/      # NTRS, arXiv, patents, failed research
│   ├── ontology/     # Information-science concept links
│   └── index/        # BM25 sparse index
└── supabase/         # Database schema + migrations
```

## License

MIT — see [LICENSE](LICENSE).

## Funding

Support this project via [Open Collective](https://opencollective.com) or [GitHub Sponsors](https://github.com/sponsors).
