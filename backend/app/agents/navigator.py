"""Navigator Agent — deep multi-query retrieval after Interpreter."""

from __future__ import annotations

from app.agents.state import PipelineState
from app.constants import DOMAIN_LABELS
from app.models.schemas import SourceChunk
from app.services.ontology import get_ontology
from app.services.retriever import search_chunks


def _chunk_key(chunk: SourceChunk) -> tuple[str, int | None]:
    return (chunk.source_file, chunk.chunk_index)


def _format_chunk_for_digest(chunk: SourceChunk) -> str:
    lines = [f"[{chunk.index}] ({chunk.subject or 'unknown'}) {chunk.text}"]
    lines.append(f"source: {chunk.source_file}")
    meta = []
    if chunk.domains:
        meta.append(f"domains: {', '.join(chunk.domains)}")
    if chunk.concepts:
        meta.append(f"concepts: {', '.join(chunk.concepts)}")
    if meta:
        lines.append(" | ".join(meta))
    return "\n".join(lines)


def rebuild_evidence_digest(chunks: list[SourceChunk]) -> str:
    if not chunks:
        return "No relevant principles found in knowledge base."
    renumbered: list[SourceChunk] = []
    for i, chunk in enumerate(chunks, start=1):
        renumbered.append(chunk.model_copy(update={"index": i}))
    return "\n\n".join(_format_chunk_for_digest(c) for c in renumbered)


def _merge_chunks(existing: list[SourceChunk], new_hits: list[SourceChunk]) -> list[SourceChunk]:
    seen = {_chunk_key(c) for c in existing}
    merged = list(existing)
    for hit in new_hits:
        key = _chunk_key(hit)
        if key not in seen:
            seen.add(key)
            merged.append(hit)
    return [
        c.model_copy(update={"index": i}) for i, c in enumerate(merged, start=1)
    ]


async def run_navigator(state: PipelineState) -> PipelineState:
    ontology = get_ontology()
    search_text = state.retrieval_query

    concepts = ontology.match_concepts(f"{state.query} {search_text} {' '.join(state.search_terms)}")
    subjects = sorted(ontology.expand_subjects(search_text, state.subject))

    chunks = search_chunks(search_text, domain=state.domain, subject=state.subject)

    for term in state.search_terms[:4]:
        extra = search_chunks(term, domain=state.domain, subject=state.subject, top_k=2)
        chunks = _merge_chunks(chunks, extra)

    if state.query.strip().lower() != search_text.strip().lower():
        raw_extra = search_chunks(state.query, domain=state.domain, subject=state.subject, top_k=2)
        chunks = _merge_chunks(chunks, raw_extra)

    state.matched_concepts = concepts
    state.expanded_subjects = subjects
    state.chunks = chunks[:8]
    state.evidence_digest = rebuild_evidence_digest(state.chunks)

    domain_label = DOMAIN_LABELS.get(state.domain, state.domain)
    subject_list = ", ".join(subjects) if subjects else "all STEM subjects"
    concept_list = ", ".join(concepts[:8]) if concepts else "none matched"

    state.add_trace(
        agent="Navigator",
        role="Deep Retrieval",
        summary=(
            f"Domain: {domain_label}. "
            f"Retrieved {len(state.chunks)} evidence blocks across [{subject_list}]. "
            f"Concepts: {concept_list}."
        ),
    )
    return state


async def supplement_evidence(state: PipelineState, gap_terms: list[str]) -> PipelineState:
    """Second-pass RAG: targeted retrieval for Connector-flagged gaps."""
    if not gap_terms:
        return state

    new_chunks: list[SourceChunk] = []
    for term in gap_terms:
        hits = search_chunks(term, domain=state.domain, subject=state.subject, top_k=2)
        for hit in hits:
            if _chunk_key(hit) not in {_chunk_key(c) for c in state.chunks + new_chunks}:
                new_chunks.append(hit)

    if not new_chunks:
        state.add_trace(
            agent="Navigator",
            role="Supplemental RAG",
            summary=f"No new evidence for gaps: {', '.join(gap_terms[:3])}.",
        )
        return state

    state.chunks = _merge_chunks(state.chunks, new_chunks)[:10]
    state.evidence_digest = rebuild_evidence_digest(state.chunks)
    state.add_trace(
        agent="Navigator",
        role="Supplemental RAG",
        summary=f"Added {len(new_chunks)} blocks for gaps: {', '.join(gap_terms[:3])}.",
    )
    return state
