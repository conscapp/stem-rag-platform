"""Embedding providers: OpenAI, Voyage (hosted), or local SentenceTransformers."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

import httpx
from openai import OpenAI

from app.config import get_settings

Provider = Literal["openai", "voyage", "local"]

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class EmbeddingError(RuntimeError):
    pass


def get_provider() -> Provider:
    settings = get_settings()
    raw = (settings.embedding_provider or "openai").strip().lower()
    if raw not in ("openai", "voyage", "local"):
        raise EmbeddingError(
            f"Unknown EMBEDDING_PROVIDER={raw!r}; use openai, voyage, or local"
        )
    return raw  # type: ignore[return-value]


@lru_cache
def get_embedding_dimension() -> int:
    settings = get_settings()
    if settings.embedding_dimensions > 0:
        return settings.embedding_dimensions

    provider = get_provider()
    if provider == "openai":
        # text-embedding-3-* support Matryoshka; default truncated size from config
        return 1024
    if provider == "voyage":
        # voyage-3-large / voyage-3.5 default output is 1024
        return 1024
    # local: probe model
    encoder = _get_local_encoder()
    if hasattr(encoder, "get_sentence_embedding_dimension"):
        return int(encoder.get_sentence_embedding_dimension())
    return 1024


def _get_openai_client() -> OpenAI:
    settings = get_settings()
    api_key = settings.openai_api_key or settings.embedding_api_key
    if not api_key:
        raise EmbeddingError(
            "OPENAI_API_KEY (or EMBEDDING_API_KEY) is required when EMBEDDING_PROVIDER=openai"
        )
    return OpenAI(api_key=api_key, base_url=settings.openai_base_url or None)


def _openai_embed(texts: list[str], *, is_query: bool = False) -> list[list[float]]:
    settings = get_settings()
    client = _get_openai_client()
    # OpenAI embeddings API doesn't use query prefix the same way; optional instruction prefix
    payload = []
    for t in texts:
        if is_query and settings.embedding_query_prefix:
            payload.append(f"{QUERY_PREFIX}{t}")
        else:
            payload.append(t)

    kwargs: dict = {
        "model": settings.embedding_model,
        "input": payload,
    }
    if settings.embedding_dimensions > 0:
        kwargs["dimensions"] = settings.embedding_dimensions

    # Batch in chunks of 64 to stay under request limits
    vectors: list[list[float]] = []
    batch_size = 64
    for i in range(0, len(payload), batch_size):
        batch = payload[i : i + batch_size]
        kwargs["input"] = batch
        resp = client.embeddings.create(**kwargs)
        ordered = sorted(resp.data, key=lambda d: d.index)
        vectors.extend([list(d.embedding) for d in ordered])
    return vectors


def _voyage_embed(texts: list[str], *, is_query: bool = False) -> list[list[float]]:
    settings = get_settings()
    api_key = settings.voyage_api_key or settings.embedding_api_key
    if not api_key:
        raise EmbeddingError(
            "VOYAGE_API_KEY (or EMBEDDING_API_KEY) is required when EMBEDDING_PROVIDER=voyage"
        )

    input_type = "query" if is_query else "document"
    url = "https://api.voyageai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    vectors: list[list[float]] = []
    batch_size = 64
    with httpx.Client(timeout=120.0) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            body: dict = {
                "input": batch,
                "model": settings.embedding_model,
                "input_type": input_type,
            }
            if settings.embedding_dimensions > 0:
                body["output_dimension"] = settings.embedding_dimensions
            resp = client.post(url, headers=headers, json=body)
            if resp.status_code >= 400:
                raise EmbeddingError(f"Voyage embeddings error {resp.status_code}: {resp.text[:500]}")
            data = resp.json()
            items = data.get("data") or []
            ordered = sorted(items, key=lambda d: d.get("index", 0))
            vectors.extend([list(d["embedding"]) for d in ordered])
    return vectors


@lru_cache
def _get_local_encoder():
    settings = get_settings()
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise EmbeddingError(
            "Local embeddings require sentence-transformers. "
            "pip install -r requirements-local.txt or switch EMBEDDING_PROVIDER to openai/voyage"
        ) from exc
    return SentenceTransformer(
        settings.embedding_model,
        device="cpu",
        model_kwargs={"low_cpu_mem_usage": True},
    )


def _local_embed(texts: list[str], *, is_query: bool = False) -> list[list[float]]:
    settings = get_settings()
    encoder = _get_local_encoder()
    prepared = []
    for t in texts:
        if is_query and settings.embedding_query_prefix:
            prepared.append(f"{QUERY_PREFIX}{t}")
        else:
            prepared.append(t)
    vectors = encoder.encode(
        prepared,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=len(prepared) > 50,
    )
    return [v.tolist() for v in vectors]


def embed_texts(texts: list[str], *, is_query: bool = False) -> list[list[float]]:
    if not texts:
        return []
    provider = get_provider()
    if provider == "openai":
        return _openai_embed(texts, is_query=is_query)
    if provider == "voyage":
        return _voyage_embed(texts, is_query=is_query)
    return _local_embed(texts, is_query=is_query)


def embed_query(text: str) -> list[float]:
    return embed_texts([text], is_query=True)[0]


def embed_document(text: str) -> list[float]:
    return embed_texts([text], is_query=False)[0]


def embed_documents(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    # batch_size kept for API compatibility with ingest_pipeline
    _ = batch_size
    return embed_texts(texts, is_query=False)


def get_encoder():
    """Backward-compatible helper for novelty collection sizing / local only."""
    provider = get_provider()
    if provider == "local":
        return _get_local_encoder()

    class _DimOnly:
        def get_sentence_embedding_dimension(self) -> int:
            return get_embedding_dimension()

    return _DimOnly()
