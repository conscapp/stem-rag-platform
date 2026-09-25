import type { CardData, CardKind, Mode, RelationData, Scores } from "./types";
import { isEdgeKind } from "./types";

export const FIELDPLAY_STORAGE_KEY = "fieldplay.boards.v1";

export interface PersistedNode {
  id: string;
  position: { x: number; y: number };
  data: CardData;
}

export interface PersistedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data: RelationData;
}

export interface BoardRecord {
  id: string;
  name: string;
  updatedAt: string;
  question: string;
  mode: Mode;
  dials: Scores;
  nodes: PersistedNode[];
  edges: PersistedEdge[];
}

export interface BoardFileV1 {
  version: 1;
  activeId: string;
  boards: BoardRecord[];
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function asCard(data: unknown): CardData | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Partial<CardData>;
  if (typeof record.title !== "string" || !record.title.trim()) return null;
  const kind: CardKind =
    record.kind === "hypothesis" || record.kind === "claim" || record.kind === "note" || record.kind === "paper"
      ? record.kind
      : "paper";
  return {
    kind,
    title: record.title.trim().slice(0, 300),
    year: typeof record.year === "number" && Number.isFinite(record.year) ? record.year : null,
    citedByCount: asNumber(record.citedByCount, 0, 0, 1e12),
    influence: asNumber(record.influence, 50, 0, 100),
    muted: record.muted === true,
    solo: record.solo === true,
    topics: Array.isArray(record.topics)
      ? record.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 24)
      : [],
    abstract: typeof record.abstract === "string" ? record.abstract.slice(0, 1500) : "",
    firstAuthor: typeof record.firstAuthor === "string" ? record.firstAuthor.slice(0, 200) : "",
    openAlexId: typeof record.openAlexId === "string" ? record.openAlexId : null,
    referencedWorks: Array.isArray(record.referencedWorks)
      ? record.referencedWorks.filter((id): id is string => typeof id === "string").slice(0, 800)
      : [],
    doi: typeof record.doi === "string" ? record.doi : null,
    url: typeof record.url === "string" ? record.url : null,
    venue: typeof record.venue === "string" ? record.venue : null,
  };
}

function asNode(value: unknown): PersistedNode | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedNode>;
  if (typeof record.id !== "string" || !record.id) return null;
  const data = asCard(record.data);
  if (!data) return null;
  const position = record.position;
  const x = position && typeof position.x === "number" && Number.isFinite(position.x) ? position.x : 0;
  const y = position && typeof position.y === "number" && Number.isFinite(position.y) ? position.y : 0;
  return { id: record.id, position: { x, y }, data };
}

function asEdge(value: unknown, nodeIds: Set<string>): PersistedEdge | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedEdge>;
  if (typeof record.id !== "string" || typeof record.source !== "string" || typeof record.target !== "string") {
    return null;
  }
  if (!nodeIds.has(record.source) || !nodeIds.has(record.target)) return null;
  const data = record.data;
  if (!data || typeof data !== "object") return null;
  const kind = isEdgeKind(data.kind) ? data.kind : "supports";
  return {
    id: record.id,
    source: record.source,
    target: record.target,
    sourceHandle: typeof record.sourceHandle === "string" ? record.sourceHandle : null,
    targetHandle: typeof record.targetHandle === "string" ? record.targetHandle : null,
    data: {
      kind,
      weight: asNumber(data.weight, 1, 0.1, 2),
      dropped: data.dropped === true,
      label: typeof data.label === "string" ? data.label.slice(0, 80) : "",
    },
  };
}

function asScores(value: unknown): Scores {
  const record = value && typeof value === "object" ? (value as Partial<Scores>) : {};
  return {
    confidence: asNumber(record.confidence, 0, 0, 100),
    consensus: asNumber(record.consensus, 100, 0, 100),
    novelty: asNumber(record.novelty, 40, 0, 100),
    impact: asNumber(record.impact, 0, 0, 100),
  };
}

function asBoard(value: unknown): BoardRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<BoardRecord>;
  if (typeof record.id !== "string" || !record.id) return null;
  if (!Array.isArray(record.nodes) || !Array.isArray(record.edges)) return null;
  const nodes = record.nodes.map(asNode).filter((node): node is PersistedNode => !!node);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = record.edges.map((edge) => asEdge(edge, nodeIds)).filter((edge): edge is PersistedEdge => !!edge);
  return {
    id: record.id,
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim().slice(0, 80) : "Untitled board",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date(0).toISOString(),
    question: typeof record.question === "string" ? record.question.slice(0, 400) : "",
    mode: record.mode === "direct" ? "direct" : "simulate",
    dials: asScores(record.dials),
    nodes,
    edges,
  };
}

export function parseBoardFile(raw: unknown): BoardFileV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<BoardFileV1>;
  if (record.version !== 1 || !Array.isArray(record.boards)) return null;
  const boards = record.boards.map(asBoard).filter((board): board is BoardRecord => !!board);
  if (boards.length === 0) return null;
  const activeId = boards.some((board) => board.id === record.activeId) ? (record.activeId as string) : boards[0].id;
  return { version: 1, activeId, boards };
}

export function loadBoardFile(): BoardFileV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const text = localStorage.getItem(FIELDPLAY_STORAGE_KEY);
    if (!text) return null;
    return parseBoardFile(JSON.parse(text));
  } catch {
    return null;
  }
}

export function writeBoardFile(file: BoardFileV1): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(FIELDPLAY_STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function upsertBoard(file: BoardFileV1 | null, record: BoardRecord): BoardFileV1 {
  const boards = file ? file.boards.filter((board) => board.id !== record.id) : [];
  boards.unshift(record);
  boards.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return { version: 1, activeId: record.id, boards: boards.slice(0, 24) };
}
