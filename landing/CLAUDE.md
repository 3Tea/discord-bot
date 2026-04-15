# CLAUDE.md — 3AT Landing Site

## Overview

Static landing site for the 3AT Discord bot. Built with Astro 6, TypeScript strict, LightningCSS. Generates ~115 static pages.

## Quick Reference

```bash
cd landing
npm run dev        # Dev server with hot reload
npm run build      # Static build to dist/
npm run preview    # Preview built site
```

## Architecture

```
landing/src/
  i18n/
    ui.ts               # All UI translations (EN + VI), as const
    utils.ts            # getLangFromUrl, useTranslations, useTranslatedPath
  layouts/
    BaseLayout.astro    # Root layout — accepts lang prop, sets <html lang>
  components/
    pages/              # Shared page components (receive lang, contain all logic)
      HomePage.astro
      CommandsPage.astro
      GuidePage.astro
      LegalPage.astro
    Navbar.astro        # Global nav with LanguageSwitcher
    Footer.astro
    Hero.astro          # Homepage sections — all accept lang prop
    Features.astro
    FAQ.astro
    ...
  pages/
    index.astro         # EN thin wrapper → <HomePage lang="en" />
    commands.astro      # EN thin wrapper → <CommandsPage lang="en" />
    guide.astro         # EN thin wrapper → <GuidePage lang="en" />
    privacy.astro       # EN only — renders from content collection
    terms.astro         # EN only — renders from content collection
    vi/                 # Vietnamese thin wrappers
      index.astro       # → <HomePage lang="vi" />
      commands.astro    # → <CommandsPage lang="vi" />
      guide.astro       # → <GuidePage lang="vi" />
    [lang]/             # Dynamic routes for content detail pages
      commands/[...slug].astro
      guide/[...slug].astro
  content/
    commands/{lang}/    # 40 command guides per language
    guides/{lang}/      # 17 user guides per language
    pages/{lang}/       # Legal pages (EN + VI)
  data/
    commands.ts         # Command metadata (names, categories, colors)
    features.ts         # Feature icons + keys (text in ui.ts)
    guides.ts           # Guide metadata (slugs, colors)
  styles/
    global.css          # Design tokens, CSS variables
    animations.css      # Animation utilities
```

## i18n — MUST Follow

This site uses Astro built-in i18n with the Recipe pattern. EN is default (no URL prefix), VI gets `/vi/` prefix.

### Rules

1. **Never hardcode user-facing text** — always use `t("key")` from `useTranslations`
2. **New translation keys must go in BOTH EN and VI** sections of `src/i18n/ui.ts`
3. **Every component must accept `lang?: Lang` prop** and pass it to child components
4. **Internal links must use `useTranslatedPath()`** — never hardcode `/commands`, use `tp("/commands")`
5. **Dynamic keys** (e.g., `t(\`features.${key}.title\`)`) are supported — `t()` accepts `string` with fallback

### Component Pattern

```astro
---
import { useTranslations, useTranslatedPath } from "../i18n/utils";
import type { Lang } from "../i18n/utils";

interface Props { lang?: Lang; }
const { lang = "en" } = Astro.props;
const t = useTranslations(lang);
const tp = useTranslatedPath(lang);  // only if component has internal links
---
```

### Adding a New Translation Key

1. Add to `en` section in `src/i18n/ui.ts`
2. Add to `vi` section in `src/i18n/ui.ts`
3. Use `t("your.new.key")` in component

### Locale Resolution

- Root pages (`/`, `/commands`, `/guide`) → EN
- `/vi/` pages → VI
- `[lang]/commands/[slug]` and `[lang]/guide/[slug]` → from URL param

## Adding New Pages

### New Translatable Page

1. Create shared component: `src/components/pages/XPage.astro` (receives `lang` prop, contains all logic)
2. Create EN wrapper: `src/pages/x.astro` → `<XPage lang="en" />`
3. Create VI wrapper: `src/pages/vi/x.astro` → `<XPage lang="vi" />`
4. Add translation keys to `src/i18n/ui.ts` (both EN and VI)
5. Add hreflang in the shared component for SEO
6. Add nav/footer links if needed (using `tp()`)

### New Content Collection Page (EN only)

1. Create Markdown: `src/content/pages/en/x.md` with frontmatter `{ title, description, lastUpdated }`
2. Create page: `src/pages/x.astro` using `getCollection("pages")` + `render()`

## Adding New Content

### New Command Guide

Create `src/content/commands/{lang}/{command-name}.md`:

```markdown
---
title: "Command Name"
command: "command-name"
category: "voice"
description: "What the command does"
permissions: ["ManageChannels"]
cooldown: "5s"
---

Content here...
```

Must create for both `en/` and `vi/` directories.

### New User Guide

Create `src/content/guides/{lang}/{guide-name}.md`:

```markdown
---
title: "Guide Title"
description: "Guide description"
icon: "emoji"
order: 6
relatedCommands: ["cmd1", "cmd2"]
---

Content here...
```

## Styling Conventions

- **Scoped styles only** — use `<style>` in components, not global CSS
- **CSS variables** from `global.css` — `var(--accent)`, `var(--bg-primary)`, `var(--text-secondary)`, etc.
- **No CSS frameworks** — pure CSS with CSS variables
- **Responsive**: mobile-first, breakpoints at 560px, 768px, 900px, 1080px
- **Animations**: use `.reveal` class + IntersectionObserver pattern from `scroll-animations.ts`

## Do NOT

- Hardcode text in components — use `t()` always
- Add translation keys to only one language — always both EN and VI
- Use `import type { Lang }` without also importing utility functions
- Create page files with logic — pages should be thin wrappers delegating to `components/pages/`
- Edit `global.css` for component-specific styles — use scoped `<style>`
- Add npm dependencies without discussing first — site is intentionally minimal (Astro + LightningCSS only)
