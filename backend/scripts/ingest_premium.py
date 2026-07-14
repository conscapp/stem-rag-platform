#!/usr/bin/env python3
"""
Premium knowledge ingest: seed + premium folders → semantic chunks → Qdrant + BM25.

Sources:
  data/seed/          — fundamentals (all tiers)
  data/premium/       — NTRS, academic, patents, failed_research (premium only)

Usage:
  cd backend
  python scripts/ingest_premium.py --fresh          # rebuild collection + BM25
  python scripts/ingest_premium.py --premium-only   # only data/premium/
  python scripts/ingest_premium.py --rebuild-bm25   # sync BM25 from Qdrant
"""

from __future__ import annotations

import argparse
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
    parser = argparse.ArgumentParser(description="Ingest premium STEM knowledge into Qdrant")
    project_root = Path(__file__).resolve().parents[2]
    parser.add_argument("--seed-dir", type=Path, default=project_root / "data" / "seed")
    parser.add_argument("--premium-dir", type=Path, default=project_root / "data" / "premium")
    parser.add_argument("--fresh", action="store_true", help="Delete and recreate Qdrant collection")
    parser.add_argument("--premium-only", action="store_true", help="Ingest only data/premium/")
    parser.add_argument("--rebuild-bm25", action="store_true", help="Rebuild BM25 index from Qdrant only")
    args = parser.parse_args()

    settings = get_settings()
    print(f"Embedding model: {settings.embedding_model}")
    print(f"Hybrid search: {settings.hybrid_search_enabled}")
    print(f"Connecting to Qdrant at {settings.qdrant_url}...")

    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)

    if args.rebuild_bm25:
        count = merge_bm25_from_qdrant(client)
        print(f"Rebuilt BM25 index with {count} chunks.")
        return

    roots = [args.premium_dir] if args.premium_only else [args.seed_dir, args.premium_dir]
    files = collect_files(*roots)
    if not files:
        print("No documents found.")
        sys.exit(0)

    documents = []
    for path in files:
        data_root = project_root / "data"
        doc = load_document(path, data_root)
        if doc:
            if not args.premium_only and (project_root / "data" / "seed") in path.parents:
                doc.source_tier = "fundamental"
            documents.append(doc)
            safe_path = doc.source_path.encode("ascii", "replace").decode("ascii")
            print(f"  Loaded: {safe_path} [{doc.source_type}]")
        else:
            print(f"  Skipped: {path.name.encode('ascii', 'replace').decode('ascii')}")

    # Create/recreate collection immediately before upsert (avoids Qdrant Cloud race)
    ensure_collection(client, fresh=args.fresh)

    print(f"\nIngesting {len(documents)} documents...")
    stats = ingest_documents(client, documents, rebuild_bm25=True)
    merge_bm25_from_qdrant(client)

    print(f"\nDone — documents: {stats.documents}, chunks: {stats.chunks}, skipped: {stats.skipped}")


if __name__ == "__main__":
    main()
