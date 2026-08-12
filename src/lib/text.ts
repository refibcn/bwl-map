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

/** Keep at most `maxLines` lines; the last kept line gets an ellipsis. */
export function capLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1].replace(/\s+$/, "") + "…";
  return kept;
}
