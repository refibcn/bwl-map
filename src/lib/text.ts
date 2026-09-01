/**
 * Text measurement helpers for the flow diagrams (FlowDiagram, VerticalFlow,
 * ShiftDiagram, VerticalShiftDiagram).
 *
 * Card content is real HTML now (see FlowCard.astro), so the browser wraps
 * the actual displayed text — nothing here decides what's shown. What's
 * still missing is auto-layout: every card's pixel height has to be decided
 * ahead of time in the parent's frontmatter, before anything renders, so
 * wrapToWidth's word-wrap simulation is kept on purely as a SIZING estimate
 * (an approximate "how many lines will this take" for the height budget).
 * Its ratios are deliberately conservative (slightly wide per character) so
 * that estimate errs toward reserving enough room rather than too little.
 */

export type FontStyle = "body" | "display";

// Average character advance per font style, in em. "display" covers
// heading/bold faces, which run wider than regular body text.
const CHAR_ADVANCE: Record<FontStyle, number> = {
  body: 0.55,
  display: 0.6,
};

// Assume text is up to ~10% wider than the estimate, so lines never overflow.
const SAFETY_FACTOR = 0.9;

/** Estimated rendered width of a piece of text, in px. */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  style: FontStyle = "body"
): number {
  return (text.length * fontSize * CHAR_ADVANCE[style]) / SAFETY_FACTOR;
}

/** Fit a single word to the available width, truncating with "…" if needed. */
function fitWord(word: string, maxWidth: number, fontSize: number, style: FontStyle): string {
  if (estimateTextWidth(word, fontSize, style) <= maxWidth) return word;
  let lo = 0;
  let hi = word.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTextWidth(word.slice(0, mid) + "…", fontSize, style) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? word.slice(0, lo) + "…" : "…";
}

/** Greedy word-wrap `text` into lines that fit within `maxWidth` px. */
export function wrapToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  style: FontStyle = "body"
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = fitWord(words[0], maxWidth, fontSize, style);
  for (let i = 1; i < words.length; i++) {
    const word = fitWord(words[i], maxWidth, fontSize, style);
    const candidate = `${current} ${word}`;
    if (estimateTextWidth(candidate, fontSize, style) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}
