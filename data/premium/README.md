# Premium Knowledge Base

Curated high-value sources for conscRAG polymath retrieval.

## Layout

```
data/premium/
├── ntrs/              # NASA Technical Report Server (fetch_ntrs.py)
├── academic/          # arXiv open preprints (fetch_arxiv.py)
├── patents/           # Patent summaries with claims context
└── failed_research/   # Negative results & lessons learned
```

## Fetch premium sources

```bash
cd backend
pip install -r requirements.txt

# NASA NTRS — all three domains
python scripts/fetch_ntrs.py --all-domains --max 15

# arXiv preprints
python scripts/fetch_arxiv.py --all-domains --max 15
```

## Ingest (semantic chunking + hosted embeddings + BM25 hybrid index)

```bash
python scripts/ingest_premium.py --fresh
```

`--premium-only` ingests only `data/premium/` without re-loading fundamentals.

## Metadata fields (per chunk)

| Field | Purpose |
|-------|---------|
| `source_type` | ntrs, academic, patent, failed_research |
| `source_tier` | premium |
| `outcome` | success, failed, inconclusive, unknown |
| `concepts` | ontology tags incl. lesson_learned, failed_experiment |
| `section_heading` | semantic section from document structure |

## Hybrid search

Dense vectors (OpenAI or Voyage) + BM25 sparse index with reciprocal rank fusion.
Configured via `HYBRID_SEARCH_ENABLED=true` in `backend/.env`.
