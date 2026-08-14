import type { Loader } from "astro/loaders";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DATA_SOURCES,
  queryAll,
  getTagTitle,
  getEmoji,
  getRichText,
  slugify,
  deriveShiftName,
} from "./notion-loader";

/**
 * One critical shift record, as shown on its own page. Shape mirrors the
 * shifts embedded in each bioregion entry (same source data source), but this
 * collection is the authoritative full list: every shift in the database gets
 * a page even when no published systemic innovation is linked to it yet.
 */
export interface ShiftRecord {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  shift: string;
  leveragePoint: string;
  systemicBarrier: string;
}

export function notionShiftLoader(): Loader {
  return {
    name: "notion-shifts",
    load: async ({ store, logger }) => {
      // Drop entries from previous syncs so stale shifts never survive.
      store.clear();

      const token = import.meta.env.NOTION_TOKEN || process.env.NOTION_TOKEN;
      if (!token) {
        logger.warn("NOTION_TOKEN not found; falling back to local fixture shifts");
        try {
          const __dirname = dirname(fileURLToPath(import.meta.url));
          const fixturePath = join(__dirname, "../data/bioregions/oltenia-de-sub-munte.json");
          const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
          for (const s of fixture.criticalShifts) {
            store.set({
              id: s.slug,
              data: { ...s, id: s.id ?? s.slug, emoji: s.emoji ?? null } as ShiftRecord,
            });
          }
          logger.info(`Loaded ${fixture.criticalShifts.length} shifts from local fixture`);
        } catch (err) {
          logger.error(`Failed to load fixture shifts: ${(err as Error).message}`);
        }
        return;
      }

      const shifts = await queryAll(DATA_SOURCES.criticalShifts, token);
      for (const s of shifts) {
        const tagName = getTagTitle(s.properties);
        const shiftText = getRichText(s.properties, "Critical Shift");
        const name = tagName || deriveShiftName(shiftText);
        const slug = tagName ? slugify(tagName) : slugify(name);
        store.set({
          id: slug,
          data: {
            id: s.id,
            slug,
            name,
            emoji: getEmoji(s),
            shift: shiftText,
            leveragePoint: getRichText(s.properties, "Leverage Point"),
            systemicBarrier: getRichText(s.properties, "Systemic Barrier"),
          } as ShiftRecord,
        });
      }
      logger.info(`Loaded ${shifts.length} critical shifts`);
    },
  };
}
