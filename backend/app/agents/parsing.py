"""Parse agent outputs for retrieval gaps."""

from __future__ import annotations

import re

RETRIEVAL_GAPS_PATTERN = re.compile(
    r"RETRIEVAL_GAPS:\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)


def parse_retrieval_gaps(report: str) -> list[str]:
    match = RETRIEVAL_GAPS_PATTERN.search(report)
    if not match:
        return []
    raw = match.group(1).strip()
    if raw.lower() in ("none", "n/a", "-", ""):
        return []
    terms = [t.strip() for t in re.split(r"[,;]", raw) if t.strip()]
    return terms[:5]
