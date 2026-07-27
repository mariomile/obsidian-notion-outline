import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const controller = readFileSync(
  new URL("../src/outline-controller.ts", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("outline accessibility contract", () => {
  it("uses native buttons for the strip and heading rows", () => {
    expect(controller).toContain('createEl("button"');
    expect(controller).toContain('"aria-expanded": "false"');
    expect(controller).toContain('"aria-current", "location"');
  });

  it("supports focus entry and Escape dismissal", () => {
    expect(controller).toContain('addEventListener("focusin"');
    expect(controller).toContain('event.key !== "Escape"');
  });

  it("does not animate layout width", () => {
    expect(styles).not.toMatch(/transition\s*:[^;]*\bwidth\b/);
  });

  it("isolates native button layout from host theme button styles", () => {
    expect(styles).toContain(
      ".notion-outline > button.notion-outline__strip {",
    );
    expect(styles).toContain(
      ".notion-outline__panel > button.notion-outline__row {",
    );
  });

  it("respects reduced motion", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
