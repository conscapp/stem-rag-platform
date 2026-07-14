"""Startup helpers: BM25 ensure; hosted embeddings need no warm-up."""

from __future__ import annotations

import logging

logger = logging.getLogger("conscrag.startup")


def warm_embedding_model() -> None:
    from app.config import get_settings
    from app.services.embeddings import get_provider

    settings = get_settings()
    provider = get_provider()
    if provider in ("openai", "voyage"):
        logger.info(
            "Using hosted embeddings (%s / %s); no local model load",
            provider,
            settings.embedding_model,
        )
        return

    if not settings.warm_embedding_on_startup:
        logger.info("Skipping local embedding warm-up")
        return

    try:
        from app.services.embeddings import get_embedding_dimension, get_encoder

        dim = get_embedding_dimension()
        _ = get_encoder()
        logger.info("Local embedding model ready (dim=%s)", dim)
    except Exception:
        logger.exception("Local embedding warm-up failed — API still starts")


def ensure_bm25_ready() -> None:
    try:
        from app.services.bm25_index import get_bm25_index
        from app.services.ingest_pipeline import merge_bm25_from_qdrant
        from app.services.retriever import get_qdrant_client

        index = get_bm25_index()
        if index.size > 0:
            logger.info("BM25 index loaded (%s chunks)", index.size)
            return

        logger.warning("BM25 index empty — rebuilding from Qdrant")
        client = get_qdrant_client()
        count = merge_bm25_from_qdrant(client)
        logger.info("BM25 rebuilt with %s chunks", count)
    except Exception:
        logger.exception("BM25 ensure failed (hybrid search may degrade)")
