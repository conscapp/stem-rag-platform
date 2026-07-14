"""Startup helpers for production: warm embeddings + ensure BM25 index."""

from __future__ import annotations

import logging

logger = logging.getLogger("conscrag.startup")


def warm_embedding_model() -> None:
    try:
        from app.services.embeddings import get_encoder, get_embedding_dimension

        dim = get_embedding_dimension()
        _ = get_encoder()
        logger.info("Embedding model ready (dim=%s)", dim)
    except Exception:
        logger.exception("Failed to warm embedding model")
        raise


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
