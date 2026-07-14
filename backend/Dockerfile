# Prefer repository-root Dockerfile on Railway.
# This copy stays for local `docker build -f backend/Dockerfile` from repo root.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    EMBEDDING_PROVIDER=openai \
    EMBEDDING_MODEL=text-embedding-3-large \
    EMBEDDING_DIMENSIONS=1024 \
    HYBRID_SEARCH_ENABLED=true \
    BM25_INDEX_PATH=data/index/bm25_corpus.json

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/backend/requirements.txt

COPY backend/app /app/backend/app
COPY backend/Procfile /app/backend/Procfile
COPY data/ontology /app/data/ontology
COPY data/index /app/data/index

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
