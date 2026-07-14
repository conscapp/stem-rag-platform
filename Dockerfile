# Build from repository root (Railway default):
#   docker build -f Dockerfile .
#
# Do NOT set Railway "Root Directory" to backend — leave it empty.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence-transformers \
    EMBEDDING_MODEL=BAAI/bge-m3 \
    EMBEDDING_QUERY_PREFIX=true \
    HYBRID_SEARCH_ENABLED=true \
    BM25_INDEX_PATH=data/index/bm25_corpus.json

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt

# CPU-only PyTorch first (much smaller / more reliable on Railway than CUDA wheels)
RUN pip install --upgrade pip \
    && pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r /app/backend/requirements.txt

COPY backend/app /app/backend/app
COPY backend/Procfile /app/backend/Procfile
COPY data/ontology /app/data/ontology
COPY data/index /app/data/index

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

# Model downloads on first boot via lifespan — allow a long start window
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/api/health" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
