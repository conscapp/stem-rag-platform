"""Vector + BM25 hybrid retrieval with domain-aware balancing."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.config import get_settings
from app.constants import VALID_DOMAINS
from app.models.schemas import SourceChunk
from app.services.bm25_index import get_bm25_index
from app.services.embeddings import embed_query
from app.services.information_science import expand_query_for_retrieval
from app.services.ontology import get_ontology, shannon_entropy, word_overlap_ratio


@lru_cache
def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)


def embed_text(text: str) -> list[float]:
    """Backward-compatible alias used by other modules."""
    return embed_query(text)


@dataclass
class _RawChunk:
    chunk_id: str
    text: str
    source_file: str
    subject: str | None
    chunk_index: int | None
    score: float
    concepts: list[str]
    related_subjects: list[str]
    domains: list[str]
    source_type: str | None = None
    outcome: str | None = None
    title: str | None = None


def _payload_to_raw(point, score: float | None = None) -> _RawChunk:
    payload = point.payload or {}
    concepts = payload.get("concepts") or []
    related = payload.get("related_subjects") or []
    domains = payload.get("domains") or []
    if not isinstance(concepts, list):
        concepts = []
    if not isinstance(related, list):
        related = []
    if not isinstance(domains, list):
        domains = []
    return _RawChunk(
        chunk_id=str(payload.get("chunk_id") or point.id),
        text=str(payload.get("text", "")),
        source_file=str(payload.get("source_file", "unknown")),
        subject=payload.get("subject"),
        chunk_index=payload.get("chunk_index"),
        score=float(score if score is not None else (point.score or 0.0)),
        concepts=[str(c) for c in concepts],
        related_subjects=[str(s) for s in related],
        domains=[str(d) for d in domains],
        source_type=payload.get("source_type"),
        outcome=payload.get("outcome"),
        title=payload.get("title"),
    )


def _enrich_chunk(chunk: _RawChunk, ontology) -> None:
    if not chunk.concepts:
        chunk.concepts = ontology.match_concepts(chunk.text)
    if not chunk.related_subjects:
        chunk.related_subjects = ontology.subjects_for_concepts(chunk.concepts)
        if chunk.subject and chunk.subject not in chunk.related_subjects:
            chunk.related_subjects = sorted(set(chunk.related_subjects) | {chunk.subject})
    if not chunk.domains:
        chunk.domains = ontology.domains_for_concepts(chunk.concepts)


def _domain_boost(chunk: _RawChunk, domain: str, ontology) -> float:
    boost = 0.0
    if domain in chunk.domains:
        boost += 0.12
    concept_domains = ontology.domains_for_concepts(chunk.concepts)
    if domain in concept_domains:
        boost += 0.06
    if f"domains/{domain}" in chunk.source_file.replace("\\", "/"):
        boost += 0.08
    if chunk.source_type in ("ntrs", "academic", "patent", "failed_research"):
        boost += 0.05
    if chunk.outcome == "failed" and domain == "clean_energy":
        boost += 0.03
    return boost


def _entropy_dedup(candidates: list[_RawChunk], overlap_threshold: float = 0.65) -> list[_RawChunk]:
    if not candidates:
        return []

    ranked = sorted(
        candidates,
        key=lambda c: (c.score, shannon_entropy(c.text)),
        reverse=True,
    )
    kept: list[_RawChunk] = []
    for candidate in ranked:
        is_duplicate = False
        for existing in kept:
            if word_overlap_ratio(candidate.text, existing.text) >= overlap_threshold:
                is_duplicate = True
                break
            if abs(candidate.score - existing.score) < 0.02 and word_overlap_ratio(
                candidate.text, existing.text
            ) >= 0.45:
                is_duplicate = True
                break
        if not is_duplicate:
            kept.append(candidate)
    return kept


def _balance_by_subject(candidates: list[_RawChunk], top_k: int) -> list[_RawChunk]:
    if len(candidates) <= top_k:
        return candidates

    by_subject: dict[str, list[_RawChunk]] = {}
    for chunk in candidates:
        key = (chunk.subject or "unknown").lower()
        by_subject.setdefault(key, []).append(chunk)

    if len(by_subject) < 2:
        return candidates[:top_k]

    selected: list[_RawChunk] = []
    seen_ids: set[str] = set()

    def chunk_key(c: _RawChunk) -> str:
        return c.chunk_id

    buckets = sorted(by_subject.values(), key=lambda b: b[0].score, reverse=True)
    while len(selected) < top_k:
        added = False
        for bucket in buckets:
            for chunk in bucket:
                key = chunk_key(chunk)
                if key not in seen_ids:
                    selected.append(chunk)
                    seen_ids.add(key)
                    added = True
                    break
                if len(selected) >= top_k:
                    break
            if len(selected) >= top_k:
                break
        if not added:
            break

    if len(selected) < top_k:
        for chunk in candidates:
            key = chunk_key(chunk)
            if key not in seen_ids:
                selected.append(chunk)
                seen_ids.add(key)
            if len(selected) >= top_k:
                break

    return sorted(selected, key=lambda c: c.score, reverse=True)[:top_k]


def _reciprocal_rank_fusion(
    dense: list[_RawChunk],
    sparse: list[tuple[str, float]],
    *,
    k: int,
    rrf_k: int,
) -> list[_RawChunk]:
    """Merge dense and BM25 rankings with RRF scores."""
    by_id: dict[str, _RawChunk] = {c.chunk_id: c for c in dense}
    scores: dict[str, float] = {}

    for rank, chunk in enumerate(dense, start=1):
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0.0) + 1.0 / (rrf_k + rank)

    sparse_ids = [cid for cid, _ in sparse]
    for rank, chunk_id in enumerate(sparse_ids, start=1):
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (rrf_k + rank)

    # Pull sparse-only hits from Qdrant if needed
    missing = [cid for cid in sparse_ids if cid not in by_id][: k]
    if missing:
        client = get_qdrant_client()
        settings = get_settings()
        for chunk_id in missing:
            try:
                points = client.retrieve(
                    collection_name=settings.collection_name,
                    ids=[chunk_id],
                    with_payload=True,
                )
                if points:
                    by_id[chunk_id] = _payload_to_raw(points[0], score=scores.get(chunk_id, 0.0))
            except Exception:
                continue

    fused = []
    for chunk_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        if chunk_id in by_id:
            chunk = by_id[chunk_id]
            chunk.score = score
            fused.append(chunk)
    return fused


def _dense_search(
    query: str,
    *,
    subject: str | None,
    limit: int,
) -> list[_RawChunk]:
    settings = get_settings()
    client = get_qdrant_client()
    vector = embed_query(query)

    must_conditions = []
    if subject:
        must_conditions.append(
            FieldCondition(key="subject", match=MatchValue(value=subject.lower()))
        )
    query_filter = Filter(must=must_conditions) if must_conditions else None

    results = client.query_points(
        collection_name=settings.collection_name,
        query=vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )
    return [_payload_to_raw(point) for point in results.points]


def search_chunks(
    query: str,
    domain: str | None = None,
    subject: str | None = None,
    top_k: int | None = None,
) -> list[SourceChunk]:
    settings = get_settings()
    ontology = get_ontology()
    k = top_k or settings.top_k
    expanded_query = expand_query_for_retrieval(query, domain)
    fetch_limit = k * settings.hybrid_fetch_multiplier
    if domain and not subject:
        fetch_limit = max(fetch_limit, k * 5)

    if settings.hybrid_search_enabled:
        dense_candidates = _dense_search(expanded_query, subject=subject, limit=fetch_limit)
        bm25_hits = get_bm25_index().search(expanded_query, top_k=fetch_limit)
        raw_candidates = _reciprocal_rank_fusion(
            dense_candidates,
            bm25_hits,
            k=fetch_limit,
            rrf_k=settings.hybrid_rrf_k,
        )
    else:
        raw_candidates = _dense_search(expanded_query, subject=subject, limit=fetch_limit)

    for chunk in raw_candidates:
        _enrich_chunk(chunk, ontology)

    if domain and domain in VALID_DOMAINS:
        for chunk in raw_candidates:
            chunk.score += _domain_boost(chunk, domain, ontology)
        raw_candidates.sort(key=lambda c: c.score, reverse=True)

    deduped = _entropy_dedup(raw_candidates)
    if not subject:
        final = _balance_by_subject(deduped, k)
    else:
        final = deduped[:k]

    chunks: list[SourceChunk] = []
    for i, raw in enumerate(final, start=1):
        chunks.append(
            SourceChunk(
                index=i,
                text=raw.text,
                source_file=raw.source_file,
                subject=raw.subject,
                chunk_index=raw.chunk_index,
                score=raw.score,
                concepts=raw.concepts,
                related_subjects=raw.related_subjects,
                domains=raw.domains,
            )
        )
    return chunks
