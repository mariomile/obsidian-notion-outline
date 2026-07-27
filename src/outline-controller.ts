import { MarkdownView } from "obsidian";
import { Heading, tickGeometry } from "./heading-model";
import { activeHeadingIndex } from "./outline-tracking";
import { getHeadingTops, getScroller, scrollToHeading } from "./position-mapper";

const ACTIVATION_OFFSET = 24; // px below viewport top counts as "current"
const COLLAPSE_DELAY = 160;   // ms anti-flicker on mouseleave

export class OutlineController {
  private root: HTMLElement;
  private strip: HTMLButtonElement;
  private panel: HTMLElement;
  private headings: Heading[] = [];
  private tops: number[] = [];
  private tickEls: HTMLElement[] = [];
  private rowEls: HTMLButtonElement[] = [];
  private activeIdx = -1;
  private rafId: number | null = null;
  private collapseTimer: number | null = null;
  private scroller: HTMLElement | null = null;

  private onScroll = () => this.scheduleUpdate();

  constructor(private view: MarkdownView) {
    this.root = view.contentEl.createDiv({
      cls: "notion-outline",
      attr: { "aria-label": "Document outline" },
    });
    this.strip = this.root.createEl("button", {
      cls: "notion-outline__strip",
      attr: {
        type: "button",
        "aria-label": "Open document outline",
        "aria-expanded": "false",
      },
    });
    this.panel = this.root.createDiv({
      cls: "notion-outline__panel",
      attr: { role: "navigation", "aria-label": "Headings" },
    });

    this.root.addEventListener("mouseenter", this.expand);
    this.root.addEventListener("mouseleave", this.collapse);
    this.root.addEventListener("focusin", this.expand);
    this.root.addEventListener("focusout", this.onFocusOut);
    this.root.addEventListener("keydown", this.onKeyDown);
    this.strip.addEventListener("click", this.onStripClick);
  }

  /** Rebuild ticks/panel from `headings`; hide if below threshold. */
  setHeadings(headings: Heading[], minHeadings: number, visible: boolean): void {
    this.headings = headings;
    const show = visible && headings.length >= minHeadings;
    this.root.toggleClass("is-hidden", !show);
    if (!show) {
      this.detachScroll();
      return;
    }
    this.renderTicks();
    this.renderPanel();
    this.attachScroll();
    this.measure();
    this.scheduleUpdate();
  }

  private renderTicks(): void {
    this.strip.empty();
    this.tickEls = this.headings.map((h, index) => {
      const g = tickGeometry(h.level);
      const tick = this.strip.createSpan({
        cls: "notion-outline__tick",
        attr: { "aria-hidden": "true", "data-heading-index": String(index) },
      });
      tick.style.setProperty("--notion-outline-tick-width", `${g.width}px`);
      tick.style.setProperty("--notion-outline-tick-opacity", String(g.opacity));
      return tick;
    });
  }

  private renderPanel(): void {
    this.panel.empty();
    this.rowEls = this.headings.map((h, i) => {
      const row = this.panel.createEl("button", {
        cls: "notion-outline__row",
        attr: { type: "button" },
      });
      row.style.paddingLeft = `${(Math.min(h.level, 6) - 1) * 12}px`;
      row.setText(h.text);
      row.addEventListener("click", () => {
        scrollToHeading(this.view, this.headings, i);
        this.collapseImmediately();
      });
      return row;
    });
  }

  private attachScroll(): void {
    this.detachScroll();
    this.scroller = getScroller(this.view);
    this.scroller?.addEventListener("scroll", this.onScroll, { passive: true });
  }

  private detachScroll(): void {
    this.scroller?.removeEventListener("scroll", this.onScroll);
    this.scroller = null;
  }

  private measure(): void {
    this.tops = getHeadingTops(this.view, this.headings);
  }

  private scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updateActive();
    });
  }

  private updateActive(): void {
    if (!this.scroller) return;
    const idx = activeHeadingIndex(this.tops, this.scroller.scrollTop, ACTIVATION_OFFSET);
    if (idx === this.activeIdx) return;
    this.tickEls[this.activeIdx]?.removeClass("is-active");
    this.rowEls[this.activeIdx]?.removeClass("is-active");
    this.rowEls[this.activeIdx]?.removeAttribute("aria-current");
    this.activeIdx = idx;
    this.tickEls[idx]?.addClass("is-active");
    this.rowEls[idx]?.addClass("is-active");
    this.rowEls[idx]?.setAttribute("aria-current", "location");
  }

  /** Re-measure positions (call after typing/resize). */
  remeasure(): void {
    if (this.root.hasClass("is-hidden")) return;
    this.measure();
    this.scheduleUpdate();
  }

  private expand = () => {
    if (this.collapseTimer) {
      window.clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    this.measure();
    this.root.addClass("is-expanded");
    this.strip.setAttribute("aria-expanded", "true");
  };

  private collapse = () => {
    this.collapseTimer = window.setTimeout(
      () => {
        const focused = document.activeElement;
        if (this.root.matches(":hover") || (focused instanceof Node && this.root.contains(focused))) {
          return;
        }
        this.collapseImmediately();
      },
      COLLAPSE_DELAY,
    );
  };

  private collapseImmediately(): void {
    if (this.collapseTimer) {
      window.clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    this.root.removeClass("is-expanded");
    this.strip.setAttribute("aria-expanded", "false");
  }

  private onStripClick = (event: MouseEvent): void => {
    const target = event.target;
    const tick = target instanceof Element
      ? target.closest<HTMLElement>("[data-heading-index]")
      : null;
    const index = Number(tick?.dataset.headingIndex);
    if (tick && Number.isInteger(index) && index >= 0 && index < this.headings.length) {
      scrollToHeading(this.view, this.headings, index);
      return;
    }
    this.expand();
  };

  private onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.root.contains(next)) this.collapse();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.root.hasClass("is-expanded")) return;
    event.preventDefault();
    event.stopPropagation();
    this.collapseImmediately();
    this.strip.focus();
  };

  destroy(): void {
    this.detachScroll();
    this.root.removeEventListener("mouseenter", this.expand);
    this.root.removeEventListener("mouseleave", this.collapse);
    this.root.removeEventListener("focusin", this.expand);
    this.root.removeEventListener("focusout", this.onFocusOut);
    this.root.removeEventListener("keydown", this.onKeyDown);
    this.strip.removeEventListener("click", this.onStripClick);
    if (this.collapseTimer) window.clearTimeout(this.collapseTimer);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.root.remove();
  }
}
