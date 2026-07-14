"""Novelty detection: ensure submissions are new cross-STEM innovations."""

from __future__ import annotations

from dataclasses import dataclass, field

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.constants import VALID_DOMAINS, normalize_domain
from app.config import get_settings
from app.services.ontology import get_ontology
from app.services.retriever import embed_text, get_qdrant_client


@dataclass
class SimilarInnovation:
    post_id: str
    title: str
    similarity: float


@dataclass
class NoveltyReport:
    novelty_score: float
    is_duplicate: bool
    is_cross_disciplinary: bool
    disciplines: list[str]
    similar_innovations: list[SimilarInnovation] = field(default_factory=list)
    rejection_reason: str | None = None
    recommendation: str = "pending_review"

    def to_dict(self) -> dict:
        return {
            "novelty_score": round(self.novelty_score, 2),
            "is_duplicate": self.is_duplicate,
            "is_cross_disciplinary": self.is_cross_disciplinary,
            "disciplines": self.disciplines,
            "similar_innovations": [
                {"post_id": s.post_id, "title": s.title, "similarity": round(s.similarity, 4)}
                for s in self.similar_innovations
            ],
            "rejection_reason": self.rejection_reason,
            "recommendation": self.recommendation,
        }


def _ensure_innovation_collection(client: QdrantClient) -> None:
    settings = get_settings()
    name = settings.innovation_collection_name
    collections = [c.name for c in client.get_collections().collections]
    if name not in collections:
        from app.services.embeddings import get_embedding_dimension

        size = get_embedding_dimension()
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=size, distance=Distance.COSINE),
        )


def extract_disciplines(sources: list[dict]) -> list[str]:
    ontology = get_ontology()
    disciplines: set[str] = set()
    for src in sources:
        subject = src.get("subject")
        if subject and isinstance(subject, str):
            disciplines.add(subject.lower())
        concepts = src.get("concepts")
        if concepts and isinstance(concepts, list):
            for concept_id in concepts:
                if isinstance(concept_id, str):
                    disciplines.update(ontology.subjects_for_concepts([concept_id]))
        related = src.get("related_subjects")
        if related and isinstance(related, list):
            for subj in related:
                if isinstance(subj, str):
                    disciplines.add(subj.lower())
    return sorted(d for d in disciplines if d in {"physics", "chemistry", "math", "engineering"})


def validate_domain(domain: str | None) -> str | None:
    if not domain:
        return "Innovation domain is required (aerospace, nanotechnology, or clean_energy)."
    normalized = normalize_domain(domain)
    if normalized not in VALID_DOMAINS:
        return f"Domain must be one of: {', '.join(sorted(VALID_DOMAINS))}."
    return None


def _embedding_text(title: str, content: str) -> str:
    return f"{title.strip()}\n\n{content.strip()}"[:3000]


def search_similar_innovations(title: str, content: str, top_k: int = 5) -> list[SimilarInnovation]:
    settings = get_settings()
    client = get_qdrant_client()
    _ensure_innovation_collection(client)

    vector = embed_text(_embedding_text(title, content))
    results = client.query_points(
        collection_name=settings.innovation_collection_name,
        query=vector,
        limit=top_k,
        with_payload=True,
    )

    similar: list[SimilarInnovation] = []
    for point in results.points:
        payload = point.payload or {}
        score = point.score or 0.0
        similar.append(
            SimilarInnovation(
                post_id=str(payload.get("post_id", "")),
                title=str(payload.get("title", "Unknown")),
                similarity=float(score),
            )
        )
    return similar


def evaluate_novelty(
    title: str,
    content: str,
    sources: list[dict],
    domain: str | None = None,
) -> NoveltyReport:
    settings = get_settings()
    disciplines = extract_disciplines(sources)
    is_cross_disciplinary = len(disciplines) >= settings.novelty_min_disciplines

    domain_error = validate_domain(domain)

    similar = search_similar_innovations(title, content)
    max_similarity = similar[0].similarity if similar else 0.0

    # Base novelty: inverse of highest similarity to existing approved innovations
    base_novelty = max(0.0, (1.0 - max_similarity) * 100)

    # Cross-STEM bonus (up to +15 points for combining multiple fields)
    discipline_bonus = min(15.0, max(0, len(disciplines) - 1) * 7.5)

    # Penalty if only one discipline — platform goal is combined STEM innovation
    single_field_penalty = 0.0 if is_cross_disciplinary else 10.0

    novelty_score = max(0.0, min(100.0, base_novelty + discipline_bonus - single_field_penalty))

    is_duplicate = max_similarity >= settings.novelty_duplicate_threshold
    rejection_reason: str | None = None
    recommendation = "pending_review"

    if is_duplicate:
        match = similar[0]
        rejection_reason = (
            f"Too similar to an existing innovation "
            f'"{match.title}" ({match.similarity * 100:.1f}% match). '
            "Combine ideas differently or apply concepts across new STEM fields."
        )
        recommendation = "reject"
    elif domain_error:
        rejection_reason = domain_error
        recommendation = "reject"
    elif not is_cross_disciplinary:
        rejection_reason = (
            f"Innovations must combine at least {settings.novelty_min_disciplines} STEM fields "
            f"(physics, chemistry, math, engineering). Found: {', '.join(disciplines) or 'none'}. "
            "Cross-reference sources from multiple disciplines to create something new."
        )
        recommendation = "reject"
    elif novelty_score < settings.novelty_auto_reject_score:
        rejection_reason = (
            f"Novelty score too low ({novelty_score:.1f}/100). "
            "This reads as a restatement of existing knowledge rather than a new design."
        )
        recommendation = "reject"
    elif novelty_score >= 70 and is_cross_disciplinary:
        recommendation = "pending_review"

    return NoveltyReport(
        novelty_score=novelty_score,
        is_duplicate=is_duplicate,
        is_cross_disciplinary=is_cross_disciplinary,
        disciplines=disciplines,
        similar_innovations=similar,
        rejection_reason=rejection_reason,
        recommendation=recommendation,
    )


def index_approved_innovation(post_id: str, title: str, content: str, disciplines: list[str]) -> None:
    """Store embedding of an approved innovation for future duplicate detection."""
    settings = get_settings()
    client = get_qdrant_client()
    _ensure_innovation_collection(client)

    vector = embed_text(_embedding_text(title, content))
    point_id = abs(hash(post_id)) % (2**63 - 1)
    point = PointStruct(
        id=point_id,
        vector=vector,
        payload={
            "post_id": post_id,
            "title": title,
            "disciplines": disciplines,
            "text_preview": content[:500],
        },
    )
    client.upsert(collection_name=settings.innovation_collection_name, points=[point])
