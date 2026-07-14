"""
Bulk PDF ingestion pipeline: PDF -> chunks -> embeddings -> Qdrant.

Usage:
    python scripts/ingest.py [--pdf-dir PATH] [--resume]

Folder structure for subject auto-tagging:
    data/raw_pdfs/physics/*.pdf
    data/raw_pdfs/chemistry/*.pdf
    data/raw_pdfs/math/*.pdf
    data/raw_pdfs/engineering/*.pdf
"""

import argparse
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "stem_vectors")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
BATCH_SIZE = 100

VALID_SUBJECTS = {"physics", "chemistry", "math", "engineering"}
CHECKPOINT_FILE = ".ingest_checkpoint.json"


def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return chunks


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


def detect_subject(pdf_path: Path, root: Path) -> str:
    try:
        relative = pdf_path.relative_to(root)
        if len(relative.parts) > 1:
            candidate = relative.parts[0].lower()
            if candidate in VALID_SUBJECTS:
                return candidate
    except ValueError:
        pass
    return "engineering"


def load_checkpoint(checkpoint_path: Path) -> set[str]:
    if checkpoint_path.exists():
        data = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        return set(data.get("processed_files", []))
    return set()


def save_checkpoint(checkpoint_path: Path, processed: set[str]) -> None:
    checkpoint_path.write_text(
        json.dumps({"processed_files": sorted(processed)}, indent=2),
        encoding="utf-8",
    )


def ensure_collection(client: QdrantClient, vector_size: int) -> None:
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        print(f"Created collection: {COLLECTION_NAME}")


def collect_pdfs(pdf_dir: Path) -> list[Path]:
    return sorted(pdf_dir.rglob("*.pdf"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest STEM PDFs into Qdrant")
    default_pdf_dir = Path(__file__).resolve().parents[2] / "data" / "raw_pdfs"
    parser.add_argument("--pdf-dir", type=Path, default=default_pdf_dir)
    parser.add_argument("--resume", action="store_true", help="Skip already processed files")
    args = parser.parse_args()

    pdf_dir: Path = args.pdf_dir
    if not pdf_dir.exists():
        print(f"Error: PDF directory not found: {pdf_dir}")
        print("Create it and add open-access PDFs (OpenStax, arXiv).")
        sys.exit(1)

    checkpoint_path = pdf_dir / CHECKPOINT_FILE
    processed_files = load_checkpoint(checkpoint_path) if args.resume else set()

    pdfs = collect_pdfs(pdf_dir)
    if not pdfs:
        print(f"No PDF files found in {pdf_dir}")
        print("Download OpenStax textbooks into subject subfolders.")
        sys.exit(0)

    print("Loading embedding model (first run downloads ~1.3GB)...")
    encoder = SentenceTransformer(EMBEDDING_MODEL)
    vector_size = encoder.get_sentence_embedding_dimension()

    print(f"Connecting to Qdrant at {QDRANT_URL}...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    ensure_collection(client, vector_size)

    point_id_base = int(uuid.uuid4().int % (10**12))
    total_chunks = 0
    total_files = 0

    for pdf_path in pdfs:
        rel_path = str(pdf_path.relative_to(pdf_dir))
        if rel_path in processed_files:
            print(f"Skipping (already processed): {rel_path}")
            continue

        subject = detect_subject(pdf_path, pdf_dir)
        print(f"\nProcessing [{subject}]: {rel_path}")

        try:
            full_text = extract_pdf_text(pdf_path)
        except Exception as exc:
            print(f"  Skipping due to extraction error: {exc}")
            continue

        if len(full_text.strip()) < 50:
            print("  Skipping: insufficient text extracted")
            continue

        document_chunks = chunk_text(full_text, CHUNK_SIZE, CHUNK_OVERLAP)
        print(f"  Split into {len(document_chunks)} chunks")

        batch: list[PointStruct] = []
        for index, chunk in enumerate(document_chunks):
            clean_chunk = " ".join(chunk.split())
            if len(clean_chunk.strip()) < 20:
                continue

            vector = encoder.encode(clean_chunk).tolist()
            batch.append(
                PointStruct(
                    id=point_id_base + total_chunks + index,
                    vector=vector,
                    payload={
                        "source_file": rel_path,
                        "subject": subject,
                        "chunk_index": index,
                        "text": clean_chunk,
                    },
                )
            )

            if len(batch) >= BATCH_SIZE:
                client.upsert(collection_name=COLLECTION_NAME, points=batch)
                batch = []

        if batch:
            client.upsert(collection_name=COLLECTION_NAME, points=batch)

        chunk_count = len([c for c in document_chunks if len(" ".join(c.split()).strip()) >= 20])
        total_chunks += chunk_count
        total_files += 1
        processed_files.add(rel_path)
        save_checkpoint(checkpoint_path, processed_files)
        print(f"  Uploaded {chunk_count} vectors")

    print(f"\nDone! Processed {total_files} files, {total_chunks} total chunks.")


if __name__ == "__main__":
    main()
