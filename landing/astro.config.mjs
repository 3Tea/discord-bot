import { defineConfig } from "astro/config";

export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "vi"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
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
