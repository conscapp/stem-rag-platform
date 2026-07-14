# Hosted embeddings (production)

conscRAG uses **OpenAI** or **Voyage** embedding APIs so Railway stays small (no PyTorch).

## Default (OpenAI)

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
```

## Voyage alternative

```env
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=pa-...
EMBEDDING_MODEL=voyage-3-large
EMBEDDING_DIMENSIONS=1024
```

## After switching providers

You **must** rebuild the vector index (old BGE vectors are incompatible):

```powershell
cd C:\Users\Martin-PC\Projects\stem-rag-platform\backend
# Put the same EMBEDDING_* vars in backend\.env
.\.venv\Scripts\python.exe scripts\ingest_premium.py --fresh
```

Then redeploy Railway. Small memory plan is enough.

## Local BGE (dev only)

```env
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=BAAI/bge-large-en-v1.5
EMBEDDING_QUERY_PREFIX=true
```

```powershell
pip install -r requirements-local.txt
```
