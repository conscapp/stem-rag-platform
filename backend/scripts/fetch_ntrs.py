#!/usr/bin/env python3
"""
Fetch NASA Technical Report Server (NTRS) citations into data/premium/ntrs/.

Uses the public NTRS search API. Saves markdown with rich frontmatter for ingest.

Usage:
  cd backend
  python scripts/fetch_ntrs.py --query "fusion propulsion" --domain clean_energy --max 15
  python scripts/fetch_ntrs.py --query "nanotechnology materials" --domain nanotechnology
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

NTRS_SEARCH = "https://ntrs.nasa.gov/api/citations/search"
DEFAULT_QUERIES = {
    "aerospace": "electric propulsion OR hypersonic thermal protection",
    "nanotechnology": "nanomaterials OR MEMS space applications",
    "clean_energy": "fusion OR plasma confinement OR D-T reactor",
}

EXTRA_QUERIES = {
    "aerospace": [
        "rocket propulsion",
        "reentry vehicle",
        "orbital mechanics",
        "Hall thruster",
        "thermal protection system",
        "cryogenic propellant",
        "Mars entry descent landing",
    ],
    "nanotechnology": [
        "carbon nanotube",
        "nanocomposite materials",
        "graphene",
        "quantum dots",
        "atomic layer deposition",
        "MEMS sensor",
    ],
    "clean_energy": [
        "tokamak",
        "inertial confinement fusion",
        "tritium breeding",
        "magnetic confinement",
        "deuterium tritium",
        "fusion reactor blanket",
        "plasma facing component",
    ],
}


def _safe_filename(text: str, doc_id: str) -> str:
    slug = re.sub(r"[^\w\-]+", "_", text.lower())[:60].strip("_")
    return f"{doc_id}_{slug}.md" if doc_id else f"{slug}.md"


def _yaml_list(items: list[str]) -> str:
    if not items:
        return "[]"
    return "\n".join(f"  - {item}" for item in items)


def fetch_ntrs(
    query: str,
    *,
    max_results: int = 20,
    domain: str = "aerospace",
    out_dir: Path,
    page_size: int = 50,
    start_offset: int = 0,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = 0
    offset = start_offset

    with httpx.Client(timeout=90.0, follow_redirects=True) as client:
        while saved < max_results:
            batch = min(page_size, max_results - saved + 20)
            params = {"q": query, "page": json.dumps({"from": offset, "size": batch})}
            data = None
            for attempt in range(5):
                resp = client.get(NTRS_SEARCH, params=params)
                if resp.status_code == 429:
                    wait = 5 * (attempt + 1)
                    print(f"  NTRS rate limited — waiting {wait}s")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                break
            if data is None:
                break

            results = data.get("results", data.get("hits", []))
            if isinstance(results, dict):
                results = results.get("results", results.get("hits", []))
            if not results:
                break

            batch_saved = 0
            for item in results:
                if saved >= max_results:
                    break
                if not isinstance(item, dict):
                    continue
                doc_id = str(item.get("id") or item.get("stiId") or item.get("documentId") or "")
                title = str(item.get("title") or "Untitled NASA report").strip()
                abstract = str(
                    item.get("abstract")
                    or item.get("abstractNote")
                    or item.get("abstractText")
                    or ""
                ).strip()
                authors_raw = item.get("authorAffiliations") or item.get("authors") or []
                authors: list[str] = []
                if isinstance(authors_raw, list):
                    for a in authors_raw:
                        if isinstance(a, dict):
                            authors.append(str(a.get("meta", {}).get("author", a.get("name", ""))))
                        else:
                            authors.append(str(a))
                year = item.get("publicationYear") or item.get("year")

                body_parts = [f"## Summary\n\n{title}"]
                if abstract:
                    body_parts.append(f"## Abstract\n\n{abstract}")
                keywords = item.get("keywords") or item.get("subjectCategories") or []
                if keywords:
                    kw = ", ".join(str(k) for k in keywords[:20])
                    body_parts.append(f"## Keywords\n\n{kw}")
                if item.get("otherReportNumbers"):
                    body_parts.append(f"## Report Numbers\n\n{item['otherReportNumbers']}")
                center = str(item.get("center") or item.get("nasaCenter") or "")
                if center:
                    body_parts.append(f"## NASA Center\n\n{center}")

                body = "\n\n".join(body_parts)
                if len(body.strip()) < 60:
                    continue

                filename = _safe_filename(title, doc_id)
                path = out_dir / filename
                if path.exists():
                    continue

                frontmatter = f"""---
title: "{title.replace('"', "'")}"
source_type: ntrs
source_tier: premium
document_id: "{doc_id}"
publisher: NASA NTRS
domains:
  - {domain}
authors:
{_yaml_list([a for a in authors if a]) if authors else "  - NASA"}
year: {year or "null"}
subject: engineering
concepts:
  - technical_report
  - premium_source
outcome: unknown
---

# {title}

"""
                path.write_text(frontmatter + body + "\n", encoding="utf-8")
                saved += 1
                batch_saved += 1
                print(f"  Saved: {filename}")
                time.sleep(0.2)

            offset += len(results)
            # Keep paging even when all hits already exist, until we fill max or exhaust results
            if len(results) < batch:
                break
            if batch_saved == 0 and offset > max_results * 4:
                break
            time.sleep(1)

    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch NASA NTRS reports as premium markdown")
    project_root = Path(__file__).resolve().parents[2]
    parser.add_argument("--query", type=str, default=None)
    parser.add_argument("--domain", choices=list(DEFAULT_QUERIES), default="aerospace")
    parser.add_argument("--max", type=int, default=20)
    parser.add_argument("--start", type=int, default=0, help="NTRS API from-offset")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=project_root / "data" / "premium" / "ntrs",
    )
    parser.add_argument("--all-domains", action="store_true", help="Fetch default query per domain")
    args = parser.parse_args()

    total = 0
    if args.all_domains:
        per_query = max(15, args.max // 2)
        for domain, query in DEFAULT_QUERIES.items():
            print(f"\nNTRS [{domain}]: {query}")
            sub = args.out_dir / domain
            total += fetch_ntrs(
                query,
                max_results=per_query,
                domain=domain,
                out_dir=sub,
                start_offset=args.start,
            )
            for extra in EXTRA_QUERIES.get(domain, []):
                print(f"  extra: {extra}")
                total += fetch_ntrs(
                    extra,
                    max_results=per_query,
                    domain=domain,
                    out_dir=sub,
                    start_offset=args.start,
                )
                time.sleep(2)
    else:
        query = args.query or DEFAULT_QUERIES[args.domain]
        print(f"NTRS: {query}")
        total += fetch_ntrs(
            query,
            max_results=args.max,
            domain=args.domain,
            out_dir=args.out_dir / args.domain,
            start_offset=args.start,
        )

    print(f"\nSaved {total} NTRS documents to {args.out_dir}")


if __name__ == "__main__":
    main()
