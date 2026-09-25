import type { PaperNode, RelationEdge } from "../../components/fieldplay/reducer";
import type { EngineEdge, EngineNode } from "./types";

export const FIXTURE_QUESTION = "What holds if only these three papers are in play?";

const PAPERS = [
  {
    key: "p1",
    title: "Local fixture: field lines",
    year: 2020,
    citedByCount: 99,
    influence: 50,
    topics: ["Field lines"],
    firstAuthor: "Fixture",
    position: { x: 40, y: 40 },
  },
  {
    key: "p2",
    title: "Local fixture: coil forces",
    year: 2020,
    citedByCount: 99,
    influence: 50,
    topics: ["Coil forces"],
    firstAuthor: "Fixture",
    position: { x: 340, y: 40 },
  },
  {
    key: "p3",
    title: "Local fixture: heat loads",
    year: 2010,
    citedByCount: 9,
    influence: 40,
    topics: ["Heat loads"],
    firstAuthor: "Fixture",
    position: { x: 190, y: 400 },
  },
] as const;

/** Three local papers and two edges. No network. Each call returns new objects. */
export function createFixtureGraph(slotId: string): { nodes: PaperNode[]; edges: RelationEdge[] } {
  const nodes: PaperNode[] = PAPERS.map((paper) => ({
    id: `${slotId}:${paper.key}`,
    type: "paper",
    position: { ...paper.position },
    data: {
      kind: "paper",
      title: paper.title,
      year: paper.year,
      citedByCount: paper.citedByCount,
      influence: paper.influence,
      muted: false,
      solo: false,
      topics: [...paper.topics],
      abstract: "Built-in Fieldplay fixture. It does not come from OpenAlex.",
      firstAuthor: paper.firstAuthor,
      openAlexId: null,
      referencedWorks: [],
      doi: null,
      url: null,
      venue: null,
    },
  }));
  const edges: RelationEdge[] = [
    {
      id: `${slotId}:e1`,
      type: "relation",
      source: `${slotId}:p1`,
      target: `${slotId}:p2`,
      sourceHandle: "r",
      targetHandle: "l",
      data: { kind: "supports", weight: 1, dropped: false, label: "" },
    },
    {
      id: `${slotId}:e2`,
      type: "relation",
      source: `${slotId}:p2`,
      target: `${slotId}:p3`,
      sourceHandle: "r",
      targetHandle: "l",
      data: { kind: "extends", weight: 1, dropped: false, label: "" },
    },
  ];
  return { nodes, edges };
}

export function toEngineNode(node: PaperNode): EngineNode {
  return {
    id: node.id,
    title: node.data.title,
    year: node.data.year,
    citedByCount: node.data.citedByCount,
    influence: node.data.influence,
    muted: node.data.muted,
    solo: node.data.solo,
    topics: node.data.topics,
  };
}

export function toEngineEdge(edge: RelationEdge): EngineEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.data?.kind ?? "supports",
    weight: edge.data?.weight ?? 1,
    dropped: edge.data?.dropped ?? false,
  };
}

/** The same three papers and two edges, in engine shape, for score checks. */
export function fixtureEngineGraph(): { nodes: EngineNode[]; edges: EngineEdge[] } {
  const graph = createFixtureGraph("fixture");
  return {
    nodes: graph.nodes.map(toEngineNode),
    edges: graph.edges.map(toEngineEdge),
  };
}
