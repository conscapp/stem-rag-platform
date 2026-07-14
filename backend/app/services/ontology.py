"""STEM concept ontology — information-science cross-disciplinary linking layer."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

from app.constants import VALID_DOMAINS, VALID_SUBJECTS

_ONTOLOGY_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "ontology" / "stem_concepts.yaml"
)


@dataclass
class ConceptEntry:
    id: str
    aliases: list[str] = field(default_factory=list)
    subjects: list[str] = field(default_factory=list)
    domains: list[str] = field(default_factory=list)
    links: list[str] = field(default_factory=list)


@dataclass
class Ontology:
    concepts: dict[str, ConceptEntry]
    alias_index: dict[str, str]  # normalized alias -> concept id

    def match_concepts(self, text: str) -> list[str]:
        """Return concept IDs matched in text via aliases (longest match first)."""
        normalized = _normalize(text)
        if not normalized:
            return []

        matched: set[str] = set()
        padded = f" {normalized} "
        # Sort aliases by length descending to prefer longer phrases
        for alias, concept_id in sorted(
            self.alias_index.items(), key=lambda x: len(x[0]), reverse=True
        ):
            if not alias:
                continue
            if len(alias) <= 3:
                # Short aliases require word-boundary match to avoid false positives
                if f" {alias} " in padded:
                    matched.add(concept_id)
            elif alias in normalized:
                matched.add(concept_id)

        return sorted(matched)

    def subjects_for_concepts(self, concept_ids: list[str]) -> list[str]:
        subjects: set[str] = set()
        for cid in concept_ids:
            entry = self.concepts.get(cid)
            if entry:
                for s in entry.subjects:
                    if s in VALID_SUBJECTS:
                        subjects.add(s)
        return sorted(subjects)

    def domains_for_concepts(self, concept_ids: list[str]) -> list[str]:
        domains: set[str] = set()
        for cid in concept_ids:
            entry = self.concepts.get(cid)
            if entry:
                for d in entry.domains:
                    if d in VALID_DOMAINS:
                        domains.add(d)
        return sorted(domains)

    def related_concepts(self, concept_ids: list[str]) -> list[str]:
        related: set[str] = set()
        for cid in concept_ids:
            entry = self.concepts.get(cid)
            if entry:
                related.update(entry.links)
        related -= set(concept_ids)
        return sorted(related)

    def expand_subjects(self, query: str, explicit_subject: str | None = None) -> set[str]:
        """Expand retrieval to linked subjects when concepts span disciplines."""
        if explicit_subject:
            base = {explicit_subject.lower()}
        else:
            base = set(VALID_SUBJECTS)

        matched = self.match_concepts(query)
        for cid in matched:
            entry = self.concepts.get(cid)
            if entry:
                base.update(s for s in entry.subjects if s in VALID_SUBJECTS)

        if explicit_subject:
            # Still add cross-links from matched concepts even when one subject selected
            for cid in matched:
                entry = self.concepts.get(cid)
                if entry:
                    base.update(s for s in entry.subjects if s in VALID_SUBJECTS)

        return base

    def tag_text(
        self,
        text: str,
        subject: str,
        concept_overrides: list[str] | None = None,
        domain_overrides: list[str] | None = None,
    ) -> tuple[list[str], list[str], list[str]]:
        """Return (concepts, related_subjects, domains) for a chunk."""
        auto = self.match_concepts(text)
        if concept_overrides:
            concepts = sorted(set(auto) | set(concept_overrides))
        else:
            concepts = auto

        related_subjects = self.subjects_for_concepts(concepts)
        if subject in VALID_SUBJECTS and subject not in related_subjects:
            related_subjects = sorted(set(related_subjects) | {subject})

        domains = self.domains_for_concepts(concepts)
        if domain_overrides:
            domains = sorted(set(domains) | {d for d in domain_overrides if d in VALID_DOMAINS})

        return concepts, related_subjects, domains


def _normalize(text: str) -> str:
    """Lowercase and collapse whitespace for alias matching."""
    text = text.lower()
    text = re.sub(r"[^\w\s'=Δ]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _load_ontology(path: Path) -> Ontology:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    concepts: dict[str, ConceptEntry] = {}
    alias_index: dict[str, str] = {}

    for concept_id, data in raw.items():
        if not isinstance(data, dict):
            continue
        entry = ConceptEntry(
            id=concept_id,
            aliases=[str(a) for a in data.get("aliases", [])],
            subjects=[str(s).lower() for s in data.get("subjects", [])],
            domains=[str(d).lower() for d in data.get("domains", [])],
            links=[str(l) for l in data.get("links", [])],
        )
        concepts[concept_id] = entry
        alias_index[_normalize(concept_id.replace("_", " "))] = concept_id
        alias_index[_normalize(concept_id)] = concept_id
        for alias in entry.aliases:
            alias_index[_normalize(alias)] = concept_id

    return Ontology(concepts=concepts, alias_index=alias_index)


@lru_cache
def get_ontology() -> Ontology:
    if not _ONTOLOGY_PATH.exists():
        raise FileNotFoundError(f"STEM ontology not found: {_ONTOLOGY_PATH}")
    return _load_ontology(_ONTOLOGY_PATH)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse optional YAML frontmatter from markdown. Returns (metadata, body)."""
    if not text.startswith("---"):
        return {}, text

    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return {}, text

    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        meta = {}

    body = text[match.end() :]
    return meta if isinstance(meta, dict) else {}, body


def shannon_entropy(text: str) -> float:
    """Word-level Shannon entropy — higher means more information-dense vocabulary."""
    words = re.findall(r"[a-zA-Z]{2,}", text.lower())
    if len(words) < 3:
        return 0.0
    counts: dict[str, int] = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    total = len(words)
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy


def word_overlap_ratio(a: str, b: str) -> float:
    """Jaccard similarity on word sets."""
    words_a = set(re.findall(r"[a-zA-Z]{3,}", a.lower()))
    words_b = set(re.findall(r"[a-zA-Z]{3,}", b.lower()))
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)
