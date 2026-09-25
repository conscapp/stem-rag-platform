import { describe, expect, it } from "vitest";
import { computeScores, paperPower } from "./outcome";
import { FIELDPLAY_STORAGE_KEY } from "./storage";
import { FIXTURE_QUESTION, fixtureEngineGraph } from "./fixture";
import {
  EXPERIMENT_STORAGE_KEY,
  createExperimentFile,
  experimentReducer,
  readExperiments,
  writeExperiments,
  type KeyValueStore,
} from "./experiments";

function memory(): KeyValueStore & { dump(): Map<string, string> } {
  const dump = new Map<string, string>();
  return {
    dump: () => dump,
    getItem: (key) => (dump.has(key) ? dump.get(key)! : null),
    setItem: (key, value) => {
      dump.set(key, value);
    },
  };
}

function ids() {
  let n = 0;
  return () => `slot-${++n}`;
}

describe("fieldplay experiments", () => {
  it("opens three isolated fixture slots and keeps mutations on one slot", () => {
    const file = createExperimentFile(ids());
    expect(file.slots.map((slot) => slot.name)).toEqual(["Experiment A", "Experiment B", "Experiment C"]);
    expect(file.slots.every((slot) => slot.nodes.length === 3 && slot.edges.length === 2)).toBe(true);
    expect(file.slots[0].nodes[0].data).not.toBe(file.slots[1].nodes[0].data);

    const untouched = file.slots[1];
    const renamed = experimentReducer(file, {
      type: "slot",
      id: file.slots[0].boardId,
      action: { type: "set-question", question: "Only A", history: true },
    });
    const mutated = experimentReducer(renamed, {
      type: "slot",
      id: file.slots[0].boardId,
      action: {
        type: "patch-node",
        id: file.slots[0].nodes[0].id,
        patch: { influence: 12, title: "Changed in A" },
        history: true,
      },
    });

    expect(mutated.slots[0].question).toBe("Only A");
    expect(mutated.slots[0].nodes[0].data.influence).toBe(12);
    expect(mutated.slots[0].nodes[0].data.title).toBe("Changed in A");
    expect(mutated.slots[0].past.length).toBeGreaterThan(0);
    expect(mutated.slots[1]).toBe(untouched);
    expect(mutated.slots[1].question).toBe(FIXTURE_QUESTION);
    expect(mutated.slots[1].nodes[0].data.influence).toBe(50);
    expect(mutated.slots[1].nodes[0].data.title).toBe("Local fixture: field lines");
    expect(mutated.slots[1].past).toEqual([]);
    expect(mutated.slots[2].question).toBe(FIXTURE_QUESTION);

    const undone = experimentReducer(mutated, {
      type: "slot",
      id: mutated.slots[0].boardId,
      action: { type: "undo" },
    });
    expect(undone.slots[0].nodes[0].data.influence).toBe(50);
    expect(undone.slots[1]).toBe(untouched);
  });

  it("resets one slot to the fixture and leaves the others in place", () => {
    const file = createExperimentFile(ids());
    const edited = experimentReducer(
      experimentReducer(file, {
        type: "slot",
        id: "slot-1",
        action: { type: "set-question", question: "A drifted", history: true },
      }),
      {
        type: "slot",
        id: "slot-2",
        action: { type: "patch-node", id: "slot-2:p1", patch: { influence: 8 }, history: true },
      },
    );
    const reset = experimentReducer(edited, { type: "reset", id: "slot-1" });
    expect(reset.slots[0].boardId).toBe("slot-1");
    expect(reset.slots[0].name).toBe("Experiment A");
    expect(reset.slots[0].question).toBe(FIXTURE_QUESTION);
    expect(reset.slots[0].mode).toBe("simulate");
    expect(reset.slots[0].past).toEqual([]);
    expect(reset.slots[0].future).toEqual([]);
    expect(reset.slots[0].nodes.map((node) => node.data.title)).toEqual([
      "Local fixture: field lines",
      "Local fixture: coil forces",
      "Local fixture: heat loads",
    ]);
    expect(reset.slots[0].edges.map((edge) => edge.data?.kind)).toEqual(["supports", "extends"]);
    expect(reset.slots[0].nodes[0].data.influence).toBe(50);
    expect(reset.slots[1].nodes[0].data.influence).toBe(8);
    expect(reset.slots[1].past).toHaveLength(1);
  });

  it("duplicates a slot into an isolated copy", () => {
    const file = createExperimentFile(ids());
    const copied = experimentReducer(file, { type: "duplicate", id: "slot-1", newId: "slot-copy" });
    expect(copied.slots.map((slot) => slot.name)).toEqual([
      "Experiment A",
      "Experiment A copy",
      "Experiment B",
      "Experiment C",
    ]);
    const changed = experimentReducer(copied, {
      type: "slot",
      id: "slot-copy",
      action: { type: "patch-node", id: copied.slots[1].nodes[0].id, patch: { title: "Copy only" }, history: true },
    });
    expect(changed.slots[1].nodes[0].data.title).toBe("Copy only");
    expect(changed.slots[0].nodes[0].data.title).toBe("Local fixture: field lines");
    expect(changed.slots[0].nodes[0].data).not.toBe(changed.slots[1].nodes[0].data);
  });

  it("stores experiments under session key fieldplay.experiments.v1 and not the board library", () => {
    expect(EXPERIMENT_STORAGE_KEY).toBe("fieldplay.experiments.v1");
    expect(EXPERIMENT_STORAGE_KEY).not.toBe(FIELDPLAY_STORAGE_KEY);
    const store = memory();
    store.setItem(FIELDPLAY_STORAGE_KEY, "boards-stay");
    const file = createExperimentFile(ids());
    const edited = experimentReducer(file, {
      type: "slot",
      id: "slot-1",
      action: { type: "set-question", question: "Kept in the tab", history: false },
    });
    expect(writeExperiments(store, edited)).toBe(true);
    expect(store.dump().has(FIELDPLAY_STORAGE_KEY)).toBe(true);
    expect(store.getItem(FIELDPLAY_STORAGE_KEY)).toBe("boards-stay");
    expect(store.dump().has(EXPERIMENT_STORAGE_KEY)).toBe(true);
    const raw = store.getItem(EXPERIMENT_STORAGE_KEY) ?? "";
    expect(raw.includes(FIELDPLAY_STORAGE_KEY)).toBe(false);
    const restored = readExperiments(store);
    expect(restored.slots[0].question).toBe("Kept in the tab");
    expect(restored.slots[1].question).toBe(FIXTURE_QUESTION);
    expect(restored.slots).toHaveLength(3);
    expect(readExperiments(memory()).slots.map((slot) => slot.name)).toEqual([
      "Experiment A",
      "Experiment B",
      "Experiment C",
    ]);
  });

  it("scores the fixture with the existing outcome formula", () => {
    const { nodes, edges } = fixtureEngineGraph();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.kind)).toEqual(["supports", "extends"]);
    expect(paperPower(nodes[0])).toBeCloseTo(50 * Math.log10(1 + 99) * (0.35 + (2020 - 1990) / 80), 6);
    expect(paperPower(nodes[1])).toBeCloseTo(50 * Math.log10(1 + 99) * (0.35 + (2020 - 1990) / 80), 6);
    expect(paperPower(nodes[2])).toBeCloseTo(40 * Math.log10(1 + 9) * (0.35 + (2010 - 1990) / 80), 6);

    const scores = computeScores(nodes, edges);
    const [p1, p2, p3] = nodes.map((node) => paperPower(node));
    const supportMass = (p1 + p2) / 2;
    const extendsMass = (p2 + p3) / 2;
    const denom = supportMass + 1;
    const topics = new Set(nodes.flatMap((node) => node.topics.map((topic) => topic.trim().toLowerCase())));
    const sum = p1 + p2 + p3;
    expect(scores.confidence).toBeCloseTo((100 * supportMass) / denom, 6);
    expect(scores.consensus).toBeCloseTo(100, 6);
    expect(scores.novelty).toBeCloseTo(40 + 8 * topics.size + (15 * extendsMass) / (extendsMass + 5) - 10 * (2 / 3), 6);
    expect(scores.impact).toBeCloseTo((100 * sum) / (sum + sum + 1), 6);
    expect(scores).toEqual(computeScores(nodes, edges));
  });
});
