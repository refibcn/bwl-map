/**
 * Resolve Notion images downloaded at build time.
 *
 * The Notion loader (src/lib/notion-loader.ts) downloads Files & Media,
 * Thumbnail Image, and page-icon files into src/assets/notion-images/ during
 * content sync. Files that appear mid-build can't be statically imported, so we
 * resolve them with import.meta.glob: Vite scans the folder when this module
 * loads (after sync, before rendering) and emits the files into the bundle
 * (dist/_astro/) with the site base path applied automatically.
 *
 * NOTE: the glob pattern must stay in sync with the loader's imagesDir
 * (src/lib/notion-loader.ts) — both point at "src/assets/notion-images".
 */
const imageUrls = import.meta.glob<string>(
  "/src/assets/notion-images/*.{jpg,jpeg,png,webp,gif,svg,avif}",
  { eager: true, query: "?url", import: "default" }
);

/** Map a downloaded Notion image filename to its build-time asset URL. */
export function notionImageUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  return imageUrls[`/src/assets/notion-images/${filename}`];
}
