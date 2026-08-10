/**
 * Text measurement + wrapping helpers for the SVG diagram.
 *
 * SVG <text> cannot auto-wrap, so we estimate the rendered width at build
 * time using an average per-character advance (in em) per font style. The
 * ratios are deliberately conservative (slightly wide) so wrapped lines never
 * overflow their card — this is the generic "length/format controller" that
 * keeps card text fitting for any bioregion.
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
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (estimateTextWidth(candidate, fontSize, style) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}
