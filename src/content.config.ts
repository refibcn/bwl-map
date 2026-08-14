import { defineCollection } from "astro:content";
import { notionBioregionLoader } from "./lib/notion-loader";
import { notionShiftLoader } from "./lib/shift-loader";

export const collections = {
  bioregions: defineCollection({
    loader: notionBioregionLoader(),
  }),
  shifts: defineCollection({
    loader: notionShiftLoader(),
  }),
};
