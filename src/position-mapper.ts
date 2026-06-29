import { MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import type { Heading } from "./heading-model";

/** The CM6 EditorView behind a MarkdownView, or null in reading mode. */
function getEditorView(view: MarkdownView): EditorView | null {
  // @ts-expect-error - cm is exposed at runtime on the Obsidian Editor
  const cm = view.editor?.cm as EditorView | undefined;
  return cm instanceof EditorView ? cm : null;
}

function isReadingMode(view: MarkdownView): boolean {
  return view.getMode() === "preview";
}

/** The scrollable element for the current mode. */
export function getScroller(view: MarkdownView): HTMLElement | null {
  if (isReadingMode(view)) {
    return view.contentEl.querySelector<HTMLElement>(
      ".markdown-reading-view .markdown-preview-view",
    );
  }
  const cm = getEditorView(view);
  return (cm?.scrollDOM as HTMLElement) ?? null;
}

/**
 * Pixel top of each heading relative to the scroll content. Index-aligned with
 * `headings`. Missing measurements fall back to the previous value (monotonic).
 */
export function getHeadingTops(view: MarkdownView, headings: Heading[]): number[] {
  if (isReadingMode(view)) return readingTops(view, headings);
  return editingTops(view, headings);
}

function editingTops(view: MarkdownView, headings: Heading[]): number[] {
  const cm = getEditorView(view);
  if (!cm) return headings.map(() => 0);
  const doc = cm.state.doc;
  let last = 0;
  return headings.map((h) => {
    const lineNo = Math.min(h.line + 1, doc.lines); // CM lines are 1-based
    const pos = doc.line(lineNo).from;
    try {
      last = cm.lineBlockAt(pos).top;
    } catch {
      /* keep previous */
    }
    return last;
  });
}

function readingTops(view: MarkdownView, headings: Heading[]): number[] {
  const scroller = getScroller(view);
  if (!scroller) return headings.map(() => 0);
  const els = Array.from(
    scroller.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6, .HyperMD-header",
    ),
  );
  let last = 0;
  return headings.map((_, i) => {
    const el = els[i];
    if (el) last = el.offsetTop;
    return last;
  });
}

/** Scroll the view so the heading at `index` is near the top. */
export function scrollToHeading(
  view: MarkdownView,
  headings: Heading[],
  index: number,
): void {
  const h = headings[index];
  if (!h) return;
  if (isReadingMode(view)) {
    const scroller = getScroller(view);
    const els = scroller?.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6, .HyperMD-header",
    );
    els?.[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const cm = getEditorView(view);
  if (!cm) return;
  const lineNo = Math.min(h.line + 1, cm.state.doc.lines);
  const pos = cm.state.doc.line(lineNo).from;
  cm.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "start" }) });
}
