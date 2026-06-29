import { describe, it, expect } from "vitest";
import { activeHeadingIndex } from "../src/outline-tracking";

describe("activeHeadingIndex", () => {
  const tops = [0, 100, 250, 400];

  it("returns 0 when scrolled to the very top", () => {
    expect(activeHeadingIndex(tops, 0, 20)).toBe(0);
  });

  it("returns the last heading at or above scrollTop + offset", () => {
    expect(activeHeadingIndex(tops, 90, 20)).toBe(1);
    expect(activeHeadingIndex(tops, 230, 20)).toBe(2);
  });

  it("returns the last index when scrolled past everything", () => {
    expect(activeHeadingIndex(tops, 9999, 20)).toBe(3);
  });

  it("returns -1 for an empty list", () => {
    expect(activeHeadingIndex([], 0, 20)).toBe(-1);
  });
});
