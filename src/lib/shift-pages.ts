import type { BioregionEntry } from "./notion-loader";

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

/** Aggregate bioregion entries into one record per critical shift. */
export function buildShiftPages(entries: BioregionEntry[]): ShiftPageData[] {
  const bySlug = new Map<string, ShiftPageData>();
  for (const b of entries) {
    for (const s of b.criticalShifts) {
      let page = bySlug.get(s.slug);
      if (!page) {
        page = {
          id: s.id,
          slug: s.slug,
          name: s.name,
          emoji: s.emoji,
          shift: s.shift,
          leveragePoint: s.leveragePoint,
          systemicBarrier: s.systemicBarrier,
          bioregions: [],
          innovations: [],
        };
        bySlug.set(s.slug, page);
      }
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
            imageFile: inv.imageFile,
            imageUrl: inv.imageUrl,
            bioregionSlug: b.slug,
            bioregionName: b.name,
          });
        }
      }
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Stable colour per shift (same colour on every page that mentions it). */
export function shiftColor(slug: string): string {
  const PALETTE = [
    "#20404F", // BWL primary
    "#E2AD4F", // BWL secondary
    "#5C8A7A", // muted teal
    "#C78A1D", // darker gold
    "#4A7C6F", // sage
    "#8B5A2B", // warm brown
    "#3D6B66", // deep sage
    "#D4A84B", // light gold
  ];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}
