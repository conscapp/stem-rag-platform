import { describe, expect, it } from "vitest";
import { FIELDPLAY_STORAGE_KEY, parseBoardFile, upsertBoard, type BoardRecord } from "./storage";

const board: BoardRecord = {
  id: "board-1",
  name: "Stellarator table",
  updatedAt: "2026-09-25T00:00:00.000Z",
  question: "Can a compact stellarator carry a plant?",
  mode: "simulate",
  dials: { confidence: 10, consensus: 20, novelty: 30, impact: 40 },
  nodes: [
    {
      id: "W1",
      position: { x: 10, y: 20 },
      data: {
        kind: "paper",
        title: "ARIES-CS",
        year: 2008,
        citedByCount: 42,
        influence: 50,
        muted: false,
        solo: false,
        topics: ["Stellarator"],
        abstract: "",
        firstAuthor: "Najmabadi",
        openAlexId: "W1",
        referencedWorks: [],
        doi: null,
        url: null,
        venue: null,
      },
    },
  ],
  edges: [],
};

describe("fieldplay board file", () => {
  it("uses the versioned localStorage key and rejects other schemas", () => {
    expect(FIELDPLAY_STORAGE_KEY).toBe("fieldplay.boards.v1");
    expect(parseBoardFile({ version: 2, boards: [board] })).toBeNull();
    expect(parseBoardFile(null)).toBeNull();
    expect(parseBoardFile({ version: 1, boards: [] })).toBeNull();
  });

  it("keeps a version 1 board and its active id", () => {
    const file = parseBoardFile({ version: 1, activeId: "missing", boards: [board] });
    expect(file?.version).toBe(1);
    expect(file?.activeId).toBe("board-1");
    expect(file?.boards[0].nodes[0].data.title).toBe("ARIES-CS");
    expect(file?.boards[0].dials.impact).toBe(40);
  });

  it("upserts by id and leaves the other named boards", () => {
    const next = upsertBoard(
      { version: 1, activeId: "board-1", boards: [board] },
      { ...board, id: "board-2", name: "Second", updatedAt: "2026-09-25T01:00:00.000Z" },
    );
    expect(next.version).toBe(1);
    expect(next.activeId).toBe("board-2");
    expect(next.boards.map((item) => item.id)).toEqual(["board-2", "board-1"]);
  });
});
