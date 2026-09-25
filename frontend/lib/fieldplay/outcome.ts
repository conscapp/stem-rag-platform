import type {
  EngineEdge,
  EngineNode,
  Mode,
  ScoreName,
  Scores,
  Tension,
} from "./types";

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampScores(scores: Scores): Scores {
  return {
    confidence: clamp(scores.confidence, 0, 100),
    consensus: clamp(scores.consensus, 0, 100),
    novelty: clamp(scores.novelty, 0, 100),
    impact: clamp(scores.impact, 0, 100),
  };
}

/** Missing year → 0.8. Otherwise clamp(0.35 + (year - 1990) / 80, 0.35, 1.4). */
export function recencyFactor(year: number | null | undefined): number {
  if (year == null || !Number.isFinite(year)) return 0.8;
  return clamp(0.35 + (year - 1990) / 80, 0.35, 1.4);
}

/** influence (0–100) × log10(1 + cited_by_count) × recency. Missing citations count as 0. */
export function paperPower(node: {
  influence: number;
  citedByCount: number;
  year: number | null;
}): number {
  const influence = clamp(node.influence, 0, 100);
  const cited =
    node.citedByCount == null || !Number.isFinite(node.citedByCount)
      ? 0
      : Math.max(0, node.citedByCount);
  return influence * Math.log10(1 + cited) * recencyFactor(node.year);
}

function edgeWeight(weight: number): number {
  return clamp(Number.isFinite(weight) ? weight : 1, 0.1, 2);
}

function pairMass(powerA: number, powerB: number, weight: number): number {
  return ((powerA + powerB) / 2) * edgeWeight(weight);
}

/** Solo keeps only soloed cards. Otherwise muted cards leave the scoring set. */
export function scoringNodes(nodes: EngineNode[]): EngineNode[] {
  const solo = nodes.filter((node) => node.solo && !node.muted);
  if (solo.length > 0) return solo;
  return nodes.filter((node) => !node.muted);
}

function liveEdges(nodes: EngineNode[], edges: EngineEdge[]): {
  active: EngineNode[];
  edges: EngineEdge[];
} {
  const active = scoringNodes(nodes);
  const ids = new Set(active.map((node) => node.id));
  const live = edges.filter(
    (edge) =>
      !edge.dropped &&
      edge.source !== edge.target &&
      ids.has(edge.source) &&
      ids.has(edge.target),
  );
  return { active, edges: live };
}

export function computeScores(nodes: EngineNode[], edges: EngineEdge[]): Scores {
  const { active, edges: live } = liveEdges(nodes, edges);
  const power = new Map<string, number>();
  for (const node of active) power.set(node.id, paperPower(node));

  let supportMass = 0;
  let controversyMass = 0;
  let extendsMass = 0;
  let causesMass = 0;
  const connected = new Set<string>();

  for (const edge of live) {
    const mass = pairMass(power.get(edge.source) ?? 0, power.get(edge.target) ?? 0, edge.weight);
    connected.add(edge.source);
    connected.add(edge.target);
    if (edge.kind === "supports") supportMass += mass;
    else if (edge.kind === "contradicts") controversyMass += mass;
    else if (edge.kind === "extends") extendsMass += mass;
    else if (edge.kind === "causes") causesMass += mass;
  }

  for (const node of active) {
    if (!connected.has(node.id)) supportMass += (power.get(node.id) ?? 0) / 2;
  }

  const topics = new Set<string>();
  for (const node of active) {
    for (const topic of node.topics) {
      const key = topic.trim().toLowerCase();
      if (key) topics.add(key);
    }
  }

  const nodeCount = active.length;
  const edgeCount = live.length;
  const sumPower = active.reduce((sum, node) => sum + (power.get(node.id) ?? 0), 0);
  const meanPaperPower = nodeCount === 0 ? 0 : sumPower / nodeCount;
  const impactMass = sumPower + causesMass;
  const evidenceDenom = supportMass + controversyMass + 1;

  const confidence = clamp((100 * supportMass) / evidenceDenom, 0, 100);
  const consensus = clamp(100 * (1 - controversyMass / evidenceDenom), 0, 100);
  const novelty = clamp(
    40 +
      8 * topics.size +
      (15 * extendsMass) / (extendsMass + 5) -
      10 * (edgeCount / Math.max(nodeCount, 1)),
    0,
    100,
  );
  const impact = clamp(
    (100 * impactMass) / (impactMass + meanPaperPower * nodeCount + 1),
    0,
    100,
  );

  return { confidence, consensus, novelty, impact };
}

/** Direct mode returns the dials. Simulate mode scores the board. Dials are not derived from the graph. */
export function resolveScores(input: {
  nodes: EngineNode[];
  edges: EngineEdge[];
  mode: Mode;
  dials: Scores;
}): Scores {
  if (input.mode === "direct") return clampScores(input.dials);
  return computeScores(input.nodes, input.edges);
}

export function leadingTitle(nodes: EngineNode[]): string | null {
  const active = scoringNodes(nodes);
  if (active.length === 0) return null;
  let best = active[0];
  let bestPower = -1;
  for (const node of active) {
    const power = paperPower(node);
    if (power > bestPower) {
      best = node;
      bestPower = power;
    }
  }
  const title = best.title.trim();
  return title || "Untitled card";
}

function band(value: number): "low" | "mixed" | "high" {
  const rounded = Math.round(clamp(value, 0, 100));
  if (rounded < 40) return "low";
  if (rounded < 70) return "mixed";
  return "high";
}

function claimLook(consensus: number): "fragile" | "contested" | "stable" {
  const rounded = Math.round(clamp(consensus, 0, 100));
  if (rounded < 40) return "fragile";
  if (rounded < 70) return "contested";
  return "stable";
}

function dominantScore(scores: Scores): ScoreName {
  const order: ScoreName[] = ["confidence", "consensus", "novelty", "impact"];
  let best: ScoreName = "confidence";
  let bestValue = -1;
  for (const name of order) {
    const value = Math.round(clamp(scores[name], 0, 100));
    if (value > bestValue) {
      best = name;
      bestValue = value;
    }
  }
  return best;
}

export function outcomeSentence(scores: Scores, topTitle: string | null): string {
  if (!topTitle) {
    return "The board is empty. Search a paper, drop it on the table, connect it, and play the outcome.";
  }
  const title = topTitle.length > 96 ? `${topTitle.slice(0, 93)}…` : topTitle;
  const dominant = dominantScore(scores);
  return `With ${title} carrying the board, ${dominant} is ${band(scores[dominant])} and the claim looks ${claimLook(scores.consensus)}.`;
}

/**
 * Supports agree with high confidence. Contradicts agree with low consensus.
 * No local support/contradict edge → neutral. Direct mode only uses this for color.
 */
export function nodeTension(
  nodeId: string,
  nodes: EngineNode[],
  edges: EngineEdge[],
  dials: Scores,
): Tension {
  const { active, edges: live } = liveEdges(nodes, edges);
  if (!active.some((node) => node.id === nodeId)) return "neutral";
  const shown = clampScores(dials);
  let signal = 0;
  let mass = 0;
  for (const edge of live) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;
    if (edge.kind !== "supports" && edge.kind !== "contradicts") continue;
    const weight = edgeWeight(edge.weight);
    if (edge.kind === "supports") signal += weight * ((shown.confidence - 50) / 50);
    else signal += weight * ((50 - shown.consensus) / 50);
    mass += weight;
  }
  if (mass === 0) return "neutral";
  const average = signal / mass;
  if (average > 0.15) return "agree";
  if (average < -0.15) return "fight";
  return "neutral";
}

export interface OutcomeView {
  simulated: Scores;
  shown: Scores;
  baseline: Scores;
  sentence: string;
  tension: Map<string, Tension>;
  scoringIds: Set<string>;
  whatIf: boolean;
}

export function evaluateBoard(input: {
  nodes: EngineNode[];
  edges: EngineEdge[];
  mode: Mode;
  dials: Scores;
}): OutcomeView {
  const simulated = computeScores(input.nodes, input.edges);
  const baseline = computeScores(
    input.nodes.map((node) => ({ ...node, muted: false, solo: false })),
    input.edges.map((edge) => ({ ...edge, dropped: false })),
  );
  const shown = resolveScores(input);
  const scoringIds = new Set(scoringNodes(input.nodes).map((node) => node.id));
  const tension = new Map<string, Tension>();
  if (input.mode === "direct") {
    for (const node of input.nodes) {
      tension.set(node.id, nodeTension(node.id, input.nodes, input.edges, shown));
    }
  }
  const whatIf =
    input.nodes.some((node) => node.muted || node.solo) ||
    input.edges.some((edge) => edge.dropped);
  const title = leadingTitle(input.nodes);
  const sentence = title
    ? outcomeSentence(shown, title)
    : input.nodes.length > 0
      ? "Every card on the board is muted or benched. Restore one to deal the scores."
      : outcomeSentence(shown, null);
  return {
    simulated,
    shown,
    baseline,
    sentence,
    tension,
    scoringIds,
    whatIf,
  };
}
