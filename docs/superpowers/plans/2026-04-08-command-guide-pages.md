# Command Guide Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-command detail/guide pages with i18n (EN + VI) to the landing site, powered by Astro Content Collections.

**Architecture:** Astro Content Collections with `glob` loader reads Markdown files from `src/content/commands/{lang}/{slug}.md`. A dynamic route `src/pages/[lang]/commands/[...slug].astro` generates static pages. The existing `/commands` listing page is updated so each card links to its guide page.

**Tech Stack:** Astro 6, Markdown, CSS custom properties (existing design system), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-08-command-guide-pages-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `landing/src/content.config.ts` | Content Collections schema definition |
| `landing/src/content/commands/en/*.md` (25 files) | English guide content |
| `landing/src/content/commands/vi/*.md` (25 files) | Vietnamese guide content |
| `landing/src/pages/[lang]/commands/[...slug].astro` | Dynamic route — renders guide pages |
| `landing/src/components/LanguageSwitcher.astro` | EN ↔ VI toggle buttons |
| `landing/src/components/Breadcrumb.astro` | Breadcrumb navigation |
| `landing/src/components/RelatedCommands.astro` | Related commands cards at bottom |

### Modified Files

| File | Change |
|------|--------|
| `landing/src/data/commands.ts` | Add `confession` command + export `slug` helper |
| `landing/src/components/CommandCard.astro` | Wrap in `<a>` link, add "Guide →" button |
| `landing/src/pages/commands.astro` | Update card wrapper to use `<a>` links |
| `landing/src/styles/global.css` | Add guide prose styles, callout boxes, breadcrumb, language switcher |
| `landing/src/layouts/BaseLayout.astro` | Add optional `hreflang` props for SEO |

---

### Task 1: Content Collections Configuration

**Files:**
- Create: `landing/src/content.config.ts`

- [ ] **Step 1: Create content config with schema**

Create `landing/src/content.config.ts`:

```typescript
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
```

- [ ] **Step 2: Create content directory structure**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
mkdir -p src/content/commands/en
mkdir -p src/content/commands/vi
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro check
```

Expected: No errors related to content config.

- [ ] **Step 4: Commit**

```bash
git add landing/src/content.config.ts
git commit -m "feat(landing): add content collections config for command guides"
```

---

### Task 2: Add Guide Prose Styles

**Files:**
- Modify: `landing/src/styles/global.css`

- [ ] **Step 1: Add guide prose, breadcrumb, language switcher, and callout styles to global.css**

Append after the `.legal-note` block (after line 230) in `landing/src/styles/global.css`:

```css
/* Guide pages — command documentation */
.guide-page {
  max-width: 820px;
  padding-top: 32px;
  padding-bottom: 64px;
}

.guide-header {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.guide-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.guide-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.guide-title {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: clamp(1.5rem, 4vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.guide-category-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.guide-description {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.5;
}

.guide-meta {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.guide-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.guide-meta-icon {
  font-size: 14px;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  flex-wrap: wrap;
}

.breadcrumb a {
  color: var(--text-muted);
  transition: color 0.2s;
}

.breadcrumb a:hover {
  color: var(--accent);
}

.breadcrumb-sep {
  color: var(--text-muted);
  user-select: none;
}

.breadcrumb-current {
  color: var(--text-secondary);
}

/* Language Switcher */
.lang-switcher {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.lang-btn {
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  padding: 5px 14px;
  border: 1px solid var(--border);
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.lang-btn:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.lang-btn:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  border-left: none;
}

.lang-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}

.lang-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.lang-btn.active:hover {
  background: var(--accent-hover);
}

/* Guide prose — rendered markdown */
.guide-prose {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.65;
}

.guide-prose h2 {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 36px;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.guide-prose h3 {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 8px;
}

.guide-prose p {
  margin-bottom: 12px;
}

.guide-prose ul,
.guide-prose ol {
  margin: 0 0 12px 1.25em;
  padding: 0;
}

.guide-prose li {
  margin-bottom: 6px;
}

.guide-prose a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.guide-prose a:hover {
  color: var(--accent-hover);
}

.guide-prose strong {
  color: var(--text-primary);
  font-weight: 600;
}

.guide-prose code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--text-primary);
}

.guide-prose pre {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.guide-prose pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.6;
}

.guide-prose table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 13px;
}

.guide-prose th {
  text-align: left;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
  border: 1px solid var(--border);
}

.guide-prose td {
  padding: 8px 12px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.guide-prose tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

/* Callout boxes — blockquotes with bold prefix */
.guide-prose blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  font-size: 14px;
}

.guide-prose blockquote p {
  margin-bottom: 0;
}

/* Back link */
.guide-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
  margin-top: 32px;
  margin-bottom: 24px;
  transition: color 0.2s;
}

.guide-back-link:hover {
  color: var(--accent-hover);
}

/* Related commands */
.related-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.related-title {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.related-card {
  display: block;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  transition: border-color 0.2s, transform 0.2s;
}

.related-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.related-card-name {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.related-card-desc {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Translation notice */
.translation-notice {
  padding: 10px 14px;
  background: rgba(250, 166, 26, 0.1);
  border: 1px solid rgba(250, 166, 26, 0.25);
  border-radius: var(--radius-md);
  color: var(--warning);
  font-size: 13px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .guide-header-top {
    flex-direction: column;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro check
```

- [ ] **Step 3: Commit**

```bash
git add landing/src/styles/global.css
git commit -m "feat(landing): add guide page styles for command documentation"
```

---

### Task 3: Add Confession Command + Slug Export to Commands Data

**Files:**
- Modify: `landing/src/data/commands.ts`

- [ ] **Step 1: Add confession command and slug helper**

In `landing/src/data/commands.ts`, add the `confession` category to `Category` type:

Add after `"settings"` in the Category type (line 9, before the semicolon):
```typescript
  | "confession";
```

Add confession entry to `categoryMeta` (after the settings entry, before the closing `};`):
```typescript
  confession: { label: "Confession", color: "#9B59B6", bg: "rgba(155,89,182,0.15)" },
```

Add confession command to the `commands` array (after the settings command, before the closing `];`):
```typescript
  // Confession
  {
    name: "confession",
    description:
      "Anonymous confession system — setup confession channel (admin), submit confessions with optional image",
    category: "confession",
    subcommands: ["setup", "submit"],
  },
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro check
```

- [ ] **Step 3: Commit**

```bash
git add landing/src/data/commands.ts
git commit -m "feat(landing): add confession command to commands data"
```

---

### Task 4: Breadcrumb Component

**Files:**
- Create: `landing/src/components/Breadcrumb.astro`

- [ ] **Step 1: Create Breadcrumb component**

Create `landing/src/components/Breadcrumb.astro`:

```astro
---
interface Props {
  items: Array<{ label: string; href?: string }>;
}

const { items } = Astro.props;
---

<nav class="breadcrumb" aria-label="Breadcrumb">
  {items.map((item, i) => (
    <>
      {i > 0 && <span class="breadcrumb-sep">/</span>}
      {item.href ? (
        <a href={item.href}>{item.label}</a>
      ) : (
        <span class="breadcrumb-current">{item.label}</span>
      )}
    </>
  ))}
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/Breadcrumb.astro
git commit -m "feat(landing): add Breadcrumb component for guide pages"
```

---

### Task 5: Language Switcher Component

**Files:**
- Create: `landing/src/components/LanguageSwitcher.astro`

- [ ] **Step 1: Create LanguageSwitcher component**

Create `landing/src/components/LanguageSwitcher.astro`:

```astro
---
interface Props {
  currentLang: string;
  slug: string;
}

const { currentLang, slug } = Astro.props;

const languages = [
  { code: "en", label: "EN" },
  { code: "vi", label: "VI" },
];
---

<div class="lang-switcher">
  {languages.map((lang) => (
    <a
      href={`/${lang.code}/commands/${slug}`}
      class:list={["lang-btn", { active: currentLang === lang.code }]}
      aria-label={`Switch to ${lang.label}`}
    >
      {lang.label}
    </a>
  ))}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/LanguageSwitcher.astro
git commit -m "feat(landing): add LanguageSwitcher component for guide pages"
```

---

### Task 6: Related Commands Component

**Files:**
- Create: `landing/src/components/RelatedCommands.astro`

- [ ] **Step 1: Create RelatedCommands component**

Create `landing/src/components/RelatedCommands.astro`:

```astro
---
import { commands, categoryMeta } from "../data/commands";
import type { Category } from "../data/commands";

interface Props {
  currentCommand: string;
  category: string;
  lang: string;
}

const { currentCommand, category, lang } = Astro.props;

const related = commands
  .filter((cmd) => cmd.category === category && cmd.name !== currentCommand)
  .slice(0, 3);
---

{related.length > 0 && (
  <div class="related-section">
    <h2 class="related-title">Related Commands</h2>
    <div class="related-grid">
      {related.map((cmd) => {
        const meta = categoryMeta[cmd.category as Category];
        return (
          <a href={`/${lang}/commands/${cmd.name}`} class="related-card">
            <div class="related-card-name">
              <span style={`color: ${meta.color}`}>/</span> {cmd.name}
            </div>
            <p class="related-card-desc">{cmd.description}</p>
          </a>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/RelatedCommands.astro
git commit -m "feat(landing): add RelatedCommands component for guide pages"
```

---

### Task 7: Update BaseLayout for SEO Hreflang

**Files:**
- Modify: `landing/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add hreflang props to BaseLayout**

In `landing/src/layouts/BaseLayout.astro`, update the Props interface and head section.

Replace the interface and destructuring (lines 8-16):

```astro
interface Props {
  title: string;
  description?: string;
  hreflang?: Array<{ lang: string; href: string }>;
}

const {
  title,
  description = "Discord bot for voice channel management, manga reading, translation, and more.",
  hreflang,
} = Astro.props;
```

Add hreflang links inside `<head>`, after the `<title>` tag (after line 31):

```astro
    {hreflang?.map((alt) => (
      <link rel="alternate" hreflang={alt.lang} href={alt.href} />
    ))}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro check
```

- [ ] **Step 3: Commit**

```bash
git add landing/src/layouts/BaseLayout.astro
git commit -m "feat(landing): add hreflang support to BaseLayout for SEO"
```

---

### Task 8: Dynamic Route — Command Guide Page

**Files:**
- Create: `landing/src/pages/[lang]/commands/[...slug].astro`

- [ ] **Step 1: Create the dynamic route page**

Create `landing/src/pages/[lang]/commands/[...slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import BaseLayout from "../../../layouts/BaseLayout.astro";
import Breadcrumb from "../../../components/Breadcrumb.astro";
import LanguageSwitcher from "../../../components/LanguageSwitcher.astro";
import RelatedCommands from "../../../components/RelatedCommands.astro";
import { categoryMeta } from "../../../data/commands";
import type { Category } from "../../../data/commands";

export async function getStaticPaths() {
  const pages = await getCollection("commands");

  return pages.map((page) => {
    const [lang, ...slugParts] = page.id.split("/");
    const slug = slugParts.join("/");
    return {
      params: { lang, slug },
      props: { page },
    };
  });
}

const { lang, slug } = Astro.params;
const { page } = Astro.props;
const { Content } = await render(page);

const meta = categoryMeta[page.data.category as Category];
const pageTitle = `${page.data.title} Guide — 3AT Bot`;
const altLang = lang === "en" ? "vi" : "en";
const hreflang = [
  { lang: "en", href: `/en/commands/${slug}` },
  { lang: "vi", href: `/vi/commands/${slug}` },
];

const breadcrumbItems = [
  { label: "Commands", href: "/commands" },
  { label: meta?.label ?? page.data.category, href: `/commands` },
  { label: `/${page.data.command}` },
];

// Check if the alternate language version exists
const allPages = await getCollection("commands");
const altExists = allPages.some((p) => p.id === `${altLang}/${slug}`);
const showTranslationNotice = lang === "vi" && !altExists;
---

<BaseLayout title={pageTitle} description={page.data.description} hreflang={hreflang}>
  <div class="container guide-page">
    <Breadcrumb items={breadcrumbItems} />

    <div class="guide-header">
      <div class="guide-header-top">
        <div class="guide-title-group">
          <h1 class="guide-title">{page.data.title}</h1>
          {meta && (
            <span
              class="guide-category-badge"
              style={`color: ${meta.color}; background: ${meta.bg};`}
            >
              {meta.label}
            </span>
          )}
        </div>
        <LanguageSwitcher currentLang={lang!} slug={slug!} />
      </div>
      <p class="guide-description">{page.data.description}</p>
      {(page.data.permissions?.length || page.data.cooldown) && (
        <div class="guide-meta">
          {page.data.permissions && page.data.permissions.length > 0 && (
            <span class="guide-meta-item">
              <span class="guide-meta-icon">🔒</span>
              {page.data.permissions.join(", ")}
            </span>
          )}
          {page.data.cooldown && (
            <span class="guide-meta-item">
              <span class="guide-meta-icon">⏱</span>
              {page.data.cooldown}
            </span>
          )}
        </div>
      )}
    </div>

    {showTranslationNotice && (
      <div class="translation-notice">
        Bản dịch đang được cập nhật. Nội dung hiện tại hiển thị bằng tiếng Anh.
      </div>
    )}

    <div class="guide-prose">
      <Content />
    </div>

    <a href="/commands" class="guide-back-link">← Back to Commands</a>

    <RelatedCommands
      currentCommand={page.data.command}
      category={page.data.category}
      lang={lang!}
    />
  </div>
</BaseLayout>
```

- [ ] **Step 2: Create a test content file to verify routing**

Create `landing/src/content/commands/en/ping.md`:

```markdown
---
title: Ping
command: ping
category: utility
description: Check if the bot is online and measure response latency.
---

## Usage

```
/ping
```

Simply run the command — no options needed. The bot replies with **Pong!** and shows the current WebSocket latency in milliseconds.
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro build
```

Expected: Build succeeds and generates `/en/commands/ping/index.html`.

- [ ] **Step 4: Commit**

```bash
git add landing/src/pages/\[lang\]/commands/\[...slug\].astro landing/src/content/commands/en/ping.md
git commit -m "feat(landing): add dynamic route for command guide pages"
```

---

### Task 9: Update CommandCard to be Clickable

**Files:**
- Modify: `landing/src/components/CommandCard.astro`
- Modify: `landing/src/pages/commands.astro`

- [ ] **Step 1: Update CommandCard to accept an href and render as link**

Replace the entire content of `landing/src/components/CommandCard.astro`:

```astro
---
import type { Command } from "../data/commands";
import { categoryMeta } from "../data/commands";

interface Props {
  command: Command;
  href?: string;
}

const { command, href } = Astro.props;
const meta = categoryMeta[command.category];
const items = command.subcommands || command.options || [];
const maxShow = 4;
const overflow = items.length - maxShow;
---

<a class="command-card-link" href={href || `/en/commands/${command.name}`}>
  <div class="command-card" style={`--cat-color: ${meta.color}`}>
    <div class="command-header">
      <span class="slash-badge">/</span>
      <span class="command-name">{command.name}</span>
      <span
        class="category-tag"
        style={`color: ${meta.color}; background: ${meta.bg};`}
      >
        {meta.label}
      </span>
    </div>
    <p class="command-desc">{command.description}</p>
    {items.length > 0 && (
      <div class="command-pills">
        {items.slice(0, maxShow).map((item) => (
          <span class="pill">{item}</span>
        ))}
        {overflow > 0 && <span class="pill pill-more">+{overflow} more</span>}
      </div>
    )}
    <span class="guide-link-text">Guide →</span>
  </div>
</a>

<style>
  .command-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .command-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-left: 3px solid var(--cat-color, var(--border));
    border-radius: var(--radius-md);
    padding: 16px;
    box-shadow: var(--shadow-card);
    transition:
      border-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    cursor: pointer;
    position: relative;
  }

  .command-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
    border-color: var(--accent);
    border-left-color: var(--cat-color, var(--accent));
  }

  .command-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .slash-badge {
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .command-name {
    font-family: var(--font-display);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .category-tag {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
  }

  .command-desc {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  .command-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .pill {
    color: var(--text-muted);
    font-size: 11px;
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .pill-more {
    color: var(--text-secondary);
  }

  .guide-link-text {
    color: var(--accent);
    font-size: 12px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
    position: absolute;
    bottom: 12px;
    right: 16px;
  }

  .command-card:hover .guide-link-text {
    opacity: 1;
  }
</style>
```

- [ ] **Step 2: Update commands.astro to pass href**

In `landing/src/pages/commands.astro`, replace the card wrapper in the grid (lines 21-24):

```astro
        {commands.map((cmd) => (
          <div data-category={cmd.category} data-name={cmd.name} data-desc={cmd.description}>
            <CommandCard command={cmd} href={`/en/commands/${cmd.name}`} />
          </div>
        ))}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro build
```

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/CommandCard.astro landing/src/pages/commands.astro
git commit -m "feat(landing): make command cards clickable with guide links"
```

---

### Task 10: Write English Content — Simple Commands (7 files)

**Files:**
- Create: `landing/src/content/commands/en/ping.md` (already created in Task 8)
- Create: `landing/src/content/commands/en/help.md`
- Create: `landing/src/content/commands/en/info.md`
- Create: `landing/src/content/commands/en/avatar.md`
- Create: `landing/src/content/commands/en/trans.md`
- Create: `landing/src/content/commands/en/weather.md`
- Create: `landing/src/content/commands/en/balance.md`

- [ ] **Step 1: Create en/help.md**

```markdown
---
title: Help
command: help
category: info
description: View a categorized list of all available bot commands.
---

## Usage

```
/help
```

No options needed. The bot replies with an embed showing all commands grouped by category, along with quick-link buttons to the bot's homepage and support page.
```

- [ ] **Step 2: Create en/info.md**

```markdown
---
title: Bot Info
command: info
category: info
description: View bot metadata including version, uptime, server count, and tech stack.
---

## Usage

```
/info bot
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `bot` | Show bot information |

Displays an embed with the bot's current version, uptime, number of servers, Node.js version, and library versions. Includes buttons linking to the homepage and bug reports.
```

- [ ] **Step 3: Create en/avatar.md**

```markdown
---
title: Avatar
command: avatar
category: info
description: Get the avatar URL of any user, or your own avatar.
---

## Usage

```
/avatar
/avatar target:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `target` | User | No | The user whose avatar to display. Defaults to yourself. |

Returns the selected user's avatar as a high-resolution PNG image (2048px). If no user is specified, shows your own avatar.
```

- [ ] **Step 4: Create en/trans.md**

```markdown
---
title: Translate
command: trans
category: utility
description: Translate text from any language to Vietnamese using Google Translate.
---

## Usage

```
/trans word:hello world
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `word` | String | Yes | The text to translate |

The source language is auto-detected. Translation output is always Vietnamese.
```

- [ ] **Step 5: Create en/weather.md**

```markdown
---
title: Weather
command: weather
category: utility
description: Get current weather and a 3-day forecast for any location.
---

## Usage

```
/weather location:Tokyo
/weather location:Ho Chi Minh City
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `location` | String | Yes | City name or location to look up |

Returns an embed with current temperature, humidity, wind speed and direction, plus a 3-day forecast with daily highs and lows. Powered by Open-Meteo API.
```

- [ ] **Step 6: Create en/balance.md**

```markdown
---
title: Balance
command: balance
category: economy
description: View your coin and gem balance, pray streak, and last activity timestamp.
---

## Usage

```
/balance
/balance user:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | No | Check another user's balance. Defaults to yourself. |

Displays your current **coin** and **gem** holdings in this server, your active pray streak count, and when you last used `/pray`.
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro build
```

Expected: Build succeeds, generates pages for all 7 simple commands.

- [ ] **Step 8: Commit**

```bash
git add landing/src/content/commands/en/ping.md landing/src/content/commands/en/help.md landing/src/content/commands/en/info.md landing/src/content/commands/en/avatar.md landing/src/content/commands/en/trans.md landing/src/content/commands/en/weather.md landing/src/content/commands/en/balance.md
git commit -m "feat(landing): add English guides for simple commands"
```

---

### Task 11: Write English Content — Complex Commands (18 files)

**Files:**
- Create: `landing/src/content/commands/en/voice.md`
- Create: `landing/src/content/commands/en/rank.md`
- Create: `landing/src/content/commands/en/leaderboard.md`
- Create: `landing/src/content/commands/en/server-rank.md`
- Create: `landing/src/content/commands/en/xp.md`
- Create: `landing/src/content/commands/en/pray.md`
- Create: `landing/src/content/commands/en/curse.md`
- Create: `landing/src/content/commands/en/shop.md`
- Create: `landing/src/content/commands/en/economy.md`
- Create: `landing/src/content/commands/en/moderation.md`
- Create: `landing/src/content/commands/en/settings.md`
- Create: `landing/src/content/commands/en/confession.md`
- Create: `landing/src/content/commands/en/nhentai.md`
- Create: `landing/src/content/commands/en/3hentai.md`
- Create: `landing/src/content/commands/en/asmhentai.md`
- Create: `landing/src/content/commands/en/hentaifox.md`
- Create: `landing/src/content/commands/en/nhentai-lite.md`
- Create: `landing/src/content/commands/en/pururin.md`

Each file follows the guide format from the spec. Below are the complete files.

- [ ] **Step 1: Create en/voice.md**

```markdown
---
title: Voice Channel Management
command: voice
category: voice
description: Create and manage temporary voice channels with full control over permissions, naming, and user access.
cooldown: "5s–120s"
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/voice limit <number>` | Set user limit (0–99, 0 = unlimited) | `/voice limit 5` |
| `/voice name <text>` | Rename your channel (max 50 chars) | `/voice name Gaming Room` |
| `/voice lock` | Lock channel — deny everyone from joining | `/voice lock` |
| `/voice unlock` | Unlock channel — allow everyone to join | `/voice unlock` |
| `/voice hide` | Hide channel from everyone in the server | `/voice hide` |
| `/voice permit <user>` | Allow a specific user to join | `/voice permit @friend` |
| `/voice block <user>` | Block a user and disconnect them | `/voice block @troll` |
| `/voice kick <user>` | Kick a user with a confirmation prompt | `/voice kick @user` |
| `/voice transfer <user>` | Transfer room ownership to another user | `/voice transfer @friend` |

## How to Use

### Step 1: Join the trigger channel

Join the designated voice channel in any server using 3AT. A personal voice room is automatically created for you — you are the **owner**.

### Step 2: Customize your room

Use `/voice name` to rename your room and `/voice limit` to set the maximum number of users.

> **Tip:** Set limit to `0` to remove the user cap entirely.

### Step 3: Control access

- `/voice lock` — Prevents everyone from joining.
- `/voice hide` — Makes the channel invisible to non-members.
- `/voice permit @user` — Whitelist a specific user (works even when locked/hidden).
- `/voice block @user` — Ban a user from your room and disconnect them immediately.

### Step 4: Kick or transfer

- `/voice kick @user` — Shows a confirmation button. You can optionally block them at the same time.
- `/voice transfer @user` — Hands ownership to another user. Your permit and block lists are cleared.

### Step 5: Leave

When everyone leaves the room, it is automatically deleted. Your ownership data expires after 12 hours of inactivity.

> **Warning:** Name and limit changes have a **120-second** cooldown. All other commands have a **5-second** cooldown. You must be the room owner to use these commands.
```

- [ ] **Step 2: Create en/rank.md**

```markdown
---
title: Rank
command: rank
category: xp
description: View your rank card showing level, XP progress, server and global rank, and activity stats.
---

## Usage

```
/rank
/rank user:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | No | View another user's rank card. Defaults to yourself. |

## What's on the Rank Card

The rank card displays:
- **Level** and XP progress bar toward the next level
- **Server rank** — your position among all members in this server
- **Global rank** — your position across all servers using 3AT
- **Activity stats** — total messages sent, voice minutes, and reactions given

> **Tip:** The rank card is rendered as an image. If image rendering fails, an embed fallback is shown automatically.
```

- [ ] **Step 3: Create en/leaderboard.md**

```markdown
---
title: Leaderboard
command: leaderboard
category: xp
description: Paginated XP leaderboard with period filtering and multiple display modes.
---

## Usage

```
/leaderboard
/leaderboard mode:global
/leaderboard mode:servers
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `mode` | Choice | No | `server` (default), `global`, or `servers` |

## Modes

| Mode | Shows |
|------|-------|
| **Server** | Top members in the current server by XP |
| **Global** | Top users across all servers using 3AT |
| **Servers** | Top servers ranked by total XP |

## How to Use

### Step 1: Run the command

Use `/leaderboard` for the default server leaderboard, or choose a mode.

### Step 2: Filter by period

After the leaderboard appears, use the **period buttons** to filter:
- **All Time** — Total accumulated XP
- **Daily** — XP earned today
- **Weekly** — XP earned this week (ISO week)
- **Monthly** — XP earned this month
- **Yearly** — XP earned this year

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to browse. Each page shows 10 entries, up to 100 total.

> **Tip:** Buttons expire after **60 seconds** of inactivity. Run the command again to get fresh buttons.
```

- [ ] **Step 4: Create en/server-rank.md**

```markdown
---
title: Server Rank
command: server-rank
category: xp
description: View this server's XP stats, ranking among all servers, and activity breakdown.
---

## Usage

```
/server-rank
```

No options. Displays the current server's stats:
- **Total XP** earned by all members
- **Server rank** among all servers using 3AT
- **Activity breakdown** — messages, voice minutes, reactions, active members
- **Period stats** — daily, weekly, and monthly XP comparisons

> **Tip:** Server stats are aggregated every 10 minutes. Recent activity may take a few minutes to appear.
```

- [ ] **Step 5: Create en/xp.md**

```markdown
---
title: XP Management
command: xp
category: xp
description: Admin commands to manage user XP and configure channel blacklists.
permissions: ["Manage Guild"]
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/xp set <user> <amount>` | Set a user's XP to an exact amount | `/xp set @user 5000` |
| `/xp add <user> <amount>` | Add XP to a user | `/xp add @user 500` |
| `/xp remove <user> <amount>` | Remove XP from a user | `/xp remove @user 200` |
| `/xp channel-blacklist add <channel>` | Blacklist a channel from XP gains | `/xp channel-blacklist add #spam` |
| `/xp channel-blacklist remove <channel>` | Remove a channel from the blacklist | `/xp channel-blacklist remove #spam` |

## How to Use

### Managing User XP

Use `set` to override, `add` to reward, or `remove` to penalize. Changes are reflected immediately in the user's rank card and leaderboard position.

### Channel Blacklists

Messages sent in blacklisted channels do not earn XP. This is useful for spam channels, bot command channels, or off-topic areas.

> **Warning:** Only members with the **Manage Guild** permission can use these commands.
```

- [ ] **Step 6: Create en/pray.md**

```markdown
---
title: Pray
command: pray
category: economy
description: Daily prayer for coins with streak bonuses at milestone days.
cooldown: "24h (UTC reset)"
---

## Usage

```
/pray
/pray target:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `target` | User | No | Pray for another user — they receive bonus coins too |

## How It Works

### Daily Prayer

You can pray **once every 24 hours** (resets at UTC midnight). Each prayer earns you coins:
- **Self pray:** 50–150 coins
- **Targeted pray:** 100–200 coins (the target also receives a portion)

### Streak System

Praying on consecutive days builds a streak. Milestone bonuses:

| Streak | Bonus |
|--------|-------|
| 3 days | Bonus coins |
| 7 days | Bonus coins + gems |
| 14 days | Larger bonus + gems |
| 30 days | Maximum bonus + gems |

> **Tip:** Missing a day resets your streak to zero. Pray daily to maximize rewards!

### Gem Rewards

Gems are a rare currency earned at streak milestones (5% chance on regular prays). Gems can be spent in the server shop on premium items.
```

- [ ] **Step 7: Create en/curse.md**

```markdown
---
title: Curse
command: curse
category: economy
description: Daily curse action with coin rewards — mirrors pray mechanics with lower payouts.
cooldown: "24h (UTC reset)"
---

## Usage

```
/curse
/curse target:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `target` | User | No | Curse another user — they receive a share of coins |

## How It Works

Curse works like `/pray` but with different flavor text and lower coin rewards. You can curse once per day (24-hour cooldown, UTC reset).

- **Self curse:** Earn a small amount of coins
- **Targeted curse:** Earn more coins; the target also receives a portion

> **Tip:** Curse does not have a streak system or gem rewards like `/pray`. Use it as a secondary daily income source.
```

- [ ] **Step 8: Create en/shop.md**

```markdown
---
title: Shop
command: shop
category: economy
description: Browse and purchase server shop items, or manage the shop as an admin.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/shop view` | Browse available items (paginated) | Everyone |
| `/shop buy <item_id>` | Purchase an item by ID | Everyone |
| `/shop add` | Add a new item to the shop | Administrator |
| `/shop remove <item_id>` | Remove an item from the shop | Administrator |

## How to Use

### Browsing the Shop

Use `/shop view` to see available items. Items are displayed 5 per page with pagination buttons. Each item shows its name, description, price, currency type, and remaining stock.

### Buying Items

Use `/shop buy` with the item's ID (shown in the shop listing). The item's cost is deducted from your coin or gem balance.

### Managing the Shop (Admin)

#### Adding Items

`/shop add` prompts you for:
- **Name** and **description**
- **Type:** `role` (assigns a Discord role), `cosmetic`, or `currency_exchange`
- **Price** and **currency** (coin or gem)
- **Role** (required if type is `role`)
- **Stock** (optional — unlimited if not set)

#### Removing Items

`/shop remove` deletes an item by its ID. Existing purchases are not affected.

> **Warning:** Only members with **Administrator** permission can add or remove shop items.
```

- [ ] **Step 9: Create en/economy.md**

```markdown
---
title: Economy Management
command: economy
category: economy
description: Admin commands to set or adjust user coin and gem balances.
permissions: ["Administrator"]
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy set-coin <user> <amount>` | Set user's coin balance | `/economy set-coin @user 1000` |
| `/economy add-coin <user> <amount>` | Add (or subtract) coins | `/economy add-coin @user 500` |
| `/economy set-gem <user> <amount>` | Set user's gem balance | `/economy set-gem @user 10` |
| `/economy add-gem <user> <amount>` | Add (or subtract) gems | `/economy add-gem @user 5` |

Use negative amounts with `add-coin` / `add-gem` to subtract currency.

> **Warning:** Only members with **Administrator** permission can use these commands. All transactions are logged.
```

- [ ] **Step 10: Create en/moderation.md**

```markdown
---
title: Moderation
command: moderation
category: moderation
description: Staff moderation suite — timeout, ban, kick, and unban with permission hierarchy enforcement.
permissions: ["Moderate Members", "Ban Members", "Kick Members"]
---

## Subcommands

| Subcommand | Description | Required Permission |
|------------|-------------|---------------------|
| `/moderation timeout <user> <duration> <unit>` | Mute a member (text + voice) | Moderate Members |
| `/moderation untimeout <user>` | Remove an active timeout | Moderate Members |
| `/moderation ban <user> [reason] [delete_messages]` | Ban a member from the server | Ban Members |
| `/moderation kick <user> [reason]` | Kick a member from the server | Kick Members |
| `/moderation unban <user_id>` | Unban by user ID | Ban Members |

## How to Use

### Timeout

```
/moderation timeout user:@troll duration:30 unit:minutes reason:Spamming
```

Mutes the user in both text and voice for the specified duration. Maximum duration is **28 days**. The `unit` option accepts: `minutes`, `hours`, or `days`.

### Ban

```
/moderation ban user:@user reason:Rule violation delete_messages:86400
```

The `delete_messages` option removes the user's messages from the past N seconds (max 604800 = 7 days). Set to `0` to keep messages.

### Unban

```
/moderation unban user_id:123456789012345678
```

Requires the user's **numeric ID** (snowflake), not a mention.

> **Warning:** The bot enforces **role hierarchy** — you cannot moderate members with a role equal to or higher than yours. The guild owner bypasses all hierarchy checks.
```

- [ ] **Step 11: Create en/settings.md**

```markdown
---
title: Settings
command: settings
category: settings
description: Configure your personal language or set a default language for the entire server.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/settings language <lang>` | Set your personal language preference | Everyone |
| `/settings server-language <lang>` | Set the server's default language | Manage Guild |

## Supported Languages

English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, Dutch — 15 languages total.

## How It Works

### Personal Language

Your personal preference overrides everything else. The bot will always respond to you in your chosen language, regardless of server settings.

Use `/settings language reset:true` to clear your preference and fall back to server or Discord client language.

### Server Language

The server default applies to all members who haven't set a personal preference.

Use `/settings server-language reset:true` to clear and fall back to each member's Discord client language.

> **Tip:** Language preferences are cached for 30 days for fast responses.
```

- [ ] **Step 12: Create en/confession.md**

```markdown
---
title: Confession
command: confession
category: confession
description: Anonymous confession system with optional moderator review workflow.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/confession setup` | Configure the confession system | Manage Guild |
| `/confession submit` | Submit an anonymous confession | Everyone |

## How to Use

### Setting Up (Admin)

Use `/confession setup` to configure:
- **Enabled:** Turn the confession system on/off
- **Mode:** `instant` (posts immediately) or `review` (requires moderator approval)
- **Public channel:** Where approved confessions appear
- **Review channel:** Where pending confessions are reviewed (required in review mode)
- **Cooldown:** 1–120 minutes between submissions per user

### Submitting a Confession

```
/confession submit text:Your confession here image:(optional attachment)
```

- Text can be up to **3,500 characters**
- Optionally attach one image
- Your identity is **completely hidden** from other members
- Each confession gets a unique number (e.g., Confession #42)

### Review Mode

In review mode, confessions go to the review channel where moderators see the confession text with **Approve** and **Reject** buttons. Approved confessions are posted to the public channel. In review mode, moderators can see the author's identity.

> **Warning:** The confession system must be set up by an admin before members can submit confessions.
```

- [ ] **Step 13: Create en/nhentai.md**

```markdown
---
title: nhentai Reader
command: nhentai
category: manga
description: Read manga and doujinshi from nhentai.net directly in Discord.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/nhentai read <id>` | Read a specific manga by its ID | `/nhentai read id:177013` |
| `/nhentai random` | Get a random manga | `/nhentai random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW** in Discord's channel settings. You'll get an error if the channel isn't NSFW.

### Step 2: Read or browse

- Use `read` with a specific nhentai ID to view that manga
- Use `random` to discover something new

### Step 3: Navigate pages

The bot displays the cover image with **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity.

> **Tip:** Manga with more than 50 pages will show a "Read Online" link instead of in-Discord pagination to keep things manageable.
```

- [ ] **Step 14: Create remaining manga command files**

Create `landing/src/content/commands/en/3hentai.md`:

```markdown
---
title: 3hentai Reader
command: 3hentai
category: manga
description: Read manga and doujinshi from 3hentai directly in Discord.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/3hentai read <id>` | Read a specific manga by its ID | `/3hentai read id:12345` |
| `/3hentai random` | Get a random manga | `/3hentai random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW**. You'll get an error otherwise.

### Step 2: Read or browse

- `read` — Provide a manga ID from 3hentai to read it
- `random` — Get a random manga from the source

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity. Manga with 50+ pages shows a "Read Online" link.
```

Create `landing/src/content/commands/en/asmhentai.md`:

```markdown
---
title: asmhentai Reader
command: asmhentai
category: manga
description: Read random doujinshi from asmhentai directly in Discord.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/asmhentai read <id>` | Read a specific manga by its ID | `/asmhentai read id:12345` |
| `/asmhentai random` | Get a random manga | `/asmhentai random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW**. You'll get an error otherwise.

### Step 2: Read or browse

- `read` — Provide a manga ID to read it
- `random` — Get a random manga from asmhentai

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity. Manga with 50+ pages shows a "Read Online" link.
```

Create `landing/src/content/commands/en/hentaifox.md`:

```markdown
---
title: hentaifox Reader
command: hentaifox
category: manga
description: Read random doujinshi from hentaifox directly in Discord.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/hentaifox read <id>` | Read a specific manga by its ID | `/hentaifox read id:12345` |
| `/hentaifox random` | Get a random manga | `/hentaifox random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW**. You'll get an error otherwise.

### Step 2: Read or browse

- `read` — Provide a manga ID to read it
- `random` — Get a random manga from hentaifox

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity. Manga with 50+ pages shows a "Read Online" link.
```

Create `landing/src/content/commands/en/nhentai-lite.md`:

```markdown
---
title: nhentai Lite Reader
command: nhentai-lite
category: manga
description: Lightweight nhentai reader using nhentai.to as the source.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/nhentai-lite read <id>` | Read a specific manga by its ID | `/nhentai-lite read id:177013` |
| `/nhentai-lite random` | Get a random manga | `/nhentai-lite random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW**. You'll get an error otherwise.

### Step 2: Read or browse

- `read` — Provide a manga ID to read it
- `random` — Get a random manga from nhentai.to

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity. Manga with 50+ pages shows a "Read Online" link.

> **Tip:** This is a lighter alternative to `/nhentai` that uses nhentai.to as the source, which may be faster in some regions.
```

Create `landing/src/content/commands/en/pururin.md`:

```markdown
---
title: pururin Reader
command: pururin
category: manga
description: Read random doujinshi from pururin.to directly in Discord.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/pururin read <id>` | Read a specific manga by its ID | `/pururin read id:12345` |
| `/pururin random` | Get a random manga | `/pururin random` |

## How to Use

### Step 1: Use in an NSFW channel

This command **only works in channels marked as NSFW**. You'll get an error otherwise.

### Step 2: Read or browse

- `read` — Provide a manga ID to read it
- `random` — Get a random manga from pururin.to

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to flip through pages. Buttons auto-remove after **20 seconds** of inactivity. Manga with 50+ pages shows a "Read Online" link.
```

- [ ] **Step 15: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro build
```

Expected: Build succeeds, generates pages for all 25 English commands.

- [ ] **Step 16: Commit**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
git add src/content/commands/en/
git commit -m "feat(landing): add English guides for all 25 commands"
```

---

### Task 12: Write Vietnamese Content (25 files)

**Files:**
- Create: `landing/src/content/commands/vi/*.md` (25 files)

Each file mirrors the English version with Vietnamese translations. Same frontmatter `command`, `category`, `cooldown`, and `permissions` values — only `title`, `description`, and body content are translated.

- [ ] **Step 1: Create vi/ping.md**

```markdown
---
title: Ping
command: ping
category: utility
description: Kiểm tra bot có hoạt động không và đo độ trễ phản hồi.
---

## Cách dùng

```
/ping
```

Chạy lệnh — không cần thêm gì. Bot sẽ trả lời **Pong!** kèm theo độ trễ WebSocket hiện tại tính bằng mili giây.
```

- [ ] **Step 2: Create vi/help.md**

```markdown
---
title: Trợ giúp
command: help
category: info
description: Xem danh sách tất cả các lệnh bot theo từng danh mục.
---

## Cách dùng

```
/help
```

Không cần thêm gì. Bot sẽ hiển thị embed với tất cả lệnh được nhóm theo danh mục, kèm nút liên kết đến trang chủ và hỗ trợ.
```

- [ ] **Step 3: Create vi/info.md**

```markdown
---
title: Thông tin Bot
command: info
category: info
description: Xem thông tin bot bao gồm phiên bản, thời gian hoạt động, số server và công nghệ.
---

## Cách dùng

```
/info bot
```

## Lệnh con

| Lệnh con | Mô tả |
|-----------|-------|
| `bot` | Hiển thị thông tin bot |

Hiển thị phiên bản hiện tại, thời gian hoạt động, số server, phiên bản Node.js và các thư viện. Kèm nút liên kết đến trang chủ và báo lỗi.
```

- [ ] **Step 4: Create vi/avatar.md**

```markdown
---
title: Ảnh đại diện
command: avatar
category: info
description: Lấy ảnh đại diện của bất kỳ người dùng nào hoặc của chính bạn.
---

## Cách dùng

```
/avatar
/avatar target:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `target` | User | Không | Người dùng cần xem ảnh đại diện. Mặc định là bạn. |

Trả về ảnh đại diện độ phân giải cao dạng PNG (2048px). Nếu không chọn ai, sẽ hiển thị ảnh của bạn.
```

- [ ] **Step 5: Create vi/trans.md**

```markdown
---
title: Dịch
command: trans
category: utility
description: Dịch văn bản từ bất kỳ ngôn ngữ nào sang tiếng Việt qua Google Translate.
---

## Cách dùng

```
/trans word:hello world
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `word` | String | Có | Văn bản cần dịch |

Ngôn ngữ nguồn được tự động nhận diện. Kết quả dịch luôn là tiếng Việt.
```

- [ ] **Step 6: Create vi/weather.md**

```markdown
---
title: Thời tiết
command: weather
category: utility
description: Xem thời tiết hiện tại và dự báo 3 ngày cho bất kỳ địa điểm nào.
---

## Cách dùng

```
/weather location:Tokyo
/weather location:Hồ Chí Minh
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `location` | String | Có | Tên thành phố hoặc địa điểm cần tra |

Trả về nhiệt độ hiện tại, độ ẩm, tốc độ và hướng gió, cùng dự báo 3 ngày. Sử dụng Open-Meteo API.
```

- [ ] **Step 7: Create vi/balance.md**

```markdown
---
title: Số dư
command: balance
category: economy
description: Xem số coin, gem, chuỗi cầu nguyện và thời gian hoạt động gần nhất.
---

## Cách dùng

```
/balance
/balance user:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `user` | User | Không | Xem số dư người khác. Mặc định là bạn. |

Hiển thị số **coin** và **gem** hiện tại trong server này, số ngày cầu nguyện liên tiếp, và lần cuối sử dụng `/pray`.
```

- [ ] **Step 8: Create vi/voice.md**

```markdown
---
title: Quản lý kênh thoại
command: voice
category: voice
description: Tạo và quản lý kênh thoại tạm thời với toàn quyền kiểm soát quyền truy cập, tên và người dùng.
cooldown: "5s–120s"
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/voice limit <số>` | Đặt giới hạn người (0–99, 0 = không giới hạn) | `/voice limit 5` |
| `/voice name <tên>` | Đổi tên kênh (tối đa 50 ký tự) | `/voice name Phòng Game` |
| `/voice lock` | Khóa kênh — không cho ai vào | `/voice lock` |
| `/voice unlock` | Mở khóa kênh — cho phép mọi người vào | `/voice unlock` |
| `/voice hide` | Ẩn kênh khỏi tất cả mọi người | `/voice hide` |
| `/voice permit <user>` | Cho phép một người cụ thể vào | `/voice permit @friend` |
| `/voice block <user>` | Chặn và ngắt kết nối một người | `/voice block @troll` |
| `/voice kick <user>` | Đuổi một người với xác nhận | `/voice kick @user` |
| `/voice transfer <user>` | Chuyển quyền sở hữu phòng | `/voice transfer @friend` |

## Cách sử dụng

### Bước 1: Vào kênh kích hoạt

Vào kênh thoại được chỉ định trong server sử dụng 3AT. Một phòng thoại cá nhân sẽ được tự động tạo — bạn là **chủ phòng**.

### Bước 2: Tùy chỉnh phòng

Dùng `/voice name` để đổi tên và `/voice limit` để đặt số người tối đa.

> **Mẹo:** Đặt limit là `0` để bỏ giới hạn người dùng.

### Bước 3: Kiểm soát quyền truy cập

- `/voice lock` — Không cho ai vào phòng.
- `/voice hide` — Ẩn kênh khỏi mọi người.
- `/voice permit @user` — Cho phép người cụ thể vào (hoạt động cả khi đã khóa/ẩn).
- `/voice block @user` — Chặn người dùng và ngắt kết nối ngay lập tức.

### Bước 4: Đuổi hoặc chuyển quyền

- `/voice kick @user` — Hiện nút xác nhận. Có thể chặn luôn.
- `/voice transfer @user` — Chuyển quyền sở hữu. Danh sách permit và block sẽ bị xóa.

### Bước 5: Rời phòng

Khi mọi người rời phòng, kênh sẽ tự động bị xóa. Dữ liệu quyền sở hữu hết hạn sau 12 giờ không hoạt động.

> **Lưu ý:** Đổi tên và giới hạn có thời gian chờ **120 giây**. Các lệnh khác chờ **5 giây**. Bạn phải là chủ phòng mới dùng được các lệnh này.
```

- [ ] **Step 9: Create vi/rank.md**

```markdown
---
title: Xếp hạng
command: rank
category: xp
description: Xem thẻ xếp hạng với cấp độ, tiến trình XP, thứ hạng server và toàn cầu, thống kê hoạt động.
---

## Cách dùng

```
/rank
/rank user:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `user` | User | Không | Xem thẻ xếp hạng người khác. Mặc định là bạn. |

## Nội dung thẻ xếp hạng

- **Cấp độ** và thanh tiến trình XP đến cấp tiếp theo
- **Thứ hạng server** — vị trí của bạn trong server này
- **Thứ hạng toàn cầu** — vị trí của bạn trên tất cả server dùng 3AT
- **Thống kê hoạt động** — tổng tin nhắn, phút thoại, và lượt reaction

> **Mẹo:** Thẻ xếp hạng được render dạng ảnh. Nếu render ảnh lỗi, embed sẽ hiển thị thay thế.
```

- [ ] **Step 10: Create vi/leaderboard.md**

```markdown
---
title: Bảng xếp hạng
command: leaderboard
category: xp
description: Bảng xếp hạng XP phân trang với bộ lọc thời gian và nhiều chế độ hiển thị.
---

## Cách dùng

```
/leaderboard
/leaderboard mode:global
/leaderboard mode:servers
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `mode` | Lựa chọn | Không | `server` (mặc định), `global`, hoặc `servers` |

## Các chế độ

| Chế độ | Hiển thị |
|--------|----------|
| **Server** | Thành viên có XP cao nhất trong server hiện tại |
| **Global** | Người dùng có XP cao nhất trên tất cả server |
| **Servers** | Server có tổng XP cao nhất |

## Cách sử dụng

### Bước 1: Chạy lệnh

Dùng `/leaderboard` cho bảng xếp hạng server mặc định, hoặc chọn chế độ.

### Bước 2: Lọc theo thời gian

Sau khi bảng xếp hạng hiển thị, dùng **nút thời gian** để lọc:
- **Tất cả** — Tổng XP tích lũy
- **Hôm nay** — XP kiếm được hôm nay
- **Tuần này** — XP tuần này (tuần ISO)
- **Tháng này** — XP tháng này
- **Năm nay** — XP năm nay

### Bước 3: Chuyển trang

Dùng nút **Trước** và **Sau** để duyệt. Mỗi trang hiển thị 10 mục, tối đa 100.

> **Mẹo:** Các nút hết hạn sau **60 giây** không tương tác. Chạy lại lệnh để có nút mới.
```

- [ ] **Step 11: Create vi/server-rank.md**

```markdown
---
title: Xếp hạng Server
command: server-rank
category: xp
description: Xem thống kê XP của server, thứ hạng giữa các server, và phân tích hoạt động.
---

## Cách dùng

```
/server-rank
```

Không cần tùy chọn. Hiển thị thống kê server hiện tại:
- **Tổng XP** của tất cả thành viên
- **Thứ hạng server** giữa các server sử dụng 3AT
- **Phân tích hoạt động** — tin nhắn, phút thoại, reaction, thành viên hoạt động
- **Thống kê theo thời gian** — so sánh XP hàng ngày, tuần, tháng

> **Mẹo:** Thống kê server được tổng hợp mỗi 10 phút. Hoạt động gần đây có thể mất vài phút để hiển thị.
```

- [ ] **Step 12: Create vi/xp.md**

```markdown
---
title: Quản lý XP
command: xp
category: xp
description: Lệnh admin để quản lý XP người dùng và cấu hình danh sách kênh bị chặn XP.
permissions: ["Manage Guild"]
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/xp set <user> <amount>` | Đặt XP người dùng | `/xp set @user 5000` |
| `/xp add <user> <amount>` | Thêm XP cho người dùng | `/xp add @user 500` |
| `/xp remove <user> <amount>` | Trừ XP người dùng | `/xp remove @user 200` |
| `/xp channel-blacklist add <channel>` | Chặn kênh không nhận XP | `/xp channel-blacklist add #spam` |
| `/xp channel-blacklist remove <channel>` | Bỏ chặn kênh | `/xp channel-blacklist remove #spam` |

## Cách sử dụng

### Quản lý XP người dùng

Dùng `set` để ghi đè, `add` để thưởng, hoặc `remove` để trừ. Thay đổi được phản ánh ngay lập tức.

### Danh sách kênh bị chặn

Tin nhắn trong kênh bị chặn sẽ không nhận XP. Hữu ích cho kênh spam, kênh bot, hoặc kênh off-topic.

> **Lưu ý:** Chỉ thành viên có quyền **Manage Guild** mới dùng được các lệnh này.
```

- [ ] **Step 13: Create vi/pray.md**

```markdown
---
title: Cầu nguyện
command: pray
category: economy
description: Cầu nguyện hàng ngày để nhận coin với bonus chuỗi ngày liên tiếp.
cooldown: "24h (reset UTC)"
---

## Cách dùng

```
/pray
/pray target:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `target` | User | Không | Cầu nguyện cho người khác — họ cũng nhận bonus coin |

## Cách hoạt động

### Cầu nguyện hàng ngày

Bạn có thể cầu nguyện **mỗi 24 giờ** (reset lúc nửa đêm UTC). Mỗi lần nhận coin:
- **Tự cầu nguyện:** 50–150 coin
- **Cầu cho người khác:** 100–200 coin (người đó cũng nhận một phần)

### Hệ thống chuỗi ngày

Cầu nguyện liên tiếp tạo chuỗi ngày. Bonus tại các mốc:

| Chuỗi | Bonus |
|--------|-------|
| 3 ngày | Bonus coin |
| 7 ngày | Bonus coin + gem |
| 14 ngày | Bonus lớn hơn + gem |
| 30 ngày | Bonus tối đa + gem |

> **Mẹo:** Bỏ lỡ một ngày sẽ reset chuỗi về 0. Hãy cầu nguyện mỗi ngày để tối đa phần thưởng!

### Phần thưởng Gem

Gem là tiền tệ hiếm, nhận được tại các mốc chuỗi ngày (5% cơ hội ở lần cầu nguyện thường). Gem có thể chi tiêu tại shop server cho vật phẩm cao cấp.
```

- [ ] **Step 14: Create vi/curse.md**

```markdown
---
title: Nguyền rủa
command: curse
category: economy
description: Nguyền rủa hàng ngày với phần thưởng coin — tương tự pray nhưng thưởng ít hơn.
cooldown: "24h (reset UTC)"
---

## Cách dùng

```
/curse
/curse target:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `target` | User | Không | Nguyền rủa người khác — họ nhận một phần coin |

## Cách hoạt động

Curse hoạt động giống `/pray` nhưng với nội dung khác và phần thưởng coin thấp hơn. Bạn có thể dùng mỗi ngày (thời gian chờ 24 giờ, reset UTC).

- **Tự nguyền:** Nhận ít coin
- **Nguyền người khác:** Nhận nhiều hơn; người đó cũng nhận một phần

> **Mẹo:** Curse không có hệ thống chuỗi ngày hay phần thưởng gem như `/pray`. Dùng như nguồn thu nhập phụ hàng ngày.
```

- [ ] **Step 15: Create vi/shop.md**

```markdown
---
title: Cửa hàng
command: shop
category: economy
description: Duyệt và mua vật phẩm cửa hàng server, hoặc quản lý cửa hàng với quyền admin.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền |
|-----------|-------|-------|
| `/shop view` | Duyệt vật phẩm (phân trang) | Tất cả |
| `/shop buy <item_id>` | Mua vật phẩm theo ID | Tất cả |
| `/shop add` | Thêm vật phẩm mới | Administrator |
| `/shop remove <item_id>` | Xóa vật phẩm | Administrator |

## Cách sử dụng

### Duyệt cửa hàng

Dùng `/shop view` để xem vật phẩm. Hiển thị 5 vật phẩm mỗi trang với nút phân trang. Mỗi vật phẩm hiện tên, mô tả, giá, loại tiền, và số lượng còn lại.

### Mua vật phẩm

Dùng `/shop buy` với ID vật phẩm (hiển thị trong danh sách). Chi phí sẽ trừ từ số coin hoặc gem.

### Quản lý cửa hàng (Admin)

#### Thêm vật phẩm

`/shop add` yêu cầu:
- **Tên** và **mô tả**
- **Loại:** `role` (gán role Discord), `cosmetic`, hoặc `currency_exchange`
- **Giá** và **tiền tệ** (coin hoặc gem)
- **Role** (bắt buộc nếu loại là `role`)
- **Số lượng** (tùy chọn — không giới hạn nếu không đặt)

#### Xóa vật phẩm

`/shop remove` xóa vật phẩm theo ID. Các giao dịch đã mua không bị ảnh hưởng.

> **Lưu ý:** Chỉ thành viên có quyền **Administrator** mới thêm hoặc xóa vật phẩm.
```

- [ ] **Step 16: Create vi/economy.md**

```markdown
---
title: Quản lý kinh tế
command: economy
category: economy
description: Lệnh admin để đặt hoặc điều chỉnh số coin và gem của người dùng.
permissions: ["Administrator"]
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/economy set-coin <user> <amount>` | Đặt số coin | `/economy set-coin @user 1000` |
| `/economy add-coin <user> <amount>` | Thêm (hoặc trừ) coin | `/economy add-coin @user 500` |
| `/economy set-gem <user> <amount>` | Đặt số gem | `/economy set-gem @user 10` |
| `/economy add-gem <user> <amount>` | Thêm (hoặc trừ) gem | `/economy add-gem @user 5` |

Dùng số âm với `add-coin` / `add-gem` để trừ tiền tệ.

> **Lưu ý:** Chỉ thành viên có quyền **Administrator** mới dùng được. Tất cả giao dịch đều được ghi lại.
```

- [ ] **Step 17: Create vi/moderation.md**

```markdown
---
title: Kiểm duyệt
command: moderation
category: moderation
description: Bộ công cụ kiểm duyệt — timeout, ban, kick và unban với kiểm tra phân cấp quyền.
permissions: ["Moderate Members", "Ban Members", "Kick Members"]
---

## Lệnh con

| Lệnh con | Mô tả | Quyền cần thiết |
|-----------|-------|-----------------|
| `/moderation timeout <user> <duration> <unit>` | Tắt tiếng thành viên (chat + voice) | Moderate Members |
| `/moderation untimeout <user>` | Gỡ timeout | Moderate Members |
| `/moderation ban <user> [reason] [delete_messages]` | Cấm khỏi server | Ban Members |
| `/moderation kick <user> [reason]` | Đuổi khỏi server | Kick Members |
| `/moderation unban <user_id>` | Gỡ cấm theo ID | Ban Members |

## Cách sử dụng

### Timeout

```
/moderation timeout user:@troll duration:30 unit:minutes reason:Spam
```

Tắt tiếng người dùng trong cả chat và voice trong thời gian chỉ định. Tối đa **28 ngày**. Đơn vị: `minutes`, `hours`, hoặc `days`.

### Ban

```
/moderation ban user:@user reason:Vi phạm nội quy delete_messages:86400
```

Tùy chọn `delete_messages` xóa tin nhắn trong N giây gần nhất (tối đa 604800 = 7 ngày). Đặt `0` để giữ tin nhắn.

### Unban

```
/moderation unban user_id:123456789012345678
```

Cần **ID số** (snowflake) của người dùng, không phải mention.

> **Lưu ý:** Bot kiểm tra **phân cấp role** — bạn không thể kiểm duyệt thành viên có role bằng hoặc cao hơn bạn. Chủ server bỏ qua mọi kiểm tra phân cấp.
```

- [ ] **Step 18: Create vi/settings.md**

```markdown
---
title: Cài đặt
command: settings
category: settings
description: Cấu hình ngôn ngữ cá nhân hoặc đặt ngôn ngữ mặc định cho toàn server.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền |
|-----------|-------|-------|
| `/settings language <lang>` | Đặt ngôn ngữ cá nhân | Tất cả |
| `/settings server-language <lang>` | Đặt ngôn ngữ mặc định server | Manage Guild |

## Ngôn ngữ hỗ trợ

Tiếng Anh, Tiếng Việt, Tiếng Indonesia, Tiếng Tây Ban Nha, Tiếng Nhật, Tiếng Trung, Tiếng Hàn, Tiếng Bồ Đào Nha (Brazil), Tiếng Pháp, Tiếng Đức, Tiếng Nga, Tiếng Thổ Nhĩ Kỳ, Tiếng Ý, Tiếng Ba Lan, Tiếng Hà Lan — tổng 15 ngôn ngữ.

## Cách hoạt động

### Ngôn ngữ cá nhân

Tùy chọn cá nhân ghi đè mọi thứ khác. Bot sẽ luôn trả lời bạn bằng ngôn ngữ đã chọn, bất kể cài đặt server.

Dùng `/settings language reset:true` để xóa tùy chọn và quay về ngôn ngữ server hoặc Discord client.

### Ngôn ngữ server

Mặc định server áp dụng cho tất cả thành viên chưa đặt tùy chọn cá nhân.

Dùng `/settings server-language reset:true` để xóa và quay về ngôn ngữ Discord client của từng thành viên.

> **Mẹo:** Tùy chọn ngôn ngữ được cache 30 ngày để phản hồi nhanh.
```

- [ ] **Step 19: Create vi/confession.md**

```markdown
---
title: Confession
command: confession
category: confession
description: Hệ thống confession ẩn danh với tùy chọn kiểm duyệt.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền |
|-----------|-------|-------|
| `/confession setup` | Cấu hình hệ thống confession | Manage Guild |
| `/confession submit` | Gửi confession ẩn danh | Tất cả |

## Cách sử dụng

### Thiết lập (Admin)

Dùng `/confession setup` để cấu hình:
- **Bật/tắt:** Bật hoặc tắt hệ thống confession
- **Chế độ:** `instant` (đăng ngay) hoặc `review` (cần duyệt)
- **Kênh công khai:** Nơi confession được đăng
- **Kênh duyệt:** Nơi confession chờ duyệt (bắt buộc ở chế độ review)
- **Thời gian chờ:** 1–120 phút giữa các lần gửi mỗi người

### Gửi Confession

```
/confession submit text:Nội dung confession image:(đính kèm tùy chọn)
```

- Tối đa **3.500 ký tự**
- Có thể đính kèm một ảnh
- Danh tính **hoàn toàn ẩn** với các thành viên khác
- Mỗi confession có số thứ tự riêng (VD: Confession #42)

### Chế độ duyệt

Ở chế độ review, confession được gửi đến kênh duyệt. Moderator thấy nội dung kèm nút **Duyệt** và **Từ chối**. Confession được duyệt sẽ đăng lên kênh công khai. Moderator có thể xem danh tính người gửi.

> **Lưu ý:** Hệ thống confession phải được admin thiết lập trước khi thành viên có thể gửi.
```

- [ ] **Step 20: Create vi/nhentai.md**

```markdown
---
title: nhentai Reader
command: nhentai
category: manga
description: Đọc manga và doujinshi từ nhentai.net ngay trong Discord.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/nhentai read <id>` | Đọc manga theo ID | `/nhentai read id:177013` |
| `/nhentai random` | Xem manga ngẫu nhiên | `/nhentai random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW** trong cài đặt kênh Discord. Bạn sẽ nhận lỗi nếu kênh không phải NSFW.

### Bước 2: Đọc hoặc duyệt

- Dùng `read` với ID nhentai để đọc manga cụ thể
- Dùng `random` để khám phá ngẫu nhiên

### Bước 3: Lật trang

Bot hiển thị ảnh bìa với nút **Trước** và **Sau** để lật trang. Nút tự biến mất sau **20 giây** không tương tác.

> **Mẹo:** Manga hơn 50 trang sẽ hiện link "Đọc Online" thay vì phân trang trong Discord.
```

- [ ] **Step 21: Create remaining Vietnamese manga files**

Create `landing/src/content/commands/vi/3hentai.md`:

```markdown
---
title: 3hentai Reader
command: 3hentai
category: manga
description: Đọc manga và doujinshi từ 3hentai ngay trong Discord.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/3hentai read <id>` | Đọc manga theo ID | `/3hentai read id:12345` |
| `/3hentai random` | Xem manga ngẫu nhiên | `/3hentai random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW**.

### Bước 2: Đọc hoặc duyệt

- `read` — Nhập ID manga từ 3hentai để đọc
- `random` — Xem manga ngẫu nhiên

### Bước 3: Lật trang

Dùng nút **Trước** và **Sau** để lật trang. Nút biến mất sau **20 giây** không tương tác. Manga 50+ trang hiện link "Đọc Online".
```

Create `landing/src/content/commands/vi/asmhentai.md`:

```markdown
---
title: asmhentai Reader
command: asmhentai
category: manga
description: Đọc doujinshi ngẫu nhiên từ asmhentai ngay trong Discord.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/asmhentai read <id>` | Đọc manga theo ID | `/asmhentai read id:12345` |
| `/asmhentai random` | Xem manga ngẫu nhiên | `/asmhentai random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW**.

### Bước 2: Đọc hoặc duyệt

- `read` — Nhập ID manga để đọc
- `random` — Xem manga ngẫu nhiên từ asmhentai

### Bước 3: Lật trang

Dùng nút **Trước** và **Sau** để lật trang. Nút biến mất sau **20 giây** không tương tác. Manga 50+ trang hiện link "Đọc Online".
```

Create `landing/src/content/commands/vi/hentaifox.md`:

```markdown
---
title: hentaifox Reader
command: hentaifox
category: manga
description: Đọc doujinshi ngẫu nhiên từ hentaifox ngay trong Discord.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/hentaifox read <id>` | Đọc manga theo ID | `/hentaifox read id:12345` |
| `/hentaifox random` | Xem manga ngẫu nhiên | `/hentaifox random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW**.

### Bước 2: Đọc hoặc duyệt

- `read` — Nhập ID manga để đọc
- `random` — Xem manga ngẫu nhiên từ hentaifox

### Bước 3: Lật trang

Dùng nút **Trước** và **Sau** để lật trang. Nút biến mất sau **20 giây** không tương tác. Manga 50+ trang hiện link "Đọc Online".
```

Create `landing/src/content/commands/vi/nhentai-lite.md`:

```markdown
---
title: nhentai Lite Reader
command: nhentai-lite
category: manga
description: Phiên bản nhẹ của nhentai reader sử dụng nguồn nhentai.to.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/nhentai-lite read <id>` | Đọc manga theo ID | `/nhentai-lite read id:177013` |
| `/nhentai-lite random` | Xem manga ngẫu nhiên | `/nhentai-lite random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW**.

### Bước 2: Đọc hoặc duyệt

- `read` — Nhập ID manga để đọc
- `random` — Xem manga ngẫu nhiên từ nhentai.to

### Bước 3: Lật trang

Dùng nút **Trước** và **Sau** để lật trang. Nút biến mất sau **20 giây** không tương tác. Manga 50+ trang hiện link "Đọc Online".

> **Mẹo:** Đây là phiên bản nhẹ thay thế cho `/nhentai`, sử dụng nhentai.to làm nguồn, có thể nhanh hơn ở một số khu vực.
```

Create `landing/src/content/commands/vi/pururin.md`:

```markdown
---
title: pururin Reader
command: pururin
category: manga
description: Đọc doujinshi ngẫu nhiên từ pururin.to ngay trong Discord.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `/pururin read <id>` | Đọc manga theo ID | `/pururin read id:12345` |
| `/pururin random` | Xem manga ngẫu nhiên | `/pururin random` |

## Cách sử dụng

### Bước 1: Dùng trong kênh NSFW

Lệnh này **chỉ hoạt động trong kênh đánh dấu NSFW**.

### Bước 2: Đọc hoặc duyệt

- `read` — Nhập ID manga để đọc
- `random` — Xem manga ngẫu nhiên từ pururin.to

### Bước 3: Lật trang

Dùng nút **Trước** và **Sau** để lật trang. Nút biến mất sau **20 giây** không tương tác. Manga 50+ trang hiện link "Đọc Online".
```

- [ ] **Step 22: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npx astro build
```

Expected: Build succeeds, generates pages for all 50 routes (25 EN + 25 VI).

- [ ] **Step 23: Commit**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
git add src/content/commands/vi/
git commit -m "feat(landing): add Vietnamese guides for all 25 commands"
```

---

### Task 13: Final Build Verification

- [ ] **Step 1: Clean build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && rm -rf dist && npx astro build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Verify generated pages exist**

```bash
ls /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/dist/en/commands/
ls /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/dist/vi/commands/
```

Expected: 25 directories under each language (one per command slug), each containing `index.html`.

- [ ] **Step 3: Verify listing page still works**

```bash
ls /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/dist/commands/index.html
```

Expected: File exists (listing page unchanged).

- [ ] **Step 4: Spot-check a generated page**

```bash
head -30 /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/dist/en/commands/voice/index.html
```

Expected: Valid HTML with title "Voice Channel Management Guide — 3AT Bot", hreflang tags, guide content.

- [ ] **Step 5: Commit all remaining changes (if any)**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot
git status
```

If there are unstaged changes, add and commit them.
