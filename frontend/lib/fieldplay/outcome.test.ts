import { describe, expect, it } from "vitest";
import {
  computeScores,
  nodeTension,
  outcomeSentence,
  paperPower,
  recencyFactor,
  resolveScores,
} from "./outcome";
import type { EngineEdge, EngineNode, Scores } from "./types";

function node(overrides: Partial<EngineNode> & Pick<EngineNode, "id">): EngineNode {
  return {
    title: overrides.id,
    year: 2020,
    citedByCount: 99,
    influence: 50,
    muted: false,
    solo: false,
    topics: [],
    ...overrides,
  };
}

function edge(
  source: string,
  target: string,
  kind: EngineEdge["kind"],
  extras: Partial<EngineEdge> = {},
): EngineEdge {
  return {
    id: extras.id ?? `${source}-${target}-${kind}`,
    source,
    target,
    kind,
    weight: 1,
    dropped: false,
    ...extras,
  };
}

function expectInRange(scores: Scores) {
  for (const key of ["confidence", "consensus", "novelty", "impact"] as const) {
    expect(scores[key]).toBeGreaterThanOrEqual(0);
    expect(scores[key]).toBeLessThanOrEqual(100);
  }
}

describe("outcome engine", () => {
  it("scores an empty board from the formulas", () => {
    expect(computeScores([], [])).toEqual({
      confidence: 0,
      consensus: 100,
      novelty: 40,
      impact: 0,
    });
  });

  it("treats one paper as half-power evidence, not certainty", () => {
    const paper = node({ id: "solo", title: "A single source", topics: ["plasma"] });
    expect(recencyFactor(2020)).toBeCloseTo(0.725, 5);
    expect(paperPower(paper)).toBeCloseTo(72.5, 5);

    const scores = computeScores([paper], []);
    const supportMass = 72.5 / 2;
    expect(scores.confidence).toBeCloseTo((100 * supportMass) / (supportMass + 1), 5);
    expect(scores.confidence).toBeGreaterThan(0);
    expect(scores.confidence).toBeLessThan(100);
    expect(scores.consensus).toBeCloseTo(100, 5);
    expect(scores.novelty).toBeCloseTo(48, 5);
    expect(scores.impact).toBeCloseTo((100 * 72.5) / (72.5 + 72.5 + 1), 5);
    expectInRange(scores);
  });

  it("lets a supports edge raise confidence and a contradicts edge cut consensus", () => {
    const papers = [node({ id: "a", title: "Alpha" }), node({ id: "b", title: "Beta" })];
    const supported = computeScores(papers, [edge("a", "b", "supports")]);
    const contested = computeScores(papers, [edge("a", "b", "contradicts")]);
    const alone = computeScores([papers[0]], []);

    expect(contested.confidence).toBe(0);
    expect(supported.confidence).toBeGreaterThan(contested.confidence);
    expect(supported.consensus).toBeGreaterThan(contested.consensus);
    expect(supported.confidence).toBeGreaterThan(alone.confidence);
    expect(supported.consensus).toBeCloseTo(100, 5);
    expect(contested.consensus).toBeLessThan(20);
  });

  it("does not recompute dials in Direct mode", () => {
    const dials = { confidence: 12, consensus: 34, novelty: 33, impact: 78 };
    const papers = [node({ id: "a", topics: ["tokamak", "stellarator"] })];
    const simulated = computeScores(papers, []);
    const resolved = resolveScores({ nodes: papers, edges: [], mode: "direct", dials });

    expect(resolved).toEqual(dials);
    expect(resolved.confidence).not.toBeCloseTo(simulated.confidence);
    expect(resolved.novelty).not.toBeCloseTo(simulated.novelty);
  });

  it("removes a muted paper's power from the sums", () => {
    const loud = node({ id: "loud", title: "Loud", influence: 90, citedByCount: 999, topics: ["alpha"] });
    const quiet = node({
      id: "quiet",
      title: "Quiet",
      influence: 40,
      citedByCount: 9,
      year: 2010,
      topics: ["beta"],
    });
    const link = edge("loud", "quiet", "supports");
    const both = computeScores([loud, quiet], [link]);
    const muted = computeScores([{ ...loud, muted: true }, quiet], [link]);
    const alone = computeScores([quiet], []);

    expect(muted.confidence).toBeLessThan(both.confidence);
    expect(muted.confidence).toBeCloseTo(alone.confidence, 5);
    expect(muted.consensus).toBeCloseTo(alone.consensus, 5);
    expect(muted.novelty).toBeCloseTo(alone.novelty, 5);
    expect(muted.impact).toBeCloseTo(alone.impact, 5);
    expect(muted.novelty).toBeCloseTo(48, 5);
  });

  it("solos a paper the same way mute benches the others", () => {
    const keep = node({ id: "keep", title: "Keep", topics: ["keep"] });
    const drop = node({ id: "drop", title: "Drop", topics: ["drop"] });
    const solo = computeScores(
      [{ ...keep, solo: true }, drop],
      [edge("keep", "drop", "contradicts")],
    );
    expect(solo.confidence).toBeCloseTo(computeScores([keep], []).confidence, 5);
    expect(solo.novelty).toBeCloseTo(48, 5);
  });

  it("clamps every score to 0–100", () => {
    const crowded = node({
      id: "topics",
      title: "Many concepts",
      influence: 0,
      citedByCount: 0,
      topics: Array.from({ length: 20 }, (_, index) => `topic ${index}`),
    });
    const noveltyCap = computeScores([crowded], []);
    expect(noveltyCap.novelty).toBe(100);

    const sparse = [
      node({ id: "a", influence: 0, citedByCount: 0, topics: [] }),
      node({ id: "b", influence: 0, citedByCount: 0, topics: [] }),
    ];
    const penalty = computeScores(
      sparse,
      Array.from({ length: 12 }, (_, index) =>
        edge("a", "b", "supports", { id: `e${index}`, weight: 0.1 }),
      ),
    );
    expect(penalty.novelty).toBe(0);

    const huge = computeScores(
      [node({ id: "h", influence: 500, citedByCount: 1e12, year: 2200, topics: ["only"] })],
      [],
    );
    expectInRange(huge);
    expect(huge.confidence).toBeLessThanOrEqual(100);
    expect(paperPower({ influence: 500, citedByCount: 1e12, year: 2200 })).toBeCloseTo(
      paperPower({ influence: 100, citedByCount: 1e12, year: 2200 }),
      5,
    );

    const heavy = computeScores(
      [node({ id: "a" }), node({ id: "b" })],
      [edge("a", "b", "supports", { weight: 9 })],
    );
    const capped = computeScores(
      [node({ id: "a" }), node({ id: "b" })],
      [edge("a", "b", "supports", { weight: 2 })],
    );
    expect(heavy.confidence).toBeCloseTo(capped.confidence, 5);
    expectInRange(heavy);
    expectInRange(penalty);
  });

  it("uses missing year 0.8 and missing citations as zero power", () => {
    expect(recencyFactor(null)).toBe(0.8);
    expect(recencyFactor(1990)).toBeCloseTo(0.35, 5);
    expect(recencyFactor(1970)).toBe(0.35);
    expect(recencyFactor(2100)).toBe(1.4);
    expect(paperPower({ influence: 80, citedByCount: 0, year: 2020 })).toBe(0);
  });

  it("raises novelty with extends and impact with causes", () => {
    const papers = [node({ id: "a" }), node({ id: "b" })];
    const plain = computeScores(papers, []);
    const extended = computeScores(papers, [edge("a", "b", "extends")]);
    const caused = computeScores(papers, [edge("a", "b", "causes")]);
    expect(extended.novelty).toBeGreaterThan(plain.novelty);
    expect(caused.impact).toBeGreaterThan(plain.impact);
  });

  it("ignores a dropped contradicts edge", () => {
    const papers = [node({ id: "a" }), node({ id: "b" })];
    const live = computeScores(papers, [edge("a", "b", "contradicts")]);
    const dropped = computeScores(papers, [edge("a", "b", "contradicts", { dropped: true })]);
    expect(live.confidence).toBe(0);
    expect(dropped.confidence).toBeGreaterThan(live.confidence);
    expect(dropped.consensus).toBeGreaterThan(live.consensus);
  });

  it("colors tension from the dials without changing them", () => {
    const papers = [node({ id: "a" }), node({ id: "b" })];
    const high = { confidence: 90, consensus: 90, novelty: 10, impact: 10 };
    const low = { confidence: 10, consensus: 10, novelty: 10, impact: 10 };
    expect(nodeTension("a", papers, [edge("a", "b", "supports")], high)).toBe("agree");
    expect(nodeTension("a", papers, [edge("a", "b", "supports")], low)).toBe("fight");
    expect(nodeTension("a", papers, [edge("a", "b", "contradicts")], low)).toBe("agree");
    expect(nodeTension("a", papers, [edge("a", "b", "contradicts")], high)).toBe("fight");
    expect(nodeTension("a", papers, [edge("a", "b", "extends")], high)).toBe("neutral");
    expect(resolveScores({ nodes: papers, edges: [], mode: "direct", dials: high })).toEqual(high);
  });

  it("writes the outcome sentence from the dominant score and the strongest title", () => {
    expect(outcomeSentence({ confidence: 0, consensus: 100, novelty: 40, impact: 0 }, null)).toMatch(
      /board is empty/i,
    );
    expect(
      outcomeSentence(
        { confidence: 82, consensus: 20, novelty: 10, impact: 10 },
        "The ARIES-CS Compact Stellarator",
      ),
    ).toBe(
      "With The ARIES-CS Compact Stellarator carrying the board, confidence is high and the claim looks fragile.",
    );
  });
});
