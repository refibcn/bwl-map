/**
 * SVG path helpers for the diagram cards (FlowDiagram, VerticalFlow,
 * ShiftDiagram, VerticalShiftDiagram).
 */

/**
 * Build a rounded-rect path with independently roundable corners. A plain
 * SVG <rect rx> rounds all four corners uniformly, which looks wrong for a
 * card image that only covers part of a card: the corners where the image
 * meets the card's own interior (text area) should stay sharp — only the
 * corners that sit on the card's own outer edge should be rounded. Pass the
 * corners that ARE on the outer edge as true.
 *
 * Takes plain booleans (not an options object) — an inline object literal
 * as a template-expression argument trips up the Astro compiler inside a
 * .map() callback, so this signature sidesteps that entirely.
 *
 * Presets for this codebase's card layouts:
 *   image on top   -> roundedRectPath(x, y, w, h, r, true, true, false, false)
 *   image on left  -> roundedRectPath(x, y, w, h, r, true, false, false, true)
 */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  topLeft: boolean,
  topRight: boolean,
  bottomRight: boolean,
  bottomLeft: boolean
): string {
  const tl = topLeft ? r : 0;
  const tr = topRight ? r : 0;
  const br = bottomRight ? r : 0;
  const bl = bottomLeft ? r : 0;
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : `L${x + w},${y}`,
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : `L${x + w},${y + h}`,
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : `L${x},${y + h}`,
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : `L${x},${y}`,
    "Z",
  ].join(" ");
}
