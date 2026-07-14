"""Shared premium ingest: parse → semantic chunk → tag → embed → Qdrant + BM25."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import get_settings
from app.constants import VALID_DOMAINS, VALID_SUBJECTS
from app.services.bm25_index import BM25Index, save_bm25_index
from app.services.chunking import semantic_chunk_text
from app.services.document_parser import DocumentRecord, parse_markdown_file, parse_pdf_file
from app.services.embeddings import embed_documents, get_embedding_dimension
from app.services.information_science import enrich_chunk_metadata
from app.services.ontology import get_ontology


@dataclass
class IngestStats:
    documents: int = 0
    chunks: int = 0
    skipped: int = 0


def ensure_collection(client: QdrantClient, *, fresh: bool = False) -> None:
    import time

    from qdrant_client.http.exceptions import UnexpectedResponse

    settings = get_settings()
    name = settings.collection_name
    collections = [c.name for c in client.get_collections().collections]
    if fresh and name in collections:
        print(f"Deleting collection: {name}")
        try:
            client.delete_collection(name)
        except UnexpectedResponse as exc:
            print(f"Delete note: {exc}")
        for _ in range(20):
            time.sleep(1.5)
            collections = [c.name for c in client.get_collections().collections]
            if name not in collections:
                break
        print(f"Deleted collection: {name}")
    collections = [c.name for c in client.get_collections().collections]
    if name not in collections:
        dim = get_embedding_dimension()
        print(f"Creating collection: {name} (dim={dim})")
        try:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )
        except UnexpectedResponse as exc:
            # Qdrant Cloud eventual consistency: delete may lag; collection may already exist
            if "already exists" not in str(exc).lower() and "409" not in str(exc):
                raise
            print(f"Create race (collection exists): continuing")
        for _ in range(15):
            time.sleep(1)
            collections = [c.name for c in client.get_collections().collections]
            if name in collections:
                break
        if name not in [c.name for c in client.get_collections().collections]:
            raise RuntimeError(f"Failed to create Qdrant collection: {name}")
        print(f"Created collection: {name}")
    elif fresh:
        # Fresh requested but collection still present after delete wait — wipe via recreate
        print(f"Collection {name} still present after fresh delete; recreating")
        try:
            client.delete_collection(name)
            time.sleep(3)
        except UnexpectedResponse:
            pass
        dim = get_embedding_dimension()
        try:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )
        except UnexpectedResponse as exc:
            if "already exists" not in str(exc).lower():
                raise
            print("Using existing collection after recreate race")


def detect_subject_from_path(path: Path, root: Path) -> str:
    try:
        relative = path.relative_to(root)
        for part in relative.parts:
            if part.lower() in VALID_SUBJECTS:
                return part.lower()
    except ValueError:
        pass
    return "engineering"


def detect_domain_from_path(path: Path, root: Path) -> str | None:
    try:
        relative = path.relative_to(root)
        parts = [p.lower() for p in relative.parts]
        if "domains" in parts:
            idx = parts.index("domains")
            if idx + 1 < len(parts) and parts[idx + 1] in VALID_DOMAINS:
                return parts[idx + 1]
        for part in parts:
            if part in VALID_DOMAINS:
                return part
    except ValueError:
        pass
    return None


def load_document(path: Path, root: Path) -> DocumentRecord | None:
    suffix = path.suffix.lower()
    try:
        if suffix in {".md", ".txt"}:
            doc = parse_markdown_file(path, root)
        elif suffix == ".pdf":
            doc = parse_pdf_file(path, root)
        else:
            return None
    except Exception:
        return None

    if not doc.subject or doc.subject not in VALID_SUBJECTS:
        doc.subject = detect_subject_from_path(path, root)
    path_domain = detect_domain_from_path(path, root)
    if path_domain and path_domain not in doc.domains:
        doc.domains = sorted(set(doc.domains) | {path_domain})

    if len(doc.text.strip()) < 40:
        return None
    return doc


def build_chunk_payload(
    doc: DocumentRecord,
    chunk_text: str,
    chunk_index: int,
    section_heading: str,
    ontology,
) -> dict:
    concepts, related_subjects, domains = ontology.tag_text(
        chunk_text,
        doc.subject,
        concept_overrides=doc.concepts or None,
        domain_overrides=doc.domains or None,
    )
    payload = {
        "chunk_id": str(uuid.uuid4()),
        "source_file": doc.source_path,
        "title": doc.title,
        "subject": doc.subject,
        "chunk_index": chunk_index,
        "section_heading": section_heading,
        "text": chunk_text,
        "concepts": concepts,
        "related_subjects": related_subjects,
        "domains": domains,
        "source_type": doc.source_type,
        "source_tier": doc.source_tier,
        "outcome": doc.outcome,
        "document_id": doc.document_id,
        "authors": doc.authors,
        "year": doc.year,
        "publisher": doc.publisher,
    }
    return enrich_chunk_metadata(payload)


def ingest_documents(
    client: QdrantClient,
    documents: list[DocumentRecord],
    *,
    batch_size: int = 64,
    rebuild_bm25: bool = True,
) -> IngestStats:
    settings = get_settings()
    ontology = get_ontology()
    stats = IngestStats()

    pending_texts: list[str] = []
    pending_points: list[PointStruct] = []
    bm25_ids: list[str] = []
    bm25_texts: list[str] = []

    def flush_batch() -> None:
        nonlocal pending_texts, pending_points
        if not pending_points:
            return
        vectors = embed_documents(pending_texts, batch_size=batch_size)
        for point, vector in zip(pending_points, vectors):
            point.vector = vector
        last_err: Exception | None = None
        for attempt in range(6):
            try:
                # Recreate collection if a prior --fresh left it missing
                names = [c.name for c in client.get_collections().collections]
                if settings.collection_name not in names:
                    print("  collection missing — recreating before upsert")
                    ensure_collection(client, fresh=False)
                client.upsert(collection_name=settings.collection_name, points=pending_points)
                pending_texts = []
                pending_points = []
                return
            except Exception as exc:
                last_err = exc
                wait = 4 * (attempt + 1)
                print(f"  upsert retry {attempt + 1}/6 after error: {exc} (wait {wait}s)")
                import time

                time.sleep(wait)
        raise last_err  # type: ignore[misc]

    for doc in documents:
        chunks = semantic_chunk_text(
            doc.text,
            max_chars=settings.chunk_size,
            overlap_chars=settings.chunk_overlap,
            source_type=doc.source_type,
        )
        if not chunks:
            stats.skipped += 1
            continue

        stats.documents += 1
        for chunk in chunks:
            payload = build_chunk_payload(
                doc, chunk.text, chunk.chunk_index, chunk.section_heading, ontology
            )
            chunk_id = payload["chunk_id"]
            pending_texts.append(chunk.text)
            pending_points.append(
                PointStruct(id=chunk_id, vector=[0.0], payload=payload)
            )
            bm25_ids.append(chunk_id)
            bm25_texts.append(chunk.text)
            stats.chunks += 1

            if len(pending_points) >= batch_size:
                flush_batch()

        flush_batch()

    if rebuild_bm25 and bm25_ids:
        index = BM25Index()
        index.build(bm25_ids, bm25_texts)
        save_bm25_index(index)

    return stats


def merge_bm25_from_qdrant(client: QdrantClient) -> int:
    """Rebuild BM25 index from all points in Qdrant (after incremental ingest)."""
    settings = get_settings()
    offset = None
    chunk_ids: list[str] = []
    texts: list[str] = []

    while True:
        points, offset = client.scroll(
            collection_name=settings.collection_name,
            limit=256,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for point in points:
            payload = point.payload or {}
            text = str(payload.get("text", ""))
            if not text:
                continue
            chunk_id = str(payload.get("chunk_id") or point.id)
            chunk_ids.append(chunk_id)
            texts.append(text)
        if offset is None:
            break

    if not chunk_ids:
        return 0
    index = BM25Index()
    index.build(chunk_ids, texts)
    save_bm25_index(index)
    return len(chunk_ids)


def collect_files(*roots: Path) -> list[Path]:
    patterns = ("*.md", "*.txt", "*.pdf")
    found: list[Path] = []
    skip_names = {
        "readme.md",
        ".ingest_checkpoint.json",
        "_clean_log.txt",
        "_ingest.log",
        "_ingest2.log",
        "_ntrs_fetch.log",
        "_ntrs2.log",
        "_arxiv_fetch.log",
        "_arxiv_ce.log",
    }
    for root in roots:
        if not root.exists():
            continue
        for pattern in patterns:
            for path in root.rglob(pattern):
                if path.name.lower() in skip_names or path.name.startswith("_"):
                    continue
                found.append(path)
    return sorted(set(found))
