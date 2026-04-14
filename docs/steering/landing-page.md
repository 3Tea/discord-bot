# Landing Page

> Steering doc for AI assistants and contributors. Covers the static landing site — Astro 6, i18n, content collections, design system, and deployment.

## Overview

Static marketing site for the 3AT Discord bot. Built with Astro 6 (static output), TypeScript strict, LightningCSS. Two languages (English, Vietnamese). Zero client-side JS by default — only opt-in scripts for scroll reveal, counter animation, and mobile nav toggle. Generates ~90 static HTML pages. Hosted on GitHub Pages via `deploy-landing.yml`.

Source lives in `/landing/` at the repo root — fully independent from the bot codebase.

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Astro 6 (`^6.1.3`) | Static output, no SSR |
| CSS processing | LightningCSS (`^1.32.0`) | Configured via `vite.css.transformer` in `astro.config.mjs` |
| Type checking | `@astrojs/check` + TypeScript 5.9 | Strict mode |
| Fonts | Google Fonts (Outfit + Source Sans 3) | Loaded via `<link>` in `BaseLayout.astro` |
| Node.js | `>=22.12.0` | Set in `package.json` `engines` |

No CSS framework, no UI library, no runtime JS framework. Dependencies are intentionally minimal — only `astro` and `lightningcss` in production.

### Build Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build to `landing/dist/` |
| `npm run preview` | Preview built site locally |

## Routes & Pages

Astro i18n config: `defaultLocale: "en"`, `prefixDefaultLocale: false`. English pages have no URL prefix. Vietnamese pages live under `/vi/`.

### Static Pages

| Route (EN) | Route (VI) | Page file (EN) | Page file (VI) | Shared component |
|------------|------------|----------------|-----------------|------------------|
| `/` | `/vi` | `pages/index.astro` | `pages/vi/index.astro` | `components/pages/HomePage.astro` |
| `/commands` | `/vi/commands` | `pages/commands.astro` | `pages/vi/commands.astro` | `components/pages/CommandsPage.astro` |
| `/guide` | `/vi/guide` | `pages/guide.astro` | `pages/vi/guide.astro` | `components/pages/GuidePage.astro` |
| `/privacy` | `/vi/privacy` | `pages/privacy.astro` | `pages/vi/privacy.astro` | `components/pages/LegalPage.astro` |
| `/terms` | `/vi/terms` | `pages/terms.astro` | `pages/vi/terms.astro` | `components/pages/LegalPage.astro` |

Page files are thin wrappers (3-5 lines) that delegate to a shared component with `lang` prop. All logic lives in the shared component.

### Dynamic Pages

| Route pattern | Page file | Content collection | Pages generated |
|---------------|-----------|-------------------|-----------------|
| `/{lang}/commands/{slug}` | `pages/[lang]/commands/[...slug].astro` | `commands` | 38 EN + 38 VI = 76 |
| `/{lang}/guide/{slug}` | `pages/[lang]/guide/[...slug].astro` | `guides` | 14 EN + 14 VI = 28 |

Both use `getStaticPaths()` to enumerate all content entries. Each generates pages for both `en/` and `vi/` from the content collection.

### Total Pages

| Type | EN | VI | Total |
|------|----|----|-------|
| Static (home, commands index, guide index, privacy, terms) | 5 | 5 | 10 |
| Command detail | 38 | 38 | 76 |
| Guide detail | 14 | 14 | 28 |
| **Total** | **57** | **57** | **~114** |

## i18n System

Uses Astro built-in i18n with the "Recipe" pattern (not Astro's `@astrojs/i18n` integration). All translations are compile-time — no runtime i18n library.

### Configuration (`astro.config.mjs`)

```javascript
i18n: {
  defaultLocale: "en",
  locales: ["en", "vi"],
  routing: { prefixDefaultLocale: false },
}
```

### Translation Store (`src/i18n/ui.ts`)

Single file containing all UI strings for both languages as a `const` object. Structure:

```typescript
export const ui = {
  en: { "nav.features": "Features", "hero.subtitle": "...", ... },
  vi: { "nav.features": "Tinh nang", "hero.subtitle": "...", ... },
} as const;
```

Key namespaces: `meta.*`, `nav.*`, `hero.*`, `features.*`, `showcase.*`, `voice.*`, `stats.*`, `testimonials.*`, `faq.*`, `footer.*`, `commands.*`, `guide.*`, `legal.*`, `translation.*`.

### Utility Functions (`src/i18n/utils.ts`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getLangFromUrl` | `(url: URL) => Lang` | Extract `"en"` or `"vi"` from URL path |
| `useTranslations` | `(lang: Lang) => (key) => string` | Returns `t()` function; falls back to EN, then raw key |
| `useTranslatedPath` | `(lang: Lang) => (path) => string` | Returns `tp()` function; prepends `/vi` for Vietnamese, bare path for EN |

### Rules

1. **Never hardcode user-facing text** — use `t("key")` from `useTranslations`
2. **New keys must go in BOTH EN and VI** sections of `ui.ts`
3. **Every component must accept `lang?: Lang` prop** and pass it to children
4. **Internal links must use `tp()`** — never hardcode `/commands`, use `tp("/commands")`
5. **Dynamic keys** like `t(\`features.${key}.title\`)` are supported — `t()` accepts `string` union with fallback

### Component Pattern

Every component follows this boilerplate:

```astro
---
import { useTranslations, useTranslatedPath } from "../i18n/utils";
import type { Lang } from "../i18n/utils";

interface Props { lang?: Lang; }
const { lang = "en" } = Astro.props;
const t = useTranslations(lang);
const tp = useTranslatedPath(lang);
---
```

### Translation Notice

When a Vietnamese content page has no VI markdown (e.g., a command guide not yet translated), the detail page shows a yellow notice bar (`translation.notice` key) and falls back to EN content.

### Cross-Reference

The bot's i18n system (i18next, 15 languages, Redis-cached locale preferences) is documented in [i18n-system.md](i18n-system.md) if it exists, and in the main `CLAUDE.md`. The landing site's i18n is completely independent — compile-time only, 2 languages, no runtime library.

## Components

### Layout

| Component | Path | Purpose |
|-----------|------|---------|
| `BaseLayout.astro` | `layouts/` | Root `<html>` wrapper. Accepts `title`, `description`, `lang`, `hreflang[]`. Loads global CSS, animations CSS, Google Fonts, Navbar, Footer, BackToTop, scroll-animations script, counter script. Sets `<html lang>` and injects `<link rel="alternate" hreflang>` tags. |

### Page Components (`components/pages/`)

| Component | Used by | Sections / behavior |
|-----------|---------|---------------------|
| `HomePage.astro` | `index.astro`, `vi/index.astro` | Composes Hero, Features, CommandsShowcase, VoiceDemo, Stats, Testimonials, FAQ |
| `CommandsPage.astro` | `commands.astro`, `vi/commands.astro` | Sidebar (category filter + search) + 2-column command card grid. Client-side JS for filtering/search. |
| `GuidePage.astro` | `guide.astro`, `vi/guide.astro` | Guide index with 3-column card grid. Fetches from `guides` collection, sorts by `order`, falls back to EN if no VI guides. |
| `LegalPage.astro` | `privacy.astro`, `terms.astro`, `vi/privacy.astro`, `vi/terms.astro` | Renders markdown from `pages` collection via `getCollection("pages")` + `render()`. Uses `LegalArticle` component for prose styling. |

### Homepage Sections

| Component | Purpose |
|-----------|---------|
| `Hero.astro` | Full-width hero with title, subtitle, CTA buttons (Add to Server, View Commands), trust line |
| `Features.astro` | 6-card grid. Icons from `features.ts`, text from `t(\`features.${key}.title\`)` dynamic keys |
| `CommandsShowcase.astro` | Discord-style embed previews of real bot responses |
| `VoiceDemo.astro` | 4-step visual walkthrough of temporary voice channel flow |
| `Stats.astro` | Animated counters (servers, users, uptime, since). Uses `data-target` + `counter.ts` IntersectionObserver |
| `Testimonials.astro` | Community feedback cards |
| `FAQ.astro` | Accordion (`<details>`) with 7 Q&A items. Keys: `faq.{topic}.q` / `faq.{topic}.a` |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `Navbar.astro` | Fixed top nav (56px). Brand, 5 links (Features, Commands, Guide, FAQ, Support), LanguageSwitcher, "Add to Server" CTA. Mobile hamburger toggle at 768px. |
| `Footer.astro` | 3-column footer (Links, Resources, Legal) with copyright |
| `LanguageSwitcher.astro` | EN/VI toggle buttons. Links to equivalent page in other language |
| `BackToTop.astro` | Fixed bottom-right button. Shows on scroll via IntersectionObserver |
| `Breadcrumb.astro` | Breadcrumb trail for detail pages (accepts `items[]` with label + optional href) |
| `CommandCard.astro` | Card for commands grid. Shows name, description, category badge with color |
| `CommandsSidebar.astro` | Left sidebar on commands page. Category buttons + search input. Drives client-side filtering |
| `GuideCard.astro` | Card for guide index. Shows icon, title, description, colored border |
| `GuideToc.astro` | Table of contents for guide detail pages. Renders from `headings` array. Desktop sidebar at 1080px+, inline on mobile |
| `RelatedCommands.astro` | Grid of related command cards at bottom of command detail pages (same category) |
| `RelatedGuides.astro` | Grid of related guide cards at bottom of guide detail pages |
| `LegalArticle.astro` | Prose wrapper for legal pages with title and last-updated metadata |

## Content Collections

Defined in `src/content.config.ts` using Astro's `defineCollection` + `glob` loader + Zod schemas.

### `commands` Collection

**Path**: `src/content/commands/{lang}/{command-name}.md`

**Schema**:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `title` | `string` | Yes | `"Voice Channel Management"` |
| `command` | `string` | Yes | `"voice"` |
| `category` | `string` | Yes | `"voice"` |
| `description` | `string` | Yes | `"Create and manage temporary voice channels..."` |
| `permissions` | `string[]` | No | `["ManageChannels"]` |
| `cooldown` | `string` | No | `"5s-120s"` |

**Current count**: 31 commands per language (EN + VI = 62 files).

### `guides` Collection

**Path**: `src/content/guides/{lang}/{guide-name}.md`

**Schema**:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `title` | `string` | Yes | `"Economy System"` |
| `description` | `string` | Yes | `"Learn how to earn coins..."` |
| `icon` | `string` | Yes | `"💰"` |
| `order` | `number` | Yes | `1` |
| `relatedCommands` | `string[]` | No | `["balance", "pray", "curse"]` |

**Current count**: 9 guides per language (EN + VI = 18 files). Guides: economy, xp, voice, confessions, moderation, manga, utility, info, settings.

### `pages` Collection

**Path**: `src/content/pages/{lang}/{page-name}.md`

**Schema**:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `title` | `string` | Yes | `"Privacy Policy"` |
| `description` | `string` | No | `"Privacy Policy for 3AT..."` |
| `lastUpdated` | `string` | No | `"April 8, 2026"` |

**Current count**: 2 pages per language (privacy, terms) = 4 files.

## Data Files

Static TypeScript data used by components at build time.

### `src/data/commands.ts`

Exports `commands: Command[]` (31 entries) and `categoryMeta: Record<Category, { label, color, bg }>`.

**Categories** (9): `voice`, `xp`, `economy`, `moderation`, `manga`, `utility`, `info`, `settings`, `confession`.

Each command has: `name`, `description`, `category`, optional `subcommands[]`, optional `options[]`. Used by `CommandsPage` for the grid and sidebar filtering.

### `src/data/features.ts`

Exports `featureIcons` (6 emojis) and `featureKeys` (6 strings: voice, xp, economy, manga, i18n, utility). Feature text comes from `ui.ts` via dynamic keys `features.${key}.title` and `features.${key}.desc`.

### `src/data/guides.ts`

Exports `guideMeta: Record<string, GuideMeta>` with slug, label, color, and background for each guide category (9 entries). Used by `GuidePage` and `GuideCard` for colored badges.

## Design System

### CSS Variables (`src/styles/global.css`)

#### Colors (Discord palette)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#313338` | Body background |
| `--bg-secondary` | `#2B2D31` | Card backgrounds, sidebars |
| `--bg-tertiary` | `#1E1F22` | Navbar backdrop, code blocks |
| `--bg-card` | `#313338` | Card surface |
| `--border` | `#3F4147` | Borders, dividers |
| `--accent` | `#5865F2` | Discord blurple — CTAs, links, focus rings |
| `--accent-hover` | `#4752C4` | Hover state for accent |
| `--accent-soft` | `rgba(88,101,242,0.12)` | Subtle accent backgrounds |
| `--text-primary` | `#F2F3F5` | Headings, strong text |
| `--text-secondary` | `#B5BAC1` | Body text |
| `--text-muted` | `#80848E` | Meta text, labels |
| `--success` | `#3BA55C` | Success states |
| `--danger` | `#ED4245` | Error states, NSFW |
| `--warning` | `#FAA61A` | Warnings, notices |
| `--btn-secondary` | `#4E5058` | Secondary button fill |

#### Typography

| Variable | Value |
|----------|-------|
| `--font-display` | `"Outfit", system-ui, sans-serif` |
| `--font-body` | `"Source Sans 3", system-ui, sans-serif` |

Headings (`h1`, `h2`, `h3`, `.section-title`) use `--font-display`. Body text uses `--font-body`. Base font size: `15px`, line-height: `1.6`.

#### Spacing & Layout

| Variable | Value |
|----------|-------|
| `--section-padding` | `80px 0` (48px on mobile) |
| `--container-width` | `1100px` |
| `--container-padding` | `0 24px` |
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |

#### Shadows

| Variable | Value |
|----------|-------|
| `--shadow-card` | `0 4px 14px rgba(0,0,0,0.22)` |
| `--shadow-card-hover` | `0 10px 28px rgba(0,0,0,0.32)` |
| `--shadow-nav` | `0 1px 0 rgba(0,0,0,0.2)` |

### Responsive Breakpoints

| Breakpoint | Usage |
|------------|-------|
| `560px` | Guide grid collapses to 1 column |
| `768px` | Navbar goes mobile, commands grid to 1 column, section padding reduces |
| `900px` | Guide grid to 2 columns |
| `1080px` | Guide ToC sidebar appears (desktop) |

### Animations (`src/styles/animations.css`)

| Animation | Trigger | Behavior |
|-----------|---------|----------|
| `.reveal` / `.visible` | IntersectionObserver (`scroll-animations.ts`, threshold 0.1) | Fade in + slide up (20px). One-shot — unobserved after reveal |
| `.reveal-stagger` | Parent container | Children use `--i` CSS variable for staggered 100ms delays |
| `.stat-value` | IntersectionObserver (`counter.ts`, threshold 0.5) | Animated count-up from 0 to `data-target`. Ease-out cubic, 1500ms duration |
| `glow-pulse` | Keyframe on hero glow | Opacity oscillation |
| `bounce` | Scroll indicator | Vertical bounce loop |
| FAQ accordion | `<details>` native | `max-height` transition on open/close |

All animations respect `prefers-reduced-motion: reduce` — reduced to `none` or instant.

### Styling Rules

- **Scoped styles only** — use `<style>` blocks in `.astro` components
- **Never edit `global.css` for component-specific styles** — component styles stay in component files
- **Use CSS variables** — never hardcode colors, fonts, or spacing
- **No CSS frameworks** — pure CSS with variables

## Client-Side Scripts

| Script | Path | Purpose |
|--------|------|---------|
| `scroll-animations.ts` | `src/scripts/` | IntersectionObserver for `.reveal` elements. Adds `.visible` class once, unobserves. |
| `counter.ts` | `src/scripts/` | IntersectionObserver for `.stat-value` elements. Animates number from 0 to `data-target` with cubic easing. |
| Navbar toggle | Inline in `Navbar.astro` | Toggles `.open` class on mobile menu, updates `aria-expanded`. |
| Commands filter | Inline in `CommandsPage.astro` | Category sidebar filter + search input. Debounced (200ms) filtering of command cards by category and name/description text match. |

All scripts are vanilla TypeScript. No framework, no bundled JS library.

## Deployment

### GitHub Actions (`deploy-landing.yml`)

**Trigger**: Push to `main` or `develop` with changes in `landing/**`, or manual `workflow_dispatch`.

**Jobs**:

1. **build**: Checkout, setup Node 22, `npm ci`, `npm run build`, upload `landing/dist/` as Pages artifact.
2. **deploy**: Deploy to GitHub Pages environment.

**Permissions**: `contents: read`, `pages: write`, `id-token: write`.

**Concurrency**: `group: "pages"`, `cancel-in-progress: false` — queues deploys rather than canceling.

### Domain

The site deploys to GitHub Pages. The custom domain (if configured) is set in the GitHub Pages settings, not in the workflow. The `astro.config.mjs` has no `site` or `base` configured — assumes root deployment.

### Build Output

Static HTML to `landing/dist/`. Assets folder: `_assets` (configured via `build.assets` in `astro.config.mjs`).

## Adding New Pages

### New Translatable Page

1. Create shared component: `src/components/pages/XPage.astro` (receives `lang` prop)
2. Create EN wrapper: `src/pages/x.astro` — imports and renders `<XPage lang="en" />`
3. Create VI wrapper: `src/pages/vi/x.astro` — imports and renders `<XPage lang="vi" />`
4. Add translation keys to both EN and VI sections of `src/i18n/ui.ts`
5. Add `hreflang` links in the shared component for SEO
6. Add nav/footer links if needed (using `tp()`)

### New Command Guide

1. Create `src/content/commands/en/{command}.md` with frontmatter (`title`, `command`, `category`, `description`, optional `permissions`, `cooldown`)
2. Create `src/content/commands/vi/{command}.md` with same structure, translated content
3. Add the command to `src/data/commands.ts` if not already present
4. No page file needed — `[lang]/commands/[...slug].astro` handles it via `getStaticPaths()`

### New User Guide

1. Create `src/content/guides/en/{guide}.md` with frontmatter (`title`, `description`, `icon`, `order`, optional `relatedCommands`)
2. Create `src/content/guides/vi/{guide}.md` with same structure, translated
3. Add metadata to `src/data/guides.ts` `guideMeta` record (slug, label, color, bg)
4. No page file needed — `[lang]/guide/[...slug].astro` handles it via `getStaticPaths()`

## Do NOT

- Add npm dependencies without discussion — site is intentionally minimal (Astro + LightningCSS only)
- Hardcode text in components — use `t()` always
- Add translation keys to only one language — always both EN and VI
- Create page files with logic — pages are thin wrappers delegating to `components/pages/`
- Edit `global.css` for component-specific styles — use scoped `<style>`
- Use `require()` or CommonJS — the project is ESM (`"type": "module"`)
