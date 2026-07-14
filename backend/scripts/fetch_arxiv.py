#!/usr/bin/env python3
"""
Fetch open-access arXiv preprints into data/premium/academic/.

Usage:
  cd backend
  python scripts/fetch_arxiv.py --domain clean_energy --max 20
  python scripts/fetch_arxiv.py --query "tokamak confinement" --domain clean_energy
  python scripts/fetch_arxiv.py --subject math --max 30 --start 0
  python scripts/fetch_arxiv.py --all-subjects --max 10
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

DEFAULT_QUERIES = {
    "aerospace": "all:Hall thruster OR all:electric propulsion OR all:hypersonic reentry",
    "nanotechnology": "all:carbon nanotube OR all:graphene nanocomposite OR all:quantum dot device",
    "clean_energy": "all:tritium breeding OR all:tokamak divertor OR all:inertial confinement fusion",
}

# Offset past already-ingested top results when growing the corpus
DEFAULT_START = {
    "aerospace": 30,
    "nanotechnology": 30,
    "clean_energy": 30,
}

# Subject-focused research queries (query, preferred domain, default start offset)
SUBJECT_QUERIES: dict[str, list[tuple[str, str, int]]] = {
    "physics": [
        ("all:Lagrangian mechanics OR all:Hamiltonian classical mechanics", "aerospace", 0),
        ("all:Maxwell equations OR all:electromagnetic field theory", "aerospace", 0),
        ("all:thermodynamics statistical mechanics entropy", "clean_energy", 0),
        ("all:plasma physics magnetic confinement OR all:magnetohydrodynamics", "clean_energy", 20),
        ("all:quantum foundations OR all:Schrödinger equation continuum", "nanotechnology", 0),
    ],
    "math": [
        ("all:fundamental theorem of calculus OR all:real analysis limits derivatives", "aerospace", 0),
        ("all:ordinary differential equations OR all:partial differential equations methods", "aerospace", 0),
        ("all:linear algebra eigenvalues OR all:spectral theory matrices", "nanotechnology", 0),
        ("all:calculus of variations OR all:variational methods Euler-Lagrange", "aerospace", 0),
        ("all:Fourier analysis OR all:Sobolev spaces OR all:functional analysis", "clean_energy", 0),
    ],
    "chemistry": [
        ("all:chemical kinetics Arrhenius OR all:reaction rate theory", "clean_energy", 0),
        ("ti:\"Gibbs free energy\" OR ti:thermochemistry OR all:\"enthalpy of formation\" chemistry", "clean_energy", 0),
        ("all:electrochemistry Nernst OR all:redox electrode potential", "nanotechnology", 0),
        ("all:materials chemistry OR all:solid state chemistry bonding", "nanotechnology", 0),
        ("all:catalysis surface chemistry OR all:heterogeneous catalysis", "nanotechnology", 10),
    ],
    "engineering": [
        ("all:Navier-Stokes OR all:fluid mechanics turbulence", "aerospace", 0),
        ("all:heat transfer conduction convection OR all:thermal engineering", "aerospace", 0),
        ("all:materials science fracture OR all:continuum mechanics stress strain", "aerospace", 0),
        ("all:rocket propulsion OR all:electric propulsion thruster", "aerospace", 20),
        ("all:finite element method OR all:computational fluid dynamics engineering", "aerospace", 0),
    ],
}

SUBJECT_CONCEPTS: dict[str, list[str]] = {
    "physics": ["premium_source", "mechanics", "electromagnetism", "thermodynamics", "plasma_physics"],
    "math": ["premium_source", "calculus", "differential_equations", "linear_algebra", "series"],
    "chemistry": ["premium_source", "thermochemistry", "gibbs_free_energy", "reaction_kinetics", "electrochemistry"],
    "engineering": ["premium_source", "fluid_mechanics", "heat_transfer", "materials_science", "rocketry"],
}


def _safe_filename(arxiv_id: str, title: str) -> str:
    slug = re.sub(r"[^\w\-]+", "_", title.lower())[:50].strip("_")
    aid = arxiv_id.replace("/", "_")
    return f"{aid}_{slug}.md"


def _yaml_list(items: list[str], indent: int = 2) -> str:
    pad = " " * indent
    return "\n".join(f"{pad}- {item}" for item in items)


def fetch_arxiv(
    search_query: str,
    *,
    max_results: int = 20,
    domain: str = "clean_energy",
    subject: str = "physics",
    concepts: list[str] | None = None,
    out_dir: Path,
    page_size: int = 10,
    start: int = 0,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    # Skip if already present anywhere under academic/
    academic_root = out_dir if out_dir.name == "academic" else out_dir.parent
    existing_names = {p.name for p in academic_root.rglob("*.md")} if academic_root.exists() else set()
    concept_list = concepts or SUBJECT_CONCEPTS.get(subject, ["premium_source"])

    saved = 0
    cursor = start

    with httpx.Client(timeout=90.0, follow_redirects=True) as client:
        while saved < max_results:
            batch = min(page_size, max_results - saved)
            params = {
                "search_query": search_query,
                "start": cursor,
                "max_results": batch,
                "sortBy": "relevance",
                "sortOrder": "descending",
            }
            root = None
            for attempt in range(6):
                try:
                    resp = client.get(ARXIV_API, params=params)
                    if resp.status_code in (429, 503):
                        wait = 8 * (attempt + 1)
                        print(f"  arXiv {resp.status_code} — waiting {wait}s")
                        time.sleep(wait)
                        continue
                    resp.raise_for_status()
                    root = ET.fromstring(resp.text)
                    break
                except httpx.HTTPError as exc:
                    wait = 8 * (attempt + 1)
                    print(f"  arXiv error ({exc}) — waiting {wait}s")
                    time.sleep(wait)
            if root is None:
                print("  arXiv rate limited — stopping batch")
                break

            entries = root.findall("atom:entry", ATOM_NS)
            if not entries:
                break

            for entry in entries:
                title = (entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").strip()
                summary = (entry.findtext("atom:summary", default="", namespaces=ATOM_NS) or "").strip()
                arxiv_id = (entry.findtext("atom:id", default="", namespaces=ATOM_NS) or "").split("/abs/")[-1]
                published = (entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "")[:4]
                authors = [
                    a.findtext("atom:name", default="", namespaces=ATOM_NS)
                    for a in entry.findall("atom:author", ATOM_NS)
                ]
                authors = [a for a in authors if a]

                if len(summary) < 100:
                    continue

                filename = _safe_filename(arxiv_id, title)
                if filename in existing_names:
                    continue
                path = out_dir / filename
                if path.exists():
                    continue

                author_block = "\n".join(f"  - {a}" for a in authors[:8]) if authors else "  - arXiv"
                body = f"""# {title}

## Abstract

{summary}

## Source

arXiv:{arxiv_id} — open-access preprint. Verify peer-review status before citing as established fact.
"""
                frontmatter = f"""---
title: "{title.replace('"', "'")}"
source_type: academic
source_tier: premium
document_id: "arXiv:{arxiv_id}"
publisher: arXiv
domains:
  - {domain}
authors:
{author_block}
year: {published or "null"}
subject: {subject}
concepts:
{_yaml_list(concept_list)}
outcome: unknown
---

"""
                path.write_text(frontmatter + body, encoding="utf-8")
                existing_names.add(filename)
                saved += 1
                try:
                    print(f"  Saved: {path.name}")
                except UnicodeEncodeError:
                    print(f"  Saved: {path.name.encode('ascii', 'replace').decode()}")
                if saved >= max_results:
                    break

            cursor += len(entries)
            if len(entries) < batch:
                break
            time.sleep(6)

    return saved


def fetch_subject(
    subject: str,
    *,
    max_per_query: int,
    out_dir: Path,
    start_override: int | None = None,
) -> int:
    queries = SUBJECT_QUERIES.get(subject)
    if not queries:
        raise SystemExit(f"Unknown subject: {subject}. Choose from {list(SUBJECT_QUERIES)}")

    total = 0
    for query, domain, default_start in queries:
        start = start_override if start_override is not None else default_start
        print(f"\narXiv [{subject}/{domain}] start={start}: {query}")
        total += fetch_arxiv(
            query,
            max_results=max_per_query,
            domain=domain,
            subject=subject,
            concepts=SUBJECT_CONCEPTS.get(subject),
            out_dir=out_dir,
            start=start,
        )
        time.sleep(8)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch arXiv papers as premium markdown")
    project_root = Path(__file__).resolve().parents[2]
    parser.add_argument("--query", type=str, default=None)
    parser.add_argument("--domain", choices=list(DEFAULT_QUERIES), default="clean_energy")
    parser.add_argument(
        "--subject",
        choices=list(SUBJECT_QUERIES),
        default=None,
        help="Fetch subject-focused research queries with correct subject frontmatter",
    )
    parser.add_argument("--max", type=int, default=20, help="Max results per query (or per domain)")
    parser.add_argument("--start", type=int, default=None, help="arXiv API start offset")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=project_root / "data" / "premium" / "academic",
    )
    parser.add_argument("--all-domains", action="store_true")
    parser.add_argument("--all-subjects", action="store_true", help="Fetch all subject query packs")
    args = parser.parse_args()

    total = 0
    if args.all_subjects:
        for subject in SUBJECT_QUERIES:
            print(f"\n===== SUBJECT: {subject} =====")
            total += fetch_subject(
                subject,
                max_per_query=args.max,
                out_dir=args.out_dir,
                start_override=args.start,
            )
            time.sleep(12)
    elif args.query:
        start = args.start if args.start is not None else 0
        subject = args.subject or "physics"
        print(f"arXiv start={start} subject={subject}: {args.query}")
        total += fetch_arxiv(
            args.query,
            max_results=args.max,
            domain=args.domain,
            subject=subject,
            concepts=SUBJECT_CONCEPTS.get(subject),
            out_dir=args.out_dir,
            start=start,
        )
    elif args.subject:
        total += fetch_subject(
            args.subject,
            max_per_query=args.max,
            out_dir=args.out_dir,
            start_override=args.start,
        )
    elif args.all_domains:
        for domain, query in DEFAULT_QUERIES.items():
            start = args.start if args.start is not None else DEFAULT_START.get(domain, 0)
            print(f"\narXiv [{domain}] start={start}: {query}")
            total += fetch_arxiv(
                query,
                max_results=args.max,
                domain=domain,
                subject="physics",
                out_dir=args.out_dir,
                start=start,
            )
            time.sleep(10)
    else:
        query = DEFAULT_QUERIES[args.domain]
        start = args.start if args.start is not None else 0
        print(f"arXiv start={start}: {query}")
        total += fetch_arxiv(
            query,
            max_results=args.max,
            domain=args.domain,
            subject="physics",
            out_dir=args.out_dir,
            start=start,
        )

    print(f"\nSaved {total} arXiv documents to {args.out_dir}")


if __name__ == "__main__":
    main()
