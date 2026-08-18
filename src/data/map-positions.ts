/**
 * Marker placements for bioregions on the Europe map.
 *
 * Keyed by the normalized bioregion name (lowercased, diacritics stripped,
 * non-alphanumerics -> dashes) — the same normalization used on the Notion
 * "URL slug" / name fallback — so markers survive slug changes. Bioregions
 * without an entry here simply don't appear on the map yet.
 *
 * Coordinates are approximate centre points of each bioregion. `ring` is the
 * marker/label colour, following the w1 map's per-group palette
 * (teal = NW Europe, olive = eastern, bronze = southern).
 */
export interface MapPosition {
  lat: number;
  lng: number;
  ring: string;
}

export const MAP_POSITIONS: Record<string, MapPosition> = {
  // Approximate centre points of each bioregion, refined against real
  // geography (delta/river basins, watershed centres, valley midpoints).
  "living-delta": { lat: 51.95, lng: 4.6, ring: "#74a7a5" },
  "orne-watershed": { lat: 48.55, lng: 0.0, ring: "#74a7a5" },
  "mid-vistula-river-valley": { lat: 51.85, lng: 21.6, ring: "#a8a775" },
  "oltenia-de-sub-munte": { lat: 45.2, lng: 24.3, ring: "#a8a775" },
  cilento: { lat: 40.2, lng: 15.15, ring: "#bf7a3b" },
  laconia: { lat: 37.05, lng: 22.45, ring: "#bf7a3b" },
};

/** Default ring colour for bioregions without an explicit entry. */
export const DEFAULT_RING = "#a8a775";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function findPosition(slug: string, name: string): MapPosition | null {
  return MAP_POSITIONS[normalizeName(slug)] || MAP_POSITIONS[normalizeName(name)] || null;
}
