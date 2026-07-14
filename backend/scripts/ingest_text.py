"""
Ingest STEM markdown into Qdrant (legacy entrypoint → premium pipeline).

Usage:
    python scripts/ingest_text.py --fresh
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from qdrant_client import QdrantClient

from app.config import get_settings
from app.services.ingest_pipeline import (
    collect_files,
    ensure_collection,
    ingest_documents,
    load_document,
    merge_bm25_from_qdrant,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Ingest STEM text into Qdrant")
    project_root = Path(__file__).resolve().parents[2]
    parser.add_argument("--seed-dir", type=Path, default=project_root / "data" / "seed")
    parser.add_argument("--fresh", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    ensure_collection(client, fresh=args.fresh)

    data_root = project_root / "data"
    files = collect_files(args.seed_dir)
    documents = [load_document(p, data_root) for p in files]
    documents = [d for d in documents if d]

    stats = ingest_documents(client, documents, rebuild_bm25=True)
    merge_bm25_from_qdrant(client)
    print(f"Done! chunks: {stats.chunks}")


if __name__ == "__main__":
    main()
