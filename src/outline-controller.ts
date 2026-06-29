import { MarkdownView } from "obsidian";
import { Heading, tickGeometry } from "./heading-model";
import { activeHeadingIndex } from "./outline-tracking";
import { getHeadingTops, getScroller, scrollToHeading } from "./position-mapper";

const ACTIVATION_OFFSET = 24; // px below viewport top counts as "current"
const COLLAPSE_DELAY = 160;   // ms anti-flicker on mouseleave

export class OutlineController {
  private root: HTMLElement;
  private strip: HTMLElement;
  private panel: HTMLElement;
  private headings: Heading[] = [];
  private tops: number[] = [];
  private tickEls: HTMLElement[] = [];
  private rowEls: HTMLElement[] = [];
  private activeIdx = -1;
  private rafPending = false;
  private collapseTimer: number | null = null;
  private scroller: HTMLElement | null = null;

  private onScroll = () => this.scheduleUpdate();

  constructor(private view: MarkdownView) {
    this.root = view.contentEl.createDiv({ cls: "notion-outline" });
    this.strip = this.root.createDiv({ cls: "notion-outline__strip" });
    this.panel = this.root.createDiv({ cls: "notion-outline__panel" });

    this.root.addEventListener("mouseenter", this.expand);
    this.root.addEventListener("mouseleave", this.collapse);
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
    this.tickEls = this.headings.map((h) => {
      const g = tickGeometry(h.level);
      const tick = this.strip.createDiv({ cls: "notion-outline__tick" });
      tick.style.width = `${g.width}px`;
      tick.style.opacity = String(g.opacity);
      return tick;
    });
  }

  private renderPanel(): void {
    this.panel.empty();
    this.rowEls = this.headings.map((h, i) => {
      const row = this.panel.createDiv({ cls: "notion-outline__row" });
      row.style.paddingLeft = `${(Math.min(h.level, 6) - 1) * 12}px`;
      row.setText(h.text);
      const go = () => scrollToHeading(this.view, this.headings, i);
      row.addEventListener("click", go);
      this.tickEls[i]?.addEventListener("click", go);
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
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.updateActive();
    });
  }

  private updateActive(): void {
    if (!this.scroller) return;
    const idx = activeHeadingIndex(this.tops, this.scroller.scrollTop, ACTIVATION_OFFSET);
    if (idx === this.activeIdx) return;
    this.tickEls[this.activeIdx]?.removeClass("is-active");
    this.rowEls[this.activeIdx]?.removeClass("is-active");
    this.activeIdx = idx;
    this.tickEls[idx]?.addClass("is-active");
    this.rowEls[idx]?.addClass("is-active");
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
  };

  private collapse = () => {
    this.collapseTimer = window.setTimeout(
      () => this.root.removeClass("is-expanded"),
      COLLAPSE_DELAY,
    );
  };

  destroy(): void {
    this.detachScroll();
    this.root.removeEventListener("mouseenter", this.expand);
    this.root.removeEventListener("mouseleave", this.collapse);
    if (this.collapseTimer) window.clearTimeout(this.collapseTimer);
    this.root.remove();
  }
}
