import type { Loader } from "astro/loaders";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA_SOURCES = {
  bioregions: "09bb5c91-1953-83f5-9764-8752cc035242",
  systemicInnovations: "10fb5c91-1953-8220-b0eb-07e2687cca77",
  criticalShifts: "35db5c91-1953-80ab-aae6-000b64ea6545",
};

export interface CriticalShift {
  slug: string;
  name: string;
  shift: string;
  leveragePoint: string;
  systemicBarrier: string;
}

export interface SystemicInnovation {
  slug: string;
  name: string;
  tags: string[];
  depth: "core" | "story";
  notionUrl: string | null;
}

export interface BioregionEntry {
  id: string;
  slug: string;
  name: string;
  country: string;
  location: string;
  intro: string;
  notionUrl: string;
  active: boolean;
  criticalShifts: CriticalShift[];
  systemicInnovations: SystemicInnovation[];
}

function getTitle(props: any) {
  return props.Name?.title?.map((t: any) => t.plain_text).join("") || "";
}

function getTagTitle(props: any) {
  return props.Tag?.title?.map((t: any) => t.plain_text).join("") || "";
}

function getRichText(props: any, key: string) {
  return props[key]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
}

function getSelect(props: any, key: string) {
  return props[key]?.select?.name || "";
}

function getCheckbox(props: any, key: string) {
  return props[key]?.checkbox || false;
}

function getRelationIds(props: any, key: string) {
  return props[key]?.relation?.map((r: any) => r.id) || [];
}

function getUrl(props: any, key: string) {
  return props[key]?.url || "";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function deriveShiftName(shiftText: string) {
  const text = shiftText.toLowerCase();
  if (text.includes("policy")) return "Policy and advocacy";
  if (text.includes("capital") || text.includes("financ") || text.includes("ownership")) return "Finance and ownership";
  if (text.includes("culture") || text.includes("heritage") || text.includes("tradition")) return "Culture and heritage";
  if (text.includes("knowledge") || text.includes("education") || text.includes("skill")) return "Education and knowledge";
  if (text.includes("ecosystem") || text.includes("biodiversity")) return "Ecosystems and biodiversity";
  if (text.includes("econom") || text.includes("value chain") || text.includes("business model")) return "Value chains and economic development";
  if (text.includes("agriculture") || text.includes("food") || text.includes("farm")) return "Food and agriculture";
  if (text.includes("energy") || text.includes("carbon")) return "Energy and carbon";
  if (text.includes("tourism") || text.includes("recreation")) return "Tourism and hospitality";
  if (text.includes("housing") || text.includes("infrastructure")) return "Housing and infrastructure";
  if (text.includes("health") || text.includes("care") || text.includes("well-being")) return "Health and social services";
  if (text.includes("governance") || text.includes("community")) return "Community and self-governance";
  return "Critical shift";
}

async function notionFetch(path: string, options: RequestInit = {}, token: string) {
  const url = `https://api.notion.com/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${err.message || res.statusText}`);
  }
  return res.json();
}

async function queryAll(dsId: string, token: string, filter?: any) {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const body: any = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/data_sources/${dsId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
    results.push(...res.results);
    cursor = res.next_cursor;
  } while (cursor);
  return results;
}

export function notionBioregionLoader(): Loader {
  return {
    name: "notion-bioregions",
    load: async ({ store, logger }) => {
      const token = import.meta.env.NOTION_TOKEN || process.env.NOTION_TOKEN;
      if (!token) {
        logger.warn("NOTION_TOKEN not found; falling back to local fixture");
        try {
          const __dirname = dirname(fileURLToPath(import.meta.url));
          const fixturePath = join(__dirname, "../data/bioregions/oltenia-de-sub-munte.json");
          const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
          store.set({
            id: fixture.slug,
            data: fixture as BioregionEntry,
          });
          logger.info(`Loaded local fixture: ${fixture.name}`);
        } catch (err) {
          logger.error(`Failed to load local fixture: ${(err as Error).message}`);
        }
        return;
      }

      logger.info("Fetching bioregions from Notion...");

      const bioregions = await queryAll(DATA_SOURCES.bioregions, token);
      const systemicInnovations = await queryAll(DATA_SOURCES.systemicInnovations, token);
      const criticalShifts = await queryAll(DATA_SOURCES.criticalShifts, token);

      for (const bio of bioregions) {
        if (!getCheckbox(bio.properties, "Active")) {
          logger.info(`Skipping inactive bioregion: ${getTitle(bio.properties)}`);
          continue;
        }

        const bioId = bio.id;
        const bioName = getTitle(bio.properties);
        const bioSlug = getRichText(bio.properties, "URL slug") || slugify(bioName);

        const relatedShiftIds = getRelationIds(bio.properties, "💫 Critical Shifts Rel");
        const bioShifts = criticalShifts
          .filter((s) => relatedShiftIds.includes(s.id))
          .map((s) => {
            const tagName = getTagTitle(s.properties);
            const shiftText = getRichText(s.properties, "Critical Shift");
            const name = tagName || deriveShiftName(shiftText);
            const slug = tagName ? slugify(tagName) : slugify(name);
            return {
              slug,
              name,
              shift: shiftText,
              leveragePoint: getRichText(s.properties, "Leverage Point"),
              systemicBarrier: getRichText(s.properties, "Systemic Barrier"),
            };
          });

        const shiftSlugById = new Map(bioShifts.map((s, i) => {
          const id = relatedShiftIds[i];
          return id ? [id, s.slug] : ["", ""];
        }).filter(([id]) => id));

        const bioInnovations = systemicInnovations
          .filter((i) => getRelationIds(i.properties, "Bioregion").includes(bioId))
          .map((i) => {
            const tags = getRelationIds(i.properties, "Critical Shifts Tags")
              .map((id) => shiftSlugById.get(id))
              .filter(Boolean) as string[];
            return {
              slug: getRichText(i.properties, "URL slug") || slugify(getTitle(i.properties)),
              name: getTitle(i.properties),
              tags,
              depth: getCheckbox(i.properties, "Case Study") ? "story" : "core",
              notionUrl: getUrl(i.properties, "Website") || getUrl(i.properties, "Learn More") || null,
            };
          });

        const entry: BioregionEntry = {
          id: bioId,
          slug: bioSlug,
          name: bioName,
          country: getSelect(bio.properties, "Country"),
          location: getRichText(bio.properties, "Location"),
          intro: getRichText(bio.properties, "Bioregion Description"),
          notionUrl: bio.url,
          active: true,
          criticalShifts: bioShifts,
          systemicInnovations: bioInnovations,
        };

        store.set({
          id: bioSlug,
          data: entry,
        });

        logger.info(`Loaded bioregion: ${bioName} (${bioShifts.length} shifts, ${bioInnovations.length} innovations)`);
      }
    },
  };
}
