#!/usr/bin/env python3
"""
Legacy PDF ingest entrypoint → uses shared hosted/local embedding pipeline.

Prefer: python scripts/ingest_premium.py

Usage:
    python scripts/ingest.py --pdf-dir ../data/raw_pdfs --resume
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from qdrant_client import QdrantClient

from app.services.document_parser import parse_pdf_file
from app.services.ingest_pipeline import (
    ensure_collection,
    ingest_documents,
    merge_bm25_from_qdrant,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

CHECKPOINT_FILE = ".ingest_checkpoint.json"


def load_checkpoint(path: Path) -> set[str]:
    if path.exists():
        return set(json.loads(path.read_text(encoding="utf-8")).get("processed_files", []))
    return set()


def save_checkpoint(path: Path, processed: set[str]) -> None:
    path.write_text(json.dumps({"processed_files": sorted(processed)}, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest STEM PDFs into Qdrant")
    project_root = Path(__file__).resolve().parents[2]
    parser.add_argument("--pdf-dir", type=Path, default=project_root / "data" / "raw_pdfs")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--fresh", action="store_true")
    args = parser.parse_args()

    pdf_dir: Path = args.pdf_dir
    if not pdf_dir.exists():
        print(f"PDF directory not found: {pdf_dir}")
        sys.exit(1)

    from app.config import get_settings

    settings = get_settings()
    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    ensure_collection(client, fresh=args.fresh)

    checkpoint_path = pdf_dir / CHECKPOINT_FILE
    processed = load_checkpoint(checkpoint_path) if args.resume else set()
    data_root = project_root / "data"

    docs = []
    for pdf in sorted(pdf_dir.rglob("*.pdf")):
        rel = str(pdf.relative_to(pdf_dir)).replace("\\", "/")
        if rel in processed:
            print(f"Skipping: {rel}")
            continue
        try:
            doc = parse_pdf_file(pdf, data_root)
        except Exception as exc:
            print(f"Skip {rel}: {exc}")
            continue
        if not doc or len(doc.text.strip()) < 50:
            continue
        docs.append(doc)
        processed.add(rel)
        print(f"Queued: {rel}")

    if not docs:
        print("No new PDFs to ingest.")
        sys.exit(0)

    stats = ingest_documents(client, docs, rebuild_bm25=False)
    merge_bm25_from_qdrant(client)
    save_checkpoint(checkpoint_path, processed)
    print(f"Done — documents: {stats.documents}, chunks: {stats.chunks}")


if __name__ == "__main__":
    main()
