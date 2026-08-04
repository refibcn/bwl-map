import { config } from "dotenv";
import { Client } from "@notionhq/client";

config({ path: ".env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const dbIds = [
  "811b5c91195382ae9cdc816d9057ed70",
  "02ab5c9119538363ae53810c5672dd4a",
  "35db5c911953802382e4d5167b1366ea",
];

for (const id of dbIds) {
  try {
    const db = await notion.databases.retrieve({ database_id: id });
    console.log("\n=================================================");
    console.log("DB ID:", id);
    console.log("Title:", db.title?.map((t) => t.plain_text).join("") || "(untitled)");
    console.log("Raw keys:", Object.keys(db));
    console.log("Properties type:", typeof db.properties, db.properties ? Object.keys(db.properties).length : "null/undefined");
    console.log("Data sources:", JSON.stringify(db.data_sources, null, 2));
    if (!db.properties) {
      console.log("  (no properties)");
      continue;
    }
    for (const [name, prop] of Object.entries(db.properties)) {
      let detail = prop.type;
      if (prop.type === "relation") {
        detail = `relation -> ${prop.relation.database_id}`;
      } else if (prop.type === "rollup") {
        detail = `rollup of ${prop.rollup.relation_property_name} (${prop.rollup.function})`;
      } else if (prop.type === "select" || prop.type === "multi_select") {
        const options = prop[prop.type].options.map((o) => o.name).join(", ");
        detail = `${prop.type} [${options}]`;
      } else if (prop.type === "formula") {
        detail = `formula: ${prop.formula.expression}`;
      }
      console.log(`  - ${name}: ${detail}`);
    }
  } catch (err) {
    console.error(`\nError fetching ${id}:`, err.message);
  }
}
