import type { BioregionEntry } from "./notion-loader";
import type { ShiftRecord } from "./shift-loader";
import { SHIFT_COLORS, DEFAULT_SHIFT_COLOR } from "../data/critical-shift-colors";

/**
 * Critical Shifts section — shift-centric view built from the SAME Notion
 * relations the bioregion pages use (resolved by the loader):
 *
 *   bioregion --"💫 Critical Shifts Rel"--> critical shift
 *   systemic innovation --"Bioregion"--> bioregion
 *   systemic innovation --"Critical Shifts Tags"--> critical shift
 *
 * For each critical shift we aggregate the bioregions that work on it and
 * the systemic innovations (of those bioregions) tagged with it.
 */

export interface ShiftBioRef {
  slug: string;
  name: string;
  country: string;
  imageFile: string | null;
  imageUrl: string | null;
}

export interface ShiftInnovationRef {
  slug: string;
  name: string;
  description: string;
  depth: string;
  notionUrl: string | null;
  externalUrl: string | null;
  imageFile: string | null;
  imageUrl: string | null;
  bioregionSlug: string;
  bioregionName: string;
}

export interface ShiftPageData {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  shift: string;
  leveragePoint: string;
  systemicBarrier: string;
  bioregions: ShiftBioRef[];
  innovations: ShiftInnovationRef[];
}

/**
 * Aggregate bioregion entries into one record per critical shift.
 *
 * `shifts` is the authoritative full list (every shift in the database gets a
 * page, even with no published innovations); the bioregion entries provide
 * the links: a bioregion is listed when it works on the shift, and the
 * innovations shown are its published ones tagged with the shift.
 */
export function buildShiftPages(entries: BioregionEntry[], shifts: ShiftRecord[]): ShiftPageData[] {
  const pages: ShiftPageData[] = shifts.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    emoji: s.emoji,
    shift: s.shift,
    leveragePoint: s.leveragePoint,
    systemicBarrier: s.systemicBarrier,
    bioregions: [],
    innovations: [],
  }));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  for (const b of entries) {
    for (const s of b.criticalShifts) {
      const page = bySlug.get(s.slug);
      if (!page) continue;
      if (!page.bioregions.some((x) => x.slug === b.slug)) {
        page.bioregions.push({
          slug: b.slug,
          name: b.name,
          country: b.country,
          imageFile: b.imageFile,
          imageUrl: b.imageUrl,
        });
      }
      for (const inv of b.systemicInnovations) {
        if (inv.tags.includes(s.slug) && !page.innovations.some((x) => x.slug === inv.slug)) {
          page.innovations.push({
            slug: inv.slug,
            name: inv.name,
            description: inv.description,
            depth: inv.depth,
            notionUrl: inv.notionUrl,
            externalUrl: inv.externalUrl,
            imageFile: inv.imageFile,
            imageUrl: inv.imageUrl,
            bioregionSlug: b.slug,
            bioregionName: b.name,
          });
        }
      }
    }
  }
  return pages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Stable colour per shift (same colour on every page that mentions it).
 * Explicit per-slug lookup (see src/data/critical-shift-colors.ts) — every
 * shift gets its own unique colour; unmapped slugs fall back to a default.
 */
export function shiftColor(slug: string): string {
  return SHIFT_COLORS[slug] ?? DEFAULT_SHIFT_COLOR;
}
