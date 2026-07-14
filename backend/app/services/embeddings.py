"""High-performance dense embeddings with BGE query instructions."""

from __future__ import annotations

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import get_settings

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
DOC_PREFIX = ""


@lru_cache
def get_encoder() -> SentenceTransformer:
    settings = get_settings()
    return SentenceTransformer(settings.embedding_model)


def get_embedding_dimension() -> int:
    encoder = get_encoder()
    if hasattr(encoder, "get_embedding_dimension"):
        return encoder.get_embedding_dimension()
    return encoder.get_sentence_embedding_dimension()


def embed_query(text: str) -> list[float]:
    settings = get_settings()
    encoder = get_encoder()
    prefixed = f"{QUERY_PREFIX}{text}" if settings.embedding_query_prefix else text
    return encoder.encode(prefixed, normalize_embeddings=True).tolist()


def embed_document(text: str) -> list[float]:
    encoder = get_encoder()
    prefixed = f"{DOC_PREFIX}{text}" if DOC_PREFIX else text
    return encoder.encode(prefixed, normalize_embeddings=True).tolist()


def embed_documents(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    encoder = get_encoder()
    vectors = encoder.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=len(texts) > 50,
    )
    return [v.tolist() for v in vectors]
