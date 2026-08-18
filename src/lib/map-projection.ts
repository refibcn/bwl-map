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

// Same projection as the generator: equirectangular with a standard parallel
// at 45N (longitude compressed by cos(45)) — keeps marker/land alignment.
const COS_PHI = Math.cos((45 * Math.PI) / 180);

export function projectToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100 * COS_PHI;
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { x, y };
}
