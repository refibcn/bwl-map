import europeMap from "../data/europe-map.json";

/**
 * Project lat/lng onto the Europe map canvas, returned as percentages of the
 * stage (left/top). Uses the exact same linear mapping as the generator
 * (scripts/generate-europe-map.mjs), so markers land on the drawn land.
 */
export interface Bounds {
  lngMin: number;
  lngMax: number;
  latMin: number;
  latMax: number;
}

const bounds = europeMap.bounds as Bounds;

export function projectToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { x, y };
}
