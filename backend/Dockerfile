# Build from repository root:
#   docker build -f backend/Dockerfile .
# Railway: set Root Directory empty, Dockerfile path backend/Dockerfile

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence-transformers \
    EMBEDDING_MODEL=BAAI/bge-m3 \
    HYBRID_SEARCH_ENABLED=true \
    BM25_INDEX_PATH=data/index/bm25_corpus.json

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/backend/requirements.txt

# Pre-download embedding model so first request is not a cold HF pull
RUN python -c "from sentence_transformers import SentenceTransformer; import os; SentenceTransformer(os.environ.get('EMBEDDING_MODEL', 'BAAI/bge-m3'))"

COPY backend/app /app/backend/app
COPY backend/Procfile /app/backend/Procfile
COPY data/ontology /app/data/ontology
COPY data/index /app/data/index

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/api/health" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
