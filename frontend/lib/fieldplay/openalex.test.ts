import { describe, expect, it } from "vitest";
import { normalizeWork, reconstructAbstract, supportsFromCitations } from "./openalex";

describe("OpenAlex normalization", () => {
  it("rebuilds an abstract from the inverted index", () => {
    expect(reconstructAbstract({ This: [0], is: [1], fine: [2] })).toBe("This is fine");
    expect(reconstructAbstract({ world: [1], Hello: [0] })).toBe("Hello world");
    expect(reconstructAbstract(null)).toBe("");
    expect(reconstructAbstract(undefined)).toBe("");
  });

  it("keeps the fields the board needs and shortens OpenAlex ids", () => {
    const work = normalizeWork({
      id: "https://openalex.org/W1510990962",
      display_name: "The ARIES-CS Compact Stellarator Fusion Power Plant",
      publication_year: 2008,
      cited_by_count: 42,
      authorships: [
        { author_position: "middle", author: { display_name: "Other" } },
        { author_position: "first", author: { display_name: "Farrokh Najmabadi" } },
      ],
      abstract_inverted_index: { Stellarators: [0], compact: [1] },
      topics: [{ display_name: "Stellarator" }],
      concepts: [{ display_name: "Stellarator" }, { display_name: "Fusion power" }],
      referenced_works: ["https://openalex.org/W99", "not-an-id"],
      doi: "https://doi.org/10.1016/example",
      primary_location: {
        landing_page_url: "https://example.org/paper",
        source: { display_name: "Fusion Engineering and Design" },
      },
    });

    expect(work).toMatchObject({
      id: "W1510990962",
      year: 2008,
      citedByCount: 42,
      firstAuthor: "Farrokh Najmabadi",
      abstract: "Stellarators compact",
      topics: ["Stellarator", "Fusion power"],
      referencedWorks: ["W99"],
      venue: "Fusion Engineering and Design",
      url: "https://example.org/paper",
    });
  });

  it("shows no abstract when the index is missing", () => {
    const work = normalizeWork({
      id: "https://openalex.org/W1",
      display_name: "Untitled in the index",
    });
    expect(work?.abstract).toBe("");
    expect(work?.citedByCount).toBe(0);
    expect(work?.year).toBeNull();
  });

  it("creates one supports edge for a citation and never a duplicate", () => {
    const existing = { id: "W1", openAlexId: "W1", referencedWorks: ["W2"] };
    const incoming = { id: "W2", openAlexId: "W2", referencedWorks: ["W1"] };
    expect(supportsFromCitations(incoming, [existing], [])).toEqual([{ source: "W2", target: "W1" }]);
    expect(supportsFromCitations(incoming, [existing], [{ source: "W1", target: "W2" }])).toEqual([]);
    expect(supportsFromCitations(incoming, [existing], [{ source: "W2", target: "W1" }])).toEqual([]);
    expect(
      supportsFromCitations({ id: "W3", openAlexId: "W3", referencedWorks: [] }, [existing], []),
    ).toEqual([]);
  });
});
