import type { CardKind } from "./types";

export interface OpenAlexWork {
  id: string;
  title: string;
  year: number | null;
  citedByCount: number;
  firstAuthor: string;
  abstract: string;
  topics: string[];
  referencedWorks: string[];
  doi: string | null;
  url: string | null;
  venue: string | null;
}

export interface CiteCard {
  id: string;
  openAlexId: string | null;
  referencedWorks: string[];
}

const ABSTRACT_LIMIT = 1500;
const TOPIC_LIMIT = 24;
const REFERENCE_LIMIT = 800;

export function openAlexWorkId(id: unknown): string | null {
  if (typeof id !== "string" || !id.trim()) return null;
  const match = id.match(/W\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export function reconstructAbstract(index: unknown): string {
  if (!index || typeof index !== "object") return "";
  const slots: string[] = [];
  for (const [word, positions] of Object.entries(index as Record<string, unknown>)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (typeof position === "number" && position >= 0 && position < 20000) {
        slots[position] = word;
      }
    }
  }
  return slots
    .filter((word) => typeof word === "string")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ABSTRACT_LIMIT);
}

function displayNames(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const names: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || !("display_name" in item)) continue;
    const name = String((item as { display_name?: unknown }).display_name ?? "").trim();
    if (name) names.push(name);
  }
  return names;
}

function uniqueTopics(topics: string[], concepts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...topics, ...concepts]) {
    const key = name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= TOPIC_LIMIT) break;
  }
  return out;
}

function firstAuthor(authorships: unknown): string {
  if (!Array.isArray(authorships) || authorships.length === 0) return "Unknown author";
  const first =
    authorships.find(
      (item) =>
        !!item &&
        typeof item === "object" &&
        (item as { author_position?: unknown }).author_position === "first",
    ) ?? authorships[0];
  if (!first || typeof first !== "object") return "Unknown author";
  const author = (first as { author?: { display_name?: unknown } }).author;
  const name = typeof author?.display_name === "string" ? author.display_name.trim() : "";
  return name || "Unknown author";
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function normalizeWork(raw: unknown): OpenAlexWork | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = openAlexWorkId(record.id);
  const title = typeof record.display_name === "string" ? record.display_name.trim() : "";
  if (!id || !title) return null;

  const year =
    typeof record.publication_year === "number" && Number.isFinite(record.publication_year)
      ? record.publication_year
      : null;
  const citedByCount =
    typeof record.cited_by_count === "number" && Number.isFinite(record.cited_by_count)
      ? Math.max(0, record.cited_by_count)
      : 0;
  const location =
    record.primary_location && typeof record.primary_location === "object"
      ? (record.primary_location as Record<string, unknown>)
      : null;
  const source =
    location?.source && typeof location.source === "object"
      ? (location.source as Record<string, unknown>)
      : null;
  const venue = typeof source?.display_name === "string" ? source.display_name.trim() : "";
  const doi = httpUrl(record.doi);
  const landing = httpUrl(location?.landing_page_url);
  const referenced = Array.isArray(record.referenced_works)
    ? record.referenced_works
        .map((item) => openAlexWorkId(item))
        .filter((item): item is string => !!item)
        .slice(0, REFERENCE_LIMIT)
    : [];

  return {
    id,
    title: title.slice(0, 300),
    year,
    citedByCount,
    firstAuthor: firstAuthor(record.authorships),
    abstract: reconstructAbstract(record.abstract_inverted_index),
    topics: uniqueTopics(displayNames(record.topics), displayNames(record.concepts)),
    referencedWorks: referenced,
    doi,
    url: landing ?? doi,
    venue: venue || null,
  };
}

export function supportsFromCitations(
  incoming: CiteCard,
  existing: CiteCard[],
  already: { source: string; target: string }[],
): { source: string; target: string }[] {
  if (!incoming.openAlexId) return [];
  const hasPair = (a: string, b: string) =>
    already.some(
      (edge) => (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a),
    );
  const created: { source: string; target: string }[] = [];
  for (const other of existing) {
    if (!other.openAlexId || other.id === incoming.id) continue;
    const incomingCitesOther = incoming.referencedWorks.includes(other.openAlexId);
    const otherCitesIncoming = other.referencedWorks.includes(incoming.openAlexId);
    if (!incomingCitesOther && !otherCitesIncoming) continue;
    const source = incomingCitesOther ? incoming.id : other.id;
    const target = incomingCitesOther ? other.id : incoming.id;
    if (hasPair(source, target) || created.some((edge) => hasPair(edge.source, edge.target) && (edge.source === source || edge.target === source))) {
      continue;
    }
    if (
      created.some(
        (edge) =>
          (edge.source === source && edge.target === target) ||
          (edge.source === target && edge.target === source),
      )
    ) {
      continue;
    }
    created.push({ source, target });
  }
  return created;
}

export function customCardTitle(kind: Exclude<CardKind, "paper">): string {
  if (kind === "hypothesis") return "New hypothesis";
  if (kind === "claim") return "New claim";
  return "Note";
}
