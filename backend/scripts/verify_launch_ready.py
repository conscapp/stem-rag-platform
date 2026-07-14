#!/usr/bin/env python3
"""Verify repo-side launch readiness (no cloud credentials required)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def check(path: Path, label: str) -> bool:
    ok = path.exists()
    print(f"{'OK' if ok else 'MISSING':8} {label}: {path.relative_to(ROOT)}")
    return ok


def main() -> int:
    required = [
        (ROOT / "backend" / "Dockerfile", "Dockerfile"),
        (ROOT / "railway.toml", "railway.toml"),
        (ROOT / "frontend" / "vercel.json", "vercel.json"),
        (ROOT / "DEPLOY.md", "DEPLOY.md"),
        (ROOT / "LAUNCH.md", "LAUNCH.md"),
        (ROOT / "data" / "ontology" / "stem_concepts.yaml", "ontology"),
        (ROOT / "data" / "index" / "bm25_corpus.json", "BM25 index"),
        (ROOT / "supabase" / "schema.sql", "schema.sql"),
        (ROOT / "supabase" / "migration_domain.sql", "migration_domain.sql"),
        (ROOT / "supabase" / "migration_legal_consent.sql", "migration_legal_consent.sql"),
        (ROOT / "backend" / "scripts" / "smoke_prod.py", "smoke_prod.py"),
        (ROOT / "deploy" / "production.env.template", "prod env template"),
    ]
    failed = sum(1 for p, label in required if not check(p, label))

    # Spot-check API hardening
    posts = (ROOT / "backend" / "app" / "routes" / "posts.py").read_text(encoding="utf-8")
    schemas = (ROOT / "backend" / "app" / "models" / "schemas.py").read_text(encoding="utf-8")
    if '@limiter.limit("5/hour")' in posts:
        print("OK       rate limit on POST /posts")
    else:
        print("MISSING  rate limit on POST /posts")
        failed += 1
    if "must_consent_to_publish" in schemas:
        print("OK       publish_consent enforced")
    else:
        print("MISSING  publish_consent validator")
        failed += 1

    print()
    if failed:
        print(f"{failed} launch-readiness check(s) failed.")
        return 1
    print("Repo is launch-ready. Complete cloud steps in DEPLOY.md (Railway, Vercel, DNS, Supabase).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
