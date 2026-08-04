import { defineCollection } from "astro:content";
import { notionBioregionLoader } from "./lib/notion-loader";

export const collections = {
  bioregions: defineCollection({
    loader: notionBioregionLoader(),
  }),
};
