import type { Loader } from "astro/loaders";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA_SOURCES = {
  bioregions: "09bb5c91-1953-83f5-9764-8752cc035242",
  systemicInnovations: "10fb5c91-1953-8220-b0eb-07e2687cca77",
  criticalShifts: "35db5c91-1953-80ab-aae6-000b64ea6545",
};

export interface CriticalShift {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  shift: string;
  leveragePoint: string;
  systemicBarrier: string;
}

export interface SystemicInnovation {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  depth: "core" | "story";
  notionUrl: string | null;
  /** Original remote URL (fallback; Notion signed URLs expire). */
  imageUrl: string | null;
  /** Local filename in src/assets/notion-images/ (downloaded at build time). */
  imageFile: string | null;
}

export interface BioregionEntry {
  id: string;
  slug: string;
  name: string;
  country: string;
  location: string;
  intro: string;
  shortNarrative: string;
  /** Original remote URL (fallback; Notion signed URLs expire). */
  imageUrl: string | null;
  /** Local filename in src/assets/notion-images/ (downloaded at build time). */
  imageFile: string | null;
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

function getEmoji(page: any) {
  if (page.icon?.type === "emoji") return page.icon.emoji;
  return null;
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

function getStatus(props: any, key: string) {
  return props[key]?.status?.name || props[key]?.select?.name || "";
}

function getRelationIds(props: any, key: string) {
  return props[key]?.relation?.map((r: any) => r.id) || [];
}

function getUrl(props: any, key: string) {
  return props[key]?.url || "";
}

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]);
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

function ensureImageExtension(filename: string, contentType: string | null): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.has(ext)) return filename;
  const mapped = contentType ? CONTENT_TYPE_EXTENSIONS[contentType.split(";")[0].trim()] : undefined;
  return mapped ? `${filename}.${mapped}` : filename;
}

/**
 * Download a Notion file into the build-time images dir.
 * Returns the local filename (must match the import.meta.glob pattern in
 * src/lib/images.ts), or null if the download failed.
 */
async function downloadImage(
  url: string,
  filename: string,
  imagesDir: string,
  logger: any
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const finalFilename = ensureImageExtension(filename, res.headers.get("content-type"));
    writeFileSync(join(imagesDir, finalFilename), buffer);
    return finalFilename;
  } catch (err) {
    logger.warn(`Failed to download image ${url}: ${(err as Error).message}`);
    return null;
  }
}

/** Find a property key by exact name, falling back to a case-insensitive match. */
function findPropertyKey(props: any, ...names: string[]): string | null {
  const keys = Object.keys(props);
  for (const name of names) {
    const exact = keys.find((k) => k === name);
    if (exact) return exact;
    const lower = name.toLowerCase();
    const fuzzy = keys.find((k) => k.toLowerCase() === lower);
    if (fuzzy) return fuzzy;
  }
  return null;
}

async function resolveImage(
  props: any,
  key: string,
  prefix: string,
  imagesDir: string,
  logger: any
): Promise<{ file: string | null; url: string | null }> {
  const propKey = findPropertyKey(props, key);
  if (!propKey) return { file: null, url: null };

  // Try a Files & Media property first.
  const files = props[propKey]?.files;
  if (Array.isArray(files) && files.length > 0) {
    const file = files[0];
    if (file.type === "external") return { file: null, url: file.external?.url || null };
    if (file.type === "file") {
      const url = file.file?.url;
      if (!url) return { file: null, url: null };
      const filename = `${prefix}-${sanitizeFilename(file.name || "image")}`;
      const local = await downloadImage(url, filename, imagesDir, logger);
      return { file: local, url };
    }
  }

  // Fall back to a URL property (e.g. "Thumbnail Image" as URL).
  const urlProp = props[propKey]?.url;
  if (urlProp) return { file: null, url: urlProp };

  return { file: null, url: null };
}

async function resolvePageIcon(
  page: any,
  prefix: string,
  imagesDir: string,
  logger: any
): Promise<{ file: string | null; url: string | null }> {
  if (page.icon?.type === "external") return { file: null, url: page.icon.external?.url || null };
  if (page.icon?.type === "file") {
    const url = page.icon.file?.url;
    if (!url) return { file: null, url: null };
    const local = await downloadImage(url, `${prefix}-icon`, imagesDir, logger);
    return { file: local, url };
  }
  return { file: null, url: null };
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
      // Drop entries from previous syncs (e.g. the local fixture) so stale
      // pages never survive into a new build.
      store.clear();

      // Download Notion files into src/assets/notion-images/, resolved at build
      // time via import.meta.glob in src/lib/images.ts. NOT public/ — files
      // written there mid-build are not reliably copied to dist/.
      const imagesDir = fileURLToPath(new URL("../../src/assets/notion-images/", import.meta.url));
      mkdirSync(imagesDir, { recursive: true });

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
        // Only main bioregions get their own page: sub-bioregions (e.g. the
        // Living Delta members) have a non-empty "Parent item" relation and
        // will be folded into the main bioregion page later.
        if (getRelationIds(bio.properties, "Parent item").length > 0) {
          logger.info(`Skipping sub-bioregion: ${getTitle(bio.properties)}`);
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
              id: s.id,
              slug,
              name,
              emoji: getEmoji(s),
              shift: shiftText,
              leveragePoint: getRichText(s.properties, "Leverage Point"),
              systemicBarrier: getRichText(s.properties, "Systemic Barrier"),
            };
          });

        // Map by the shift's own id — NOT by array index: bioShifts follows the
        // criticalShifts source order, which can differ from the relation order,
        // and a mismatched pairing would connect SIS cards to the wrong shifts.
        const shiftSlugById = new Map(bioShifts.map((s) => [s.id, s.slug]));

        const bioInnovationsRaw = systemicInnovations
          .filter((i) => getRelationIds(i.properties, "Bioregion").includes(bioId))
          .filter((i) => getStatus(i.properties, "Website Status") === "publish");

        const bioInnovations = await Promise.all(
          bioInnovationsRaw.map(async (i) => {
            const tags = getRelationIds(i.properties, "Critical Shifts Tags")
              .map((id) => shiftSlugById.get(id))
              .filter(Boolean) as string[];
            const slug = getRichText(i.properties, "URL slug") || slugify(getTitle(i.properties));
            const image = await resolveImage(i.properties, "Files & Media", slug, imagesDir, logger);
            return {
              slug,
              name: getTitle(i.properties),
              description: getRichText(i.properties, "short description") || getRichText(i.properties, "Description"),
              tags,
              depth: getCheckbox(i.properties, "Case Study") ? "story" : "core",
              notionUrl: getUrl(i.properties, "Website") || getUrl(i.properties, "Learn More") || null,
              imageUrl: image.url,
              imageFile: image.file,
            };
          })
        );

        // Only keep critical shifts that have at least one published SIS linked.
        const linkedShiftSlugs = new Set(bioInnovations.flatMap((i) => i.tags));
        const activeShifts = bioShifts.filter((s) => linkedShiftSlugs.has(s.slug));

        const thumb = await resolveImage(bio.properties, "Thumbnail image", bioSlug, imagesDir, logger);
        const icon =
          thumb.file || thumb.url ? { file: null, url: null } : await resolvePageIcon(bio, bioSlug, imagesDir, logger);

        const entry: BioregionEntry = {
          id: bioId,
          slug: bioSlug,
          name: bioName,
          country: getSelect(bio.properties, "Country"),
          location: getRichText(bio.properties, "Location"),
          intro: getRichText(bio.properties, "Bioregion Description"),
          shortNarrative: getRichText(bio.properties, "short weaving narrative") || getRichText(bio.properties, "Bioregion Description"),
          imageUrl: thumb.url || icon.url || null,
          imageFile: thumb.file || icon.file || null,
          notionUrl: bio.url,
          active: true,
          criticalShifts: activeShifts,
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
