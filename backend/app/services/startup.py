"""Startup helpers for production: optional embedding warm + BM25 ensure."""

from __future__ import annotations

import logging

logger = logging.getLogger("conscrag.startup")


def warm_embedding_model() -> None:
    """Load embedding weights. Never crash the API if this fails (OOM / download)."""
    from app.config import get_settings

    settings = get_settings()
    if not settings.warm_embedding_on_startup:
        logger.info(
            "Skipping embedding warm-up (WARM_EMBEDDING_ON_STARTUP=false); "
            "model loads on first query"
        )
        return

    try:
        from app.services.embeddings import get_encoder, get_embedding_dimension

        dim = get_embedding_dimension()
        _ = get_encoder()
        logger.info("Embedding model ready (dim=%s)", dim)
    except Exception:
        logger.exception(
            "Embedding warm-up failed — API will start anyway; "
            "queries may fail until memory/model is fixed"
        )


def ensure_bm25_ready() -> None:
    """Load BM25 from disk; if empty, rebuild from Qdrant."""
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
