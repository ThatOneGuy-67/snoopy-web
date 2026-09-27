import { describe, expect, it } from "vitest";
import { getPollOptionResults, getPollResultsFromRpc, isPollActive } from "./polls";

describe("isPollActive", () => {
  const now = Date.parse("2026-09-26T12:00:00.000Z");

  it("requires enabled and respects its optional start and end times", () => {
    expect(isPollActive({ enabled: true, starts_at: null, ends_at: null }, now)).toBe(true);
    expect(isPollActive({ enabled: false, starts_at: null, ends_at: null }, now)).toBe(false);
    expect(isPollActive({ enabled: true, starts_at: "2026-09-26T12:01:00.000Z", ends_at: null }, now)).toBe(false);
    expect(isPollActive({ enabled: true, starts_at: null, ends_at: "2026-09-26T11:59:00.000Z" }, now)).toBe(false);
  });
});

describe("getPollOptionResults", () => {
  it("counts votes by option index and computes percentages", () => {
    expect(getPollOptionResults(["A", "B", "C"], [
      { option_index: 0 }, { option_index: 0 }, { option_index: 2 },
    ])).toEqual([
      { option: "A", votes: 2, percentage: 67 },
      { option: "B", votes: 0, percentage: 0 },
      { option: "C", votes: 1, percentage: 33 },
    ]);
  });

  it("returns zeroed options when no valid votes exist", () => {
    expect(getPollOptionResults(["A", "B"], [{ option_index: -1 }, { option_index: 4 }])).toEqual([
      { option: "A", votes: 0, percentage: 0 },
      { option: "B", votes: 0, percentage: 0 },
    ]);
  });
});

describe("getPollResultsFromRpc", () => {
  it("uses returned option indexes and vote counts", () => {
    expect(getPollResultsFromRpc([
      { votes: 2, option_index: 0 },
      { votes: 1, option_index: 1 },
    ], ["A", "B"])).toEqual([
      { option: "A", votes: 2, percentage: 67 },
      { option: "B", votes: 1, percentage: 33 },
    ]);
  });

  it("accepts a results wrapper and rejects unsupported data", () => {
    expect(getPollResultsFromRpc({ results: [{ votes: 0 }, { votes: 0 }] }, ["A", "B"])).toEqual([
      { option: "A", votes: 0, percentage: 0 },
      { option: "B", votes: 0, percentage: 0 },
    ]);
    expect(getPollResultsFromRpc({ message: "ok" }, ["A", "B"])).toBeNull();
  });
});