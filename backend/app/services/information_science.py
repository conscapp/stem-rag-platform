"""Information-science layer: metadata enrichment and query expansion."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

from app.services.ontology import get_ontology

_SOURCE_TYPES_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "ontology" / "source_types.yaml"
)

_FAILED_RESEARCH_KEYWORDS = (
    "failed",
    "negative result",
    "not reproduced",
    "inconclusive",
    "null result",
    "discontinued",
    "lesson learned",
    "retracted",
    "could not",
    "did not observe",
    "no evidence",
)

_PREMIUM_SOURCE_TYPES = frozenset({"ntrs", "academic", "patent", "failed_research"})


@lru_cache
def _load_source_type_config() -> dict:
    if not _SOURCE_TYPES_PATH.exists():
        return {}
    return yaml.safe_load(_SOURCE_TYPES_PATH.read_text(encoding="utf-8")) or {}


def infer_outcome_from_text(text: str, current: str = "unknown") -> str:
    if current in ("success", "failed", "inconclusive"):
        return current
    lowered = text.lower()
    if any(k in lowered for k in _FAILED_RESEARCH_KEYWORDS):
        return "failed"
    if "successfully" in lowered or "achieved" in lowered:
        return "success"
    if "inconclusive" in lowered:
        return "inconclusive"
    return current


def enrich_chunk_metadata(payload: dict) -> dict:
    """Add information-science tags derived from source type and text."""
    ontology = get_ontology()
    source_type = str(payload.get("source_type") or "seed")
    text = str(payload.get("text") or "")

    concepts = list(payload.get("concepts") or [])
    if source_type in _PREMIUM_SOURCE_TYPES and "premium_source" not in concepts:
        concepts.append("premium_source")
    if source_type == "failed_research" and "failed_experiment" not in concepts:
        concepts.append("failed_experiment")
    if source_type == "patent" and "patent_literature" not in concepts:
        concepts.append("patent_literature")
    if source_type == "ntrs" and "technical_report" not in concepts:
        concepts.append("technical_report")

    outcome = infer_outcome_from_text(text, str(payload.get("outcome") or "unknown"))
    payload["outcome"] = outcome
    if outcome == "failed" and "lesson_learned" not in concepts:
        concepts.append("lesson_learned")

    payload["concepts"] = sorted(set(concepts))
    payload["related_subjects"] = ontology.subjects_for_concepts(payload["concepts"])
    subject = payload.get("subject")
    if subject and subject not in payload["related_subjects"]:
        payload["related_subjects"] = sorted(set(payload["related_subjects"]) | {subject})

    domains = list(payload.get("domains") or [])
    concept_domains = ontology.domains_for_concepts(payload["concepts"])
    payload["domains"] = sorted(set(domains) | set(concept_domains))
    payload["information_density"] = _lexical_density(text)
    return payload


def _lexical_density(text: str) -> float:
    words = text.split()
    if len(words) < 5:
        return 0.0
    unique = len({w.lower() for w in words})
    return round(unique / len(words), 4)


def expand_query_for_retrieval(query: str, domain: str | None = None) -> str:
    """
    Expand lay queries with ontology aliases and domain cues for hybrid search.
    """
    ontology = get_ontology()
    matched = ontology.match_concepts(query)
    related = ontology.related_concepts(matched)
    extra_terms: list[str] = []

    for cid in matched + related:
        entry = ontology.concepts.get(cid)
        if entry and entry.aliases:
            extra_terms.append(entry.aliases[0])

    config = _load_source_type_config()
    domain_queries = (config.get("domain_query_expansions") or {}).get(domain or "", [])
    extra_terms.extend(domain_queries)

    # Deduplicate while preserving order
    seen: set[str] = set()
    parts = [query]
    for term in extra_terms:
        key = term.lower()
        if key not in seen:
            seen.add(key)
            parts.append(term)

    return " ".join(parts)
