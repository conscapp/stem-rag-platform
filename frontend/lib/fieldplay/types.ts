export type Mode = "simulate" | "direct";

export interface Scores {
  confidence: number;
  consensus: number;
  novelty: number;
  impact: number;
}

export const EDGE_KINDS = ["supports", "contradicts", "extends", "causes"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export function isEdgeKind(value: unknown): value is EdgeKind {
  return typeof value === "string" && (EDGE_KINDS as readonly string[]).includes(value);
}

export type CardKind = "paper" | "hypothesis" | "claim" | "note";

export interface CardData extends Record<string, unknown> {
  kind: CardKind;
  title: string;
  year: number | null;
  citedByCount: number;
  influence: number;
  muted: boolean;
  solo: boolean;
  topics: string[];
  abstract: string;
  firstAuthor: string;
  openAlexId: string | null;
  referencedWorks: string[];
  doi: string | null;
  url: string | null;
  venue: string | null;
}

export interface RelationData extends Record<string, unknown> {
  kind: EdgeKind;
  weight: number;
  dropped: boolean;
  label: string;
}

export interface EngineNode {
  id: string;
  title: string;
  year: number | null;
  citedByCount: number;
  influence: number;
  muted: boolean;
  solo: boolean;
  topics: string[];
}

export interface EngineEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  weight: number;
  dropped: boolean;
}

export type Tension = "agree" | "fight" | "neutral";

export type ScoreName = keyof Scores;
