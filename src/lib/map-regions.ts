import type { BioregionEntry } from "./notion-loader";
import { findPosition, DEFAULT_RING } from "../data/map-positions";
import { projectToPercent } from "./map-projection";

/** One clickable spot on the Europe map (mirrors w1's REGIONS config shape). */
export interface MapRegion {
  slug: string;
  name: string;
  country: string;
  desc: string;
  imageFile: string | null;
  imageUrl: string | null;
  x: number; // percent of stage (legacy static-SVG projection, unused by the MapLibre map)
  y: number;
  lat: number;
  lng: number;
  ring: string;
}

/**
 * Turn the bioregions collection into map regions. Bioregions without a
 * known position (see src/data/map-positions.ts) are skipped.
 */
export function buildMapRegions(entries: BioregionEntry[]): MapRegion[] {
  const regions: MapRegion[] = [];
  for (const b of entries) {
    const pos = findPosition(b.slug, b.name);
    if (!pos) continue;
    const { x, y } = projectToPercent(pos.lat, pos.lng);
    regions.push({
      slug: b.slug,
      name: b.name,
      country: b.country,
      desc: b.country,
      imageFile: b.imageFile,
      imageUrl: b.imageUrl,
      x,
      y,
      lat: pos.lat,
      lng: pos.lng,
      ring: pos.ring,
    });
  }
  return regions.sort((a, b) => a.name.localeCompare(b.name));
}
