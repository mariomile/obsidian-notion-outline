import { describe, it, expect } from "vitest";
import { normalizeHeadings, tickGeometry } from "../src/heading-model";

describe("normalizeHeadings", () => {
  it("maps cache headings to {text, level, line}", () => {
    const cache = {
      headings: [
        { heading: "Intro", level: 1, position: { start: { line: 0 } } },
        { heading: "Details", level: 2, position: { start: { line: 5 } } },
      ],
    } as any;
    expect(normalizeHeadings(cache)).toEqual([
      { text: "Intro", level: 1, line: 0 },
      { text: "Details", level: 2, line: 5 },
    ]);
  });

  it("returns [] when cache is null or has no headings", () => {
    expect(normalizeHeadings(null)).toEqual([]);
    expect(normalizeHeadings({} as any)).toEqual([]);
  });
});

describe("tickGeometry", () => {
  it("makes deeper headings shorter and dimmer, clamped at level 6", () => {
    const h1 = tickGeometry(1);
    const h3 = tickGeometry(3);
    expect(h1.width).toBeGreaterThan(h3.width);
    expect(h1.opacity).toBeGreaterThan(h3.opacity);
    expect(tickGeometry(6).width).toBeGreaterThan(0);
    expect(tickGeometry(99).width).toEqual(tickGeometry(6).width);
    expect(tickGeometry(1).opacity).toBeLessThanOrEqual(1);
  });
});
