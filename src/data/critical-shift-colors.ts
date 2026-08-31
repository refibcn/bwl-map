/**
 * One explicit, unique colour per critical shift.
 *
 * Mirrors the MAP_POSITIONS/DEFAULT_RING pattern in `map-positions.ts`: a
 * hand-curated lookup keyed by slug, with a fallback for anything not yet
 * mapped. Replaces the old hash-based `shiftColor()` (src/lib/shift-pages.ts),
 * which collided badly — with only 8 hashed buckets for 13 shifts, several
 * shifts shared a colour. Every slug below gets its own value, all drawn
 * from the same muted teal/gold/sage/brown family as the original 8.
 */
export const SHIFT_COLORS: Record<string, string> = {
  "education-knowledge": "#E2AD4F", // gold — knowledge/light
  "ecosystems-biodiversity": "#3A5A43", // deep green — nature
  "policy-advocacy": "#BF7A3B", // bronze — matches Laconia/Cilento on the bioregions map
  "energy-carbon": "#643545", // deep plum
  "finance-ownership": "#20404F", // BWL primary navy
  "housing-infrastructure": "#5A7684", // slate blue-grey — structural
  "culture-heritage": "#AC7980", // dusty rose
  "community-self-governance": "#4A7C6F", // sage
  "health-social-services": "#973417", // muted rust — warm/caring
  "value-chains-economic-development": "#8B5A2B", // warm brown — trade/goods
  "food-agriculture": "#A8A775", // olive — matches Oltenia/Mid Vistula on the bioregions map
  "tourism-recreation-hospitality": "#74A7A5", // teal — matches Living Delta/Orne on the bioregions map
  "youth-opportunities": "#93809B", // muted mauve
};

/** Fallback for any shift slug without an explicit entry above. */
export const DEFAULT_SHIFT_COLOR = "#5C8A7A";
