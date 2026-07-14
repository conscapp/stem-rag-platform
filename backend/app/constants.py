"""Shared constants for conscRAG innovation platform — The consc company."""

VALID_SUBJECTS = frozenset({"physics", "chemistry", "math", "engineering"})

VALID_DOMAINS = frozenset({"aerospace", "nanotechnology", "clean_energy"})

# Legacy alias for existing DB rows / old API clients
DOMAIN_ALIASES: dict[str, str] = {"energy": "clean_energy"}

DOMAIN_LABELS: dict[str, str] = {
    "aerospace": "Aerospace",
    "nanotechnology": "Nanotechnology",
    "clean_energy": "Nuclear Fusion",
}

SUBJECT_LABELS: dict[str, str] = {
    "physics": "Physics",
    "chemistry": "Chemistry",
    "math": "Math",
    "engineering": "Engineering",
}

COMPANY_NAME = "The consc company"
PRODUCT_NAME = "conscRAG"
SITE_DOMAIN = "conscrag.com"


def normalize_domain(domain: str) -> str:
    d = domain.lower().strip()
    return DOMAIN_ALIASES.get(d, d)
