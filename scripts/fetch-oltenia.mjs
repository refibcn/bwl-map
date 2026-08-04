import { config } from "dotenv";
config({ path: ".env" });

const token = process.env.NOTION_TOKEN;

const DATA_SOURCES = {
  bioregions: "09bb5c91-1953-83f5-9764-8752cc035242",
  systemicInnovations: "10fb5c91-1953-8220-b0eb-07e2687cca77",
  criticalShifts: "35db5c91-1953-80ab-aae6-000b64ea6545",
};

async function notionFetch(path, options = {}) {
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

async function queryAll(dsId, filter) {
  const results = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/data_sources/${dsId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    results.push(...res.results);
    cursor = res.next_cursor;
  } while (cursor);
  return results;
}

function getTitle(props) {
  return props.Name?.title?.map((t) => t.plain_text).join("") || "";
}

function getRichText(props, key) {
  return props[key]?.rich_text?.map((t) => t.plain_text).join("") || "";
}

function getSelect(props, key) {
  return props[key]?.select?.name || "";
}

function getRelationIds(props, key) {
  return props[key]?.relation?.map((r) => r.id) || [];
}

async function main() {
  const bioregions = await queryAll(DATA_SOURCES.bioregions);
  const oltenia = bioregions.find(
    (b) =>
      getTitle(b.properties).toLowerCase().includes("oltenia") ||
      getRichText(b.properties, "URL slug") === "oltenia-de-sub-munte"
  );

  if (!oltenia) {
    console.log("Bioregions found:");
    bioregions.forEach((b) => console.log(" -", getTitle(b.properties)));
    throw new Error("Oltenia de Sub Munte not found");
  }

  const olteniaId = oltenia.id;
  console.log("Found bioregion:", getTitle(oltenia.properties), olteniaId);

  const systemicInnovations = await queryAll(DATA_SOURCES.systemicInnovations, {
    property: "Bioregion",
    relation: { contains: olteniaId },
  });
  console.log("Systemic innovations:", systemicInnovations.length);

  const criticalShifts = await queryAll(DATA_SOURCES.criticalShifts);
  const olteniaShiftIds = getRelationIds(oltenia.properties, "💫 Critical Shifts Rel");
  const olteniaShifts = criticalShifts.filter((s) => olteniaShiftIds.includes(s.id));
  console.log("Critical shifts:", olteniaShifts.length);

  const shiftSlugMap = new Map(
    olteniaShifts.map((s) => [s.id, getRichText(s.properties, "URL slug") || s.id.replace(/-/g, "")])
  );
  const shiftNameMap = new Map(olteniaShifts.map((s) => [s.id, getTitle(s.properties)]));

  const output = {
    slug: "oltenia-de-sub-munte",
    name: getTitle(oltenia.properties),
    country: getSelect(oltenia.properties, "Country"),
    location: getRichText(oltenia.properties, "Location"),
    intro: getRichText(oltenia.properties, "Bioregion Description"),
    notionUrl: oltenia.url,
    criticalShifts: olteniaShifts.map((s) => ({
      slug: getRichText(s.properties, "URL slug") || s.id.replace(/-/g, ""),
      name: getTitle(s.properties),
      shift: getRichText(s.properties, "Critical Shift"),
      leveragePoint: getRichText(s.properties, "Leverage Point"),
      systemicBarrier: getRichText(s.properties, "Systemic Barrier"),
    })),
    systemicInnovations: systemicInnovations.map((i) => {
      const tags = getRelationIds(i.properties, "Critical Shifts Tags")
        .map((id) => shiftSlugMap.get(id))
        .filter(Boolean);
      return {
        slug: getRichText(i.properties, "URL slug") || i.id.replace(/-/g, ""),
        name: getTitle(i.properties),
        tags,
        depth: i.properties["Case Study"]?.checkbox ? "story" : "core",
        notionUrl: i.properties.Website?.url || i.properties["Learn More"]?.url || null,
      };
    }),
  };

  console.log("\n--- Output JSON ---\n");
  console.log(JSON.stringify(output, null, 2));

  // Report which tags referenced shifts not in this bioregion
  const allShiftIds = new Set(olteniaShifts.map((s) => s.id));
  const unlinked = systemicInnovations.filter((i) =>
    getRelationIds(i.properties, "Critical Shifts Tags").some((id) => !allShiftIds.has(id))
  );
  if (unlinked.length) {
    console.log("\n⚠️ Innovations with critical shifts outside this bioregion:");
    for (const i of unlinked) {
      const tags = getRelationIds(i.properties, "Critical Shifts Tags")
        .map((id) => shiftNameMap.get(id) || id)
        .join(", ");
      console.log(`  - ${getTitle(i.properties)}: ${tags}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
