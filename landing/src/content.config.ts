import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const commands = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/commands" }),
  schema: z.object({
    title: z.string(),
    command: z.string(),
    category: z.string(),
    description: z.string(),
    permissions: z.array(z.string()).optional(),
    cooldown: z.string().optional(),
  }),
});

export const collections = { commands };
