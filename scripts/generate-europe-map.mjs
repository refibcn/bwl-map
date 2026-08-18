#!/usr/bin/env node
/**
 * Generate src/data/europe-map.json from Natural Earth (world-atlas) data.
 *
 * The BWL map landings need Europe geometry with a *known* projection so that
 * markers (bioregion lat/lng) line up with the drawn land. We use a plain
 * equirectangular mapping (x = longitude, y = latitude, linearly scaled) over
 * the bounding box of the selected countries: Natural Earth is stored in
 * lat/lng, so the same linear formula places both land and markers.
 *
 * Output: { bounds, width, height, countries: [{ id, name, d }] }
 *   - `d` is a list of SVG path data strings (one per polygon ring group);
 *     rings that fall outside the map window (e.g. Canary Islands) are dropped.
 *
 * Usage: node scripts/generate-europe-map.mjs
 * Requires: npm i -D world-atlas topojson-client
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { feature } from "topojson-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(
  readFileSync(join(__dirname, "../node_modules/world-atlas/countries-50m.json"), "utf8")
);
const fc = feature(topo, topo.objects.countries);

/** Countries shown on the map. Russia/Turkey/Iceland/Cyprus excluded on purpose:
 *  Russia and Turkey would dominate the bounding box, Iceland and Cyprus would
 *  stretch the map window — the BWL map centres on the continent. */
const EUROPE = new Set([
  "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herz.",
  "Bulgaria", "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France",
  "Germany", "Greece", "Hungary", "Ireland", "Italy", "Kosovo", "Latvia",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Malta", "Moldova",
  "Monaco", "Montenegro", "Netherlands", "Norway", "Poland", "Portugal",
  "Romania", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
  "Switzerland", "Ukraine", "United Kingdom", "Vatican",
]);

/** Clip window (lon/lat) — drops far-flung islands (Canaries, Azores,
 *  Svalbard, Jan Mayen) and the parts of Ukraine east of the map.
 *  latMax 60 keeps Denmark, the Baltics and the UK but cuts the
 *  Scandinavian peninsula (Norway/Sweden/Finland) so the default view
 *  focuses on central and southern Europe. */
const CLIP = { lngMin: -14, lngMax: 33, latMin: 33, latMax: 60 };

function inWindow([lng, lat]) {
  return lng >= CLIP.lngMin && lng <= CLIP.lngMax && lat >= CLIP.latMin && lat <= CLIP.latMax;
}

/** Project one ring (array of [lng, lat]) into SVG path data. */
function ringToPath(ring, b) {
  let d = "";
  // Equirectangular with a standard parallel at 45N: longitude is compressed
  // by cos(45) so Europe keeps its natural proportions (a plain lat/lng plot
  // stretches it horizontally — the map looked wider than the w1 map).
  const COS_PHI = Math.cos((45 * Math.PI) / 180);
  const xScale = 1000 * COS_PHI;
  const yScale = ((b.latMax - b.latMin) / (b.lngMax - b.lngMin)) * 1000 * (1 / COS_PHI);
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const x = ((lng - b.lngMin) / (b.lngMax - b.lngMin)) * xScale;
    const y = ((b.latMax - lat) / (b.latMax - b.latMin)) * yScale;
    const px = Math.round(x * 10) / 10;
    const py = Math.round(y * 10) / 10;
    d += (i === 0 ? "M" : "L") + px + " " + py;
  }
  return d + "Z";
}

// 1. Select European countries.
const selected = fc.features.filter((f) => EUROPE.has(f.properties.name));
const found = new Set(selected.map((f) => f.properties.name));
const missing = [...EUROPE].filter((n) => !found.has(n));
if (missing.length) console.warn("Not found in dataset:", missing.join(", "));

// 2. Collect rings (with ring bboxes) to compute the real bounding box.
const rings = [];
for (const f of selected) {
  const geom = f.geometry;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    // Outer ring only for the bbox/count; holes (lakes) are drawn too via the
    // full polygon, but for the bbox the outer ring is enough.
    for (const ring of poly) {
      if (!ring.length) continue;
      let minL = Infinity, maxL = -Infinity, minA = Infinity, maxA = -Infinity;
      for (const [lng, lat] of ring) {
        if (lng < minL) minL = lng;
        if (lng > maxL) maxL = lng;
        if (lat < minA) minA = lat;
        if (lat > maxA) maxA = lat;
      }
      rings.push({ f, ring, bbox: { minL, maxL, minA, maxA } });
    }
  }
}

// 3. Bounding box over rings that are FULLY inside the clip window.
//    (Rings that merely cross the window edge — e.g. eastern Ukraine,
//    Svalbard — would otherwise inflate the map bounds.)
const visible = rings.filter(
  (r) => r.bbox.minL >= CLIP.lngMin && r.bbox.maxL <= CLIP.lngMax && r.bbox.minA >= CLIP.latMin && r.bbox.maxA <= CLIP.latMax
);
let lngMin = Infinity, lngMax = -Infinity, latMin = Infinity, latMax = -Infinity;
for (const r of visible) {
  lngMin = Math.min(lngMin, r.bbox.minL);
  lngMax = Math.max(lngMax, r.bbox.maxL);
  latMin = Math.min(latMin, r.bbox.minA);
  latMax = Math.max(latMax, r.bbox.maxA);
}
// Padding (2.5%) so markers on the rim don't get cut.
const lngPad = (lngMax - lngMin) * 0.025;
const latPad = (latMax - latMin) * 0.025;
const bounds = {
  lngMin: lngMin - lngPad,
  lngMax: lngMax + lngPad,
  latMin: latMin - latPad,
  latMax: latMax + latPad,
};

// 4. Project every polygon (outer ring + holes) into path data.
const countries = selected.map((f) => {
  const geom = f.geometry;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const parts = [];
  for (const poly of polys) {
    let ringD = "";
    for (const ring of poly) {
      if (!ring.length) continue;
      // Only keep rings that have at least one point in the window.
      if (!ring.some(inWindow)) continue;
      ringD += ringToPath(ring, bounds);
    }
    if (ringD) parts.push(ringD);
  }
  return { id: f.id, name: f.properties.name, d: parts };
}).filter((c) => c.d.length > 0);

const out = {
  bounds,
  width: 1000,
  height: Math.round(((bounds.latMax - bounds.latMin) / (bounds.lngMax - bounds.lngMin)) * 1000 * (1 / Math.cos((45 * Math.PI) / 180)) * 10) / 10,
  countries,
};

const json = JSON.stringify(out);
writeFileSync(join(__dirname, "../src/data/europe-map.json"), json);
console.log(
  `bounds: lng ${bounds.lngMin.toFixed(2)}..${bounds.lngMax.toFixed(2)}, lat ${bounds.latMin.toFixed(2)}..${bounds.latMax.toFixed(2)}`
);
console.log(`viewBox: 0 0 ${out.width} ${out.height}`);
console.log(`countries: ${countries.length}, size: ${(json.length / 1024).toFixed(0)} KB`);
