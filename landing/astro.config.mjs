import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  build: {
    assets: "_assets",
  },
  vite: {
    css: {
      transformer: "lightningcss",
    },
  },
});
