import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { clamp } from "@/lib/fieldplay/outcome";
import type { BoardRecord, PersistedEdge, PersistedNode } from "@/lib/fieldplay/storage";
import type { CardData, Mode, RelationData, Scores } from "@/lib/fieldplay/types";
import { isEdgeKind } from "@/lib/fieldplay/types";

export type PaperNode = Node<CardData, "paper">;
export type RelationEdge = Edge<RelationData, "relation">;

export interface BoardState {
  boardId: string;
  name: string;
  question: string;
  mode: Mode;
  dials: Scores;
  nodes: PaperNode[];
  edges: RelationEdge[];
  past: BoardSnap[];
  future: BoardSnap[];
}

export interface BoardSnap {
  boardId: string;
  name: string;
  question: string;
  mode: Mode;
  dials: Scores;
  nodes: PaperNode[];
  edges: RelationEdge[];
}

export type BoardAction =
  | { type: "nodes"; changes: NodeChange<PaperNode>[] }
  | { type: "edges"; changes: EdgeChange<RelationEdge>[] }
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "delete-selected" }
  | { type: "patch-node"; id: string; patch: Partial<CardData>; history: boolean }
  | { type: "patch-edge"; id: string; patch: Partial<RelationData>; history: boolean }
  | { type: "remove-edge"; id: string }
  | { type: "connect"; edge: RelationEdge }
  | { type: "add-cards"; nodes: PaperNode[]; edges: RelationEdge[] }
  | { type: "set-question"; question: string; history: boolean }
  | { type: "set-name"; name: string; history: boolean }
  | { type: "set-mode"; mode: Mode; seed: Scores }
  | { type: "set-dial"; key: keyof Scores; value: number; history: boolean }
  | { type: "load"; state: BoardState };

function snap(state: BoardState): BoardSnap {
  return {
    boardId: state.boardId,
    name: state.name,
    question: state.question,
    mode: state.mode,
    dials: state.dials,
    nodes: state.nodes,
    edges: state.edges,
  };
}

function push(state: BoardState): BoardState {
  return {
    ...state,
    past: [...state.past, snap(state)].slice(-80),
    future: [],
  };
}

function cleanNodePatch(patch: Partial<CardData>): Partial<CardData> {
  const next: Partial<CardData> = { ...patch };
  if (typeof next.influence === "number") next.influence = Math.round(clamp(next.influence, 0, 100));
  if (typeof next.citedByCount === "number") next.citedByCount = Math.max(0, next.citedByCount);
  if (typeof next.title === "string") next.title = next.title.slice(0, 300);
  if (typeof next.year === "number" && !Number.isFinite(next.year)) next.year = null;
  if (Array.isArray(next.topics)) {
    next.topics = next.topics.filter((topic) => typeof topic === "string").slice(0, 24);
  }
  return next;
}

function cleanEdgePatch(patch: Partial<RelationData>): Partial<RelationData> {
  const next: Partial<RelationData> = {};
  if (isEdgeKind(patch.kind)) next.kind = patch.kind;
  if (typeof patch.weight === "number") next.weight = Math.round(clamp(patch.weight, 0.1, 2) * 10) / 10;
  if (typeof patch.dropped === "boolean") next.dropped = patch.dropped;
  if (typeof patch.label === "string") next.label = patch.label.slice(0, 80);
  return next;
}

export function createEmptyBoard(id = crypto.randomUUID()): BoardState {
  return {
    boardId: id,
    name: "Untitled board",
    question: "",
    mode: "simulate",
    dials: { confidence: 0, consensus: 100, novelty: 40, impact: 0 },
    nodes: [],
    edges: [],
    past: [],
    future: [],
  };
}

export function boardFromRecord(record: BoardRecord): BoardState {
  return {
    boardId: record.id,
    name: record.name,
    question: record.question,
    mode: record.mode,
    dials: record.dials,
    nodes: record.nodes.map(flowNode),
    edges: record.edges.map(flowEdge),
    past: [],
    future: [],
  };
}

export function flowNode(node: PersistedNode): PaperNode {
  return {
    id: node.id,
    type: "paper",
    position: node.position,
    data: node.data,
  };
}

export function flowEdge(edge: PersistedEdge): RelationEdge {
  return {
    id: edge.id,
    type: "relation",
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: edge.data,
  };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "nodes":
      return { ...state, nodes: applyNodeChanges(action.changes, state.nodes) };
    case "edges":
      return { ...state, edges: applyEdgeChanges(action.changes, state.edges) };
    case "checkpoint":
      return push(state);
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return { ...previous, past: state.past.slice(0, -1), future: [...state.future, snap(state)] };
    }
    case "redo": {
      const next = state.future[state.future.length - 1];
      if (!next) return state;
      return { ...next, past: [...state.past, snap(state)], future: state.future.slice(0, -1) };
    }
    case "delete-selected": {
      const nodes = state.nodes.filter((node) => !node.selected);
      if (nodes.length === state.nodes.length && !state.edges.some((edge) => edge.selected)) return state;
      const ids = new Set(nodes.map((node) => node.id));
      const base = push(state);
      return {
        ...base,
        nodes,
        edges: base.edges.filter((edge) => !edge.selected && ids.has(edge.source) && ids.has(edge.target)),
      };
    }
    case "patch-node": {
      if (!state.nodes.some((node) => node.id === action.id)) return state;
      const patch = cleanNodePatch(action.patch);
      const base = action.history ? push(state) : state;
      return {
        ...base,
        nodes: base.nodes.map((node) =>
          node.id === action.id ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      };
    }
    case "patch-edge": {
      if (!state.edges.some((edge) => edge.id === action.id)) return state;
      const patch = cleanEdgePatch(action.patch);
      const base = action.history ? push(state) : state;
      return {
        ...base,
        edges: base.edges.map((edge) =>
          edge.id === action.id
            ? {
                ...edge,
                data: {
                  kind: "supports",
                  weight: 1,
                  dropped: false,
                  label: "",
                  ...edge.data,
                  ...patch,
                },
              }
            : edge,
        ),
      };
    }
    case "remove-edge": {
      if (!state.edges.some((edge) => edge.id === action.id)) return state;
      const base = push(state);
      return { ...base, edges: base.edges.filter((edge) => edge.id !== action.id) };
    }
    case "connect": {
      const duplicate = state.edges.some(
        (edge) =>
          (edge.source === action.edge.source && edge.target === action.edge.target) ||
          (edge.source === action.edge.target && edge.target === action.edge.source),
      );
      if (duplicate || action.edge.source === action.edge.target) return state;
      const base = push(state);
      return {
        ...base,
        edges: [...base.edges.map((edge) => ({ ...edge, selected: false })), { ...action.edge, selected: true }],
      };
    }
    case "add-cards": {
      if (action.nodes.length === 0) return state;
      const base = push(state);
      const ids = new Set(base.nodes.map((node) => node.id));
      const nodes = action.nodes.filter((node) => !ids.has(node.id));
      if (nodes.length === 0) return state;
      return {
        ...base,
        nodes: [...base.nodes.map((node) => ({ ...node, selected: false })), ...nodes],
        edges: [...base.edges, ...action.edges],
      };
    }
    case "set-question": {
      const question = action.question.slice(0, 400);
      if (question === state.question) return state;
      const base = action.history ? push(state) : state;
      return { ...base, question };
    }
    case "set-name": {
      const name = action.name.slice(0, 80);
      if (name === state.name) return state;
      const base = action.history ? push(state) : state;
      return { ...base, name };
    }
    case "set-mode": {
      if (action.mode === state.mode) return state;
      const base = push(state);
      if (action.mode === "direct") {
        return {
          ...base,
          mode: "direct",
          dials: {
            confidence: Math.round(clamp(action.seed.confidence, 0, 100)),
            consensus: Math.round(clamp(action.seed.consensus, 0, 100)),
            novelty: Math.round(clamp(action.seed.novelty, 0, 100)),
            impact: Math.round(clamp(action.seed.impact, 0, 100)),
          },
        };
      }
      return { ...base, mode: "simulate" };
    }
    case "set-dial": {
      if (state.mode !== "direct") return state;
      const value = Math.round(clamp(action.value, 0, 100));
      if (state.dials[action.key] === value) return state;
      const base = action.history ? push(state) : state;
      return { ...base, dials: { ...base.dials, [action.key]: value } };
    }
    case "load":
      return { ...action.state, past: [], future: [] };
    default:
      return state;
  }
}
