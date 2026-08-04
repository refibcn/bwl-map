import { config } from "dotenv";

config({ path: ".env" });

const token = process.env.NOTION_TOKEN;

const dataSources = [
  { id: "09bb5c91-1953-83f5-9764-8752cc035242", name: "Bioregions" },
  { id: "10fb5c91-1953-8220-b0eb-07e2687cca77", name: "Systemic Innovations" },
  { id: "35db5c91-1953-80ab-aae6-000b64ea6545", name: "Critical Shifts" },
];

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

for (const ds of dataSources) {
  try {
    console.log("\n=================================================");
    console.log("Data source:", ds.name, ds.id);

    // Try to retrieve schema
    const schema = await notionFetch(`/data_sources/${ds.id}`);
    console.log("Schema keys:", Object.keys(schema));
    if (schema.properties) {
      console.log("Properties:");
      for (const [name, prop] of Object.entries(schema.properties)) {
        let detail = prop.type;
        if (prop.type === "relation") {
          detail = `relation -> ${prop.relation?.data_source_id || prop.relation?.database_id || "?"}`;
        } else if (prop.type === "rollup") {
          detail = `rollup of ${prop.rollup?.relation_property_name || "?"} (${prop.rollup?.function || "?"})`;
        } else if (prop.type === "select" || prop.type === "multi_select") {
          const options = prop[prop.type]?.options?.map((o) => o.name).join(", ");
          detail = `${prop.type} [${options}]`;
        } else if (prop.type === "title") {
          detail = "title";
        } else if (prop.type === "rich_text") {
          detail = "rich_text";
        } else if (prop.type === "url") {
          detail = "url";
        }
        console.log(`  - ${name}: ${detail}`);
      }
    }

    // Query all rows for critical shifts
    const rows = await notionFetch(`/data_sources/${ds.id}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100 }),
    });
    console.log("Rows:", rows.results?.length || 0);
    if (rows.results?.[0]) {
      const page = rows.results[0];
      console.log("Page title:", page.properties?.Name?.title?.map((t) => t.plain_text).join("") || "(empty)");
      console.log("Page property keys:", Object.keys(page.properties));
      if (ds.name === "Critical Shifts") {
        for (const row of rows.results.slice(0, 10)) {
          const title = row.properties?.Name?.title?.map((t) => t.plain_text).join("") || "(empty)";
          const shiftText = row.properties?.["Critical Shift"]?.rich_text?.map((t) => t.plain_text).join("") || "";
          console.log(`  - ${title}: ${shiftText.slice(0, 80)}...`);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
