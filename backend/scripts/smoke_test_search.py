"""Smoke test: search Qdrant for a sample engineering query."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.retriever import search_chunks


def main() -> None:
    queries = [
        "ideal gas law pressure volume",
        "Newton second law force mass acceleration",
        "Bernoulli pump fluid flow",
    ]
    for q in queries:
        print(f"\nQuery: {q}")
        print("-" * 60)
        results = search_chunks(q, top_k=3)
        if not results:
            print("  No results found.")
            continue
        for r in results:
            print(f"  [{r.index}] score={r.score:.4f} subject={r.subject}")
            print(f"      source: {r.source_file}")
            print(f"      text: {r.text[:200]}...")


if __name__ == "__main__":
    main()
