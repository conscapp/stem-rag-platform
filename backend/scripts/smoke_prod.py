#!/usr/bin/env python3
"""Production / staging smoke checks for conscRAG API.

Usage:
  python scripts/smoke_prod.py --base-url http://127.0.0.1:8000
  python scripts/smoke_prod.py --base-url https://your-api.up.railway.app
"""

from __future__ import annotations

import argparse
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-test conscRAG API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--timeout", type=float, default=300.0)
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    failed = 0

    with httpx.Client(timeout=args.timeout, follow_redirects=True) as client:
        print(f"GET {base}/api/health")
        health = client.get(f"{base}/api/health")
        print(f"  {health.status_code} {health.text[:300]}")
        if health.status_code != 200:
            failed += 1
        else:
            data = health.json()
            if data.get("qdrant") != "ok":
                print("  FAIL: qdrant not ok")
                failed += 1
            if data.get("supabase") not in ("ok", "not_configured"):
                print("  FAIL: unexpected supabase status")
                failed += 1

        print(f"POST {base}/api/query (may take 1–3 minutes)")
        try:
            query = client.post(
                f"{base}/api/query",
                json={
                    "query": "nuclear energy at room temperature what conditions matter?",
                    "domain": "clean_energy",
                    "proof_mode": False,
                },
            )
        except httpx.TimeoutException as exc:
            print(f"  FAIL: query timed out ({exc})")
            failed += 1
        else:
            print(f"  {query.status_code}")
            if query.status_code != 200:
                print(f"  {query.text[:500]}")
                failed += 1
            else:
                body = query.json()
                agents = body.get("agents") or []
                sources = body.get("sources") or []
                print(f"  agents={len(agents)} sources={len(sources)}")
                if "answer" not in body or not body["answer"]:
                    print("  FAIL: empty answer")
                    failed += 1
                if len(sources) < 1:
                    print("  FAIL: no sources")
                    failed += 1

        print(f"POST {base}/api/posts (expect 422 without consent)")
        try:
            bad = client.post(
                f"{base}/api/posts",
                json={
                    "title": "Smoke test should fail",
                    "content_markdown": "This submission omits publish consent on purpose.",
                    "domain": "aerospace",
                    "terms_accepted": True,
                    "terms_version": "1.0",
                    "publish_consent": False,
                },
            )
            print(f"  {bad.status_code}")
            if bad.status_code not in (422, 400):
                print("  FAIL: expected validation error for publish_consent=false")
                failed += 1
        except httpx.TimeoutException as exc:
            print(f"  FAIL: posts check timed out ({exc})")
            failed += 1

    if failed:
        print(f"\nFAILED checks: {failed}")
        return 1
    print("\nAll smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
