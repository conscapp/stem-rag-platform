import {
  boardReducer,
  flowEdge,
  flowNode,
  type BoardAction,
  type BoardSnap,
  type BoardState,
  type PaperNode,
  type RelationEdge,
} from "../../components/fieldplay/reducer";
import type { PersistedEdge, PersistedNode } from "./storage";
import { createFixtureGraph, FIXTURE_QUESTION } from "./fixture";
import type { Mode, Scores } from "./types";
import { isEdgeKind } from "./types";

/** Tab session only. Never the Fieldplay board library. */
export const EXPERIMENT_STORAGE_KEY = "fieldplay.experiments.v1";

export interface ExperimentState {
  version: 1;
  slots: BoardState[];
}

export type ExperimentAction =
  | { type: "slot"; id: string; action: BoardAction }
  | { type: "add"; id?: string }
  | { type: "reset"; id: string }
  | { type: "duplicate"; id: string; newId?: string }
  | { type: "hydrate"; state: ExperimentState };

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface PersistedSnap {
  boardId: string;
  name: string;
  question: string;
  mode: Mode;
  dials: Scores;
  nodes: PersistedNode[];
  edges: PersistedEdge[];
}

interface PersistedSlot {
  boardId: string;
  name: string;
  question: string;
  mode: Mode;
  dials: Scores;
  nodes: PersistedNode[];
  edges: PersistedEdge[];
  past: PersistedSnap[];
  future: PersistedSnap[];
}

interface PersistedFile {
  version: 1;
  slots: PersistedSlot[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function newId(): string {
  return crypto.randomUUID();
}

export function nextExperimentName(names: readonly string[]): string {
  for (const letter of LETTERS) {
    const name = `Experiment ${letter}`;
    if (!names.includes(name)) return name;
  }
  return `Experiment ${names.length + 1}`;
}

function duplicateName(source: string, names: readonly string[]): string {
  const base = `${source} copy`;
  if (!names.includes(base)) return base;
  let index = 2;
  while (names.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

export function createExperimentSlot(name: string, id: string): BoardState {
  const graph = createFixtureGraph(id);
  return {
    boardId: id,
    name,
    question: FIXTURE_QUESTION,
    mode: "simulate",
    dials: { confidence: 0, consensus: 100, novelty: 40, impact: 0 },
    nodes: graph.nodes,
    edges: graph.edges,
    past: [],
    future: [],
  };
}

export function createExperimentFile(idFor: () => string = newId): ExperimentState {
  const slots: BoardState[] = [];
  for (let index = 0; index < 3; index += 1) {
    slots.push(createExperimentSlot(nextExperimentName(slots.map((slot) => slot.name)), idFor()));
  }
  return { version: 1, slots };
}

export function resetSlot(slot: BoardState): BoardState {
  return createExperimentSlot(slot.name, slot.boardId);
}

function remapGraph(
  nodes: PaperNode[],
  edges: RelationEdge[],
  map: Map<string, string>,
): { nodes: PaperNode[]; edges: RelationEdge[] } {
  return {
    nodes: nodes.map((node) => ({ ...node, id: map.get(node.id) ?? node.id })),
    edges: edges.map((edge) => ({
      ...edge,
      id: map.get(edge.id) ?? edge.id,
      source: map.get(edge.source) ?? edge.source,
      target: map.get(edge.target) ?? edge.target,
    })),
  };
}

function collectIds(slot: BoardState, into: Map<string, string>, slotId: string) {
  const graphs = [slot, ...slot.past, ...slot.future];
  for (const graph of graphs) {
    graph.nodes.forEach((node) => {
      if (!into.has(node.id)) into.set(node.id, `${slotId}:n${into.size}`);
    });
    graph.edges.forEach((edge) => {
      if (!into.has(edge.id)) into.set(edge.id, `${slotId}:e${into.size}`);
    });
  }
}

export function duplicateSlot(slot: BoardState, name: string, id: string): BoardState {
  const cloned = structuredClone(slot);
  const map = new Map<string, string>();
  collectIds(cloned, map, id);
  const graph = remapGraph(cloned.nodes, cloned.edges, map);
  const snapOf = (snap: BoardSnap): BoardSnap => {
    const remapped = remapGraph(snap.nodes, snap.edges, map);
    return {
      boardId: id,
      name,
      question: snap.question,
      mode: snap.mode,
      dials: { ...snap.dials },
      nodes: remapped.nodes,
      edges: remapped.edges,
    };
  };
  return {
    boardId: id,
    name,
    question: cloned.question,
    mode: cloned.mode,
    dials: { ...cloned.dials },
    nodes: graph.nodes,
    edges: graph.edges,
    past: cloned.past.map(snapOf),
    future: cloned.future.map(snapOf),
  };
}

export function experimentReducer(state: ExperimentState, action: ExperimentAction): ExperimentState {
  switch (action.type) {
    case "slot": {
      let changed = false;
      const slots = state.slots.map((slot) => {
        if (slot.boardId !== action.id) return slot;
        const next = boardReducer(slot, action.action);
        if (next === slot) return slot;
        changed = true;
        return next;
      });
      return changed ? { ...state, slots } : state;
    }
    case "add":
      return {
        ...state,
        slots: [
          ...state.slots,
          createExperimentSlot(nextExperimentName(state.slots.map((slot) => slot.name)), action.id ?? newId()),
        ],
      };
    case "reset": {
      let changed = false;
      const slots = state.slots.map((slot) => {
        if (slot.boardId !== action.id) return slot;
        changed = true;
        return resetSlot(slot);
      });
      return changed ? { ...state, slots } : state;
    }
    case "duplicate": {
      const index = state.slots.findIndex((slot) => slot.boardId === action.id);
      if (index < 0) return state;
      const source = state.slots[index];
      const copy = duplicateSlot(
        source,
        duplicateName(source.name, state.slots.map((slot) => slot.name)),
        action.newId ?? newId(),
      );
      const slots = state.slots.slice();
      slots.splice(index + 1, 0, copy);
      return { ...state, slots };
    }
    case "hydrate":
      return action.state.version === 1 && action.state.slots.length > 0 ? action.state : state;
    default:
      return state;
  }
}

function persistedNode(node: PaperNode): PersistedNode {
  return {
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
    data: node.data,
  };
}

function persistedEdge(edge: RelationEdge): PersistedEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: edge.data ?? { kind: "supports", weight: 1, dropped: false, label: "" },
  };
}

function persistedSnap(snap: BoardSnap): PersistedSnap {
  return {
    boardId: snap.boardId,
    name: snap.name,
    question: snap.question,
    mode: snap.mode,
    dials: snap.dials,
    nodes: snap.nodes.map(persistedNode),
    edges: snap.edges.map(persistedEdge),
  };
}

function persistSlot(slot: BoardState): PersistedSlot {
  return {
    boardId: slot.boardId,
    name: slot.name,
    question: slot.question,
    mode: slot.mode,
    dials: slot.dials,
    nodes: slot.nodes.map(persistedNode),
    edges: slot.edges.map(persistedEdge),
    past: slot.past.map(persistedSnap),
    future: slot.future.map(persistedSnap),
  };
}

function asScore(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

function asScores(value: unknown, fallback: Scores): Scores {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Partial<Scores>;
  return {
    confidence: asScore(record.confidence, fallback.confidence),
    consensus: asScore(record.consensus, fallback.consensus),
    novelty: asScore(record.novelty, fallback.novelty),
    impact: asScore(record.impact, fallback.impact),
  };
}

function asNode(value: unknown): PersistedNode | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedNode>;
  if (typeof record.id !== "string" || !record.id) return null;
  const data = record.data;
  if (!data || typeof data !== "object" || typeof data.title !== "string" || !data.title.trim()) return null;
  const position = record.position;
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") return null;
  return {
    id: record.id,
    position: { x: position.x, y: position.y },
    data: {
      kind:
        data.kind === "hypothesis" || data.kind === "claim" || data.kind === "note" || data.kind === "paper"
          ? data.kind
          : "paper",
      title: data.title.trim().slice(0, 300),
      year: typeof data.year === "number" && Number.isFinite(data.year) ? data.year : null,
      citedByCount: typeof data.citedByCount === "number" && data.citedByCount > 0 ? data.citedByCount : 0,
      influence: asScore(data.influence, 50),
      muted: data.muted === true,
      solo: data.solo === true,
      topics: Array.isArray(data.topics) ? data.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 24) : [],
      abstract: typeof data.abstract === "string" ? data.abstract.slice(0, 1500) : "",
      firstAuthor: typeof data.firstAuthor === "string" ? data.firstAuthor.slice(0, 200) : "",
      openAlexId: typeof data.openAlexId === "string" ? data.openAlexId : null,
      referencedWorks: Array.isArray(data.referencedWorks)
        ? data.referencedWorks.filter((id): id is string => typeof id === "string").slice(0, 800)
        : [],
      doi: typeof data.doi === "string" ? data.doi : null,
      url: typeof data.url === "string" ? data.url : null,
      venue: typeof data.venue === "string" ? data.venue : null,
    },
  };
}

function asEdge(value: unknown): PersistedEdge | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedEdge>;
  if (typeof record.id !== "string" || typeof record.source !== "string" || typeof record.target !== "string") return null;
  const data = record.data;
  return {
    id: record.id,
    source: record.source,
    target: record.target,
    sourceHandle: typeof record.sourceHandle === "string" ? record.sourceHandle : null,
    targetHandle: typeof record.targetHandle === "string" ? record.targetHandle : null,
    data: {
      kind: data && isEdgeKind(data.kind) ? data.kind : "supports",
      weight: data && typeof data.weight === "number" ? Math.min(2, Math.max(0.1, data.weight)) : 1,
      dropped: data?.dropped === true,
      label: data && typeof data.label === "string" ? data.label.slice(0, 80) : "",
    },
  };
}

function asSnap(value: unknown, fallbackId: string): BoardSnap | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedSnap>;
  const nodes = Array.isArray(record.nodes) ? record.nodes.map(asNode).filter((node): node is PersistedNode => !!node) : null;
  const edges = Array.isArray(record.edges) ? record.edges.map(asEdge).filter((edge): edge is PersistedEdge => !!edge) : null;
  if (!nodes || !edges) return null;
  const mode: Mode = record.mode === "direct" ? "direct" : "simulate";
  return {
    boardId: typeof record.boardId === "string" ? record.boardId : fallbackId,
    name: typeof record.name === "string" ? record.name.slice(0, 80) : "Experiment",
    question: typeof record.question === "string" ? record.question.slice(0, 400) : "",
    mode,
    dials: asScores(record.dials, { confidence: 0, consensus: 100, novelty: 40, impact: 0 }),
    nodes: nodes.map(flowNode),
    edges: edges.map(flowEdge),
  };
}

function asSlot(value: unknown): BoardState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedSlot>;
  if (typeof record.boardId !== "string" || !record.boardId) return null;
  const nodes = Array.isArray(record.nodes) ? record.nodes.map(asNode).filter((node): node is PersistedNode => !!node) : [];
  const edges = Array.isArray(record.edges) ? record.edges.map(asEdge).filter((edge): edge is PersistedEdge => !!edge) : [];
  if (nodes.length === 0) return null;
  const mode: Mode = record.mode === "direct" ? "direct" : "simulate";
  const past = Array.isArray(record.past)
    ? record.past.map((snap) => asSnap(snap, record.boardId as string)).filter((snap): snap is BoardSnap => !!snap)
    : [];
  const future = Array.isArray(record.future)
    ? record.future.map((snap) => asSnap(snap, record.boardId as string)).filter((snap): snap is BoardSnap => !!snap)
    : [];
  return {
    boardId: record.boardId,
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim().slice(0, 80) : "Experiment",
    question: typeof record.question === "string" ? record.question.slice(0, 400) : FIXTURE_QUESTION,
    mode,
    dials: asScores(record.dials, { confidence: 0, consensus: 100, novelty: 40, impact: 0 }),
    nodes: nodes.map(flowNode),
    edges: edges.map(flowEdge),
    past,
    future,
  };
}

export function parseExperimentFile(value: unknown): ExperimentState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PersistedFile>;
  if (record.version !== 1 || !Array.isArray(record.slots)) return null;
  const slots = record.slots.map(asSlot).filter((slot): slot is BoardState => !!slot);
  if (slots.length === 0) return null;
  return { version: 1, slots };
}

export function readExperiments(storage: KeyValueStore | null): ExperimentState {
  if (!storage) return createExperimentFile();
  try {
    const raw = storage.getItem(EXPERIMENT_STORAGE_KEY);
    if (!raw) return createExperimentFile();
    return parseExperimentFile(JSON.parse(raw)) ?? createExperimentFile();
  } catch {
    return createExperimentFile();
  }
}

export function writeExperiments(storage: KeyValueStore, state: ExperimentState): boolean {
  const file: PersistedFile = { version: 1, slots: state.slots.map(persistSlot) };
  try {
    storage.setItem(EXPERIMENT_STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}
