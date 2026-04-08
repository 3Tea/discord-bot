# User Guide Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-facing guide pages to the landing site covering Economy, XP, Voice, Confessions, and Moderation systems with EN/VI i18n support.

**Architecture:** New Astro content collection `guides` with 10 markdown files (5 EN + 5 VI), an index page at `/guide`, and dynamic guide pages at `/[lang]/guide/[slug]`. Reuses existing BaseLayout, Breadcrumb, and LanguageSwitcher components. Adds new GuideCard, GuideToc, and RelatedGuides components.

**Tech Stack:** Astro 6, Markdown content collections, vanilla CSS (Discord dark theme), client-side JS (Intersection Observer for ToC)

**Spec:** `docs/superpowers/specs/2026-04-08-user-guide-pages-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `landing/src/content/guides/en/economy.md` | English economy guide content |
| `landing/src/content/guides/en/xp.md` | English XP & leveling guide content |
| `landing/src/content/guides/en/voice.md` | English voice channels guide content |
| `landing/src/content/guides/en/confessions.md` | English confessions guide content |
| `landing/src/content/guides/en/moderation.md` | English moderation guide content |
| `landing/src/content/guides/vi/economy.md` | Vietnamese economy guide |
| `landing/src/content/guides/vi/xp.md` | Vietnamese XP guide |
| `landing/src/content/guides/vi/voice.md` | Vietnamese voice guide |
| `landing/src/content/guides/vi/confessions.md` | Vietnamese confessions guide |
| `landing/src/content/guides/vi/moderation.md` | Vietnamese moderation guide |
| `landing/src/pages/guide.astro` | Guide index page (`/guide`) |
| `landing/src/pages/[lang]/guide/[...slug].astro` | Dynamic guide page |
| `landing/src/components/GuideCard.astro` | Card component for guide index grid |
| `landing/src/components/GuideToc.astro` | Sticky table of contents sidebar |
| `landing/src/components/RelatedGuides.astro` | Related guides section |
| `landing/src/data/guides.ts` | Guide metadata (icons, colors, order) |

### Modified Files

| File | Change |
|------|--------|
| `landing/src/content.config.ts` | Add `guides` collection to schema and exports |
| `landing/src/components/Navbar.astro` | Add "Guide" link between "Commands" and "FAQ" |
| `landing/src/components/LanguageSwitcher.astro` | Add `basePath` prop (default `"commands"`) |

---

## Task 1: Add `guides` content collection and guide metadata

**Files:**
- Modify: `landing/src/content.config.ts`
- Create: `landing/src/data/guides.ts`

- [ ] **Step 1: Update content.config.ts to add `guides` collection**

```typescript
// landing/src/content.config.ts — full file
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

const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    icon: z.string(),
    order: z.number(),
    relatedCommands: z.array(z.string()).optional(),
  }),
});

export const collections = { commands, guides };
```

- [ ] **Step 2: Create guide metadata file**

```typescript
// landing/src/data/guides.ts — full file
export interface GuideMeta {
  slug: string;
  label: string;
  color: string;
  bg: string;
}

export const guideMeta: Record<string, GuideMeta> = {
  economy: { slug: "economy", label: "Economy", color: "#F1C40F", bg: "rgba(241,196,15,0.15)" },
  xp: { slug: "xp", label: "XP & Leveling", color: "#9B59B6", bg: "rgba(155,89,182,0.15)" },
  voice: { slug: "voice", label: "Voice Channels", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  confessions: { slug: "confessions", label: "Confessions", color: "#E67E22", bg: "rgba(230,126,34,0.15)" },
  moderation: { slug: "moderation", label: "Moderation", color: "#C0392B", bg: "rgba(192,57,43,0.15)" },
};
```

- [ ] **Step 3: Verify build passes**

Run from `landing/`:
```bash
cd landing && npx astro build
```
Expected: Build succeeds (no guide content yet, collection is empty but valid).

- [ ] **Step 4: Commit**

```bash
git add landing/src/content.config.ts landing/src/data/guides.ts
git commit -m "feat(landing): add guides content collection and metadata"
```

---

## Task 2: Update Navbar and LanguageSwitcher

**Files:**
- Modify: `landing/src/components/Navbar.astro`
- Modify: `landing/src/components/LanguageSwitcher.astro`

- [ ] **Step 1: Add "Guide" link to Navbar**

In `landing/src/components/Navbar.astro`, replace the `navLinks` array (lines 2-10):

```typescript
const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/commands", label: "Commands" },
  { href: "/guide", label: "Guide" },
  { href: "/#faq", label: "FAQ" },
  {
    href: "https://github.com/3Tea/discord-bot/discussions",
    label: "Support",
    external: true,
  },
];
```

- [ ] **Step 2: Add `basePath` prop to LanguageSwitcher**

Replace the full content of `landing/src/components/LanguageSwitcher.astro`:

```astro
---
interface Props {
  currentLang: string;
  slug: string;
  basePath?: string;
}

const { currentLang, slug, basePath = "commands" } = Astro.props;

const languages = [
  { code: "en", label: "EN" },
  { code: "vi", label: "VI" },
];
---

<div class="lang-switcher">
  {languages.map((lang) => (
    <a
      href={`/${lang.code}/${basePath}/${slug}`}
      class:list={["lang-btn", { active: currentLang === lang.code }]}
      aria-label={`Switch to ${lang.label}`}
    >
      {lang.label}
    </a>
  ))}
</div>
```

- [ ] **Step 3: Verify existing command pages still work**

Run from `landing/`:
```bash
cd landing && npx astro build
```
Expected: Build succeeds. The command guide pages still render correctly because `basePath` defaults to `"commands"`, matching the existing behavior.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/Navbar.astro landing/src/components/LanguageSwitcher.astro
git commit -m "feat(landing): add Guide nav link and generalize LanguageSwitcher basePath"
```

---

## Task 3: Create GuideCard component

**Files:**
- Create: `landing/src/components/GuideCard.astro`

- [ ] **Step 1: Create the GuideCard component**

```astro
---
// landing/src/components/GuideCard.astro
interface Props {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  bg: string;
}

const { title, description, icon, href, color, bg } = Astro.props;
---

<a class="guide-card" href={href} style={`--card-color: ${color}`}>
  <div class="guide-card-icon" style={`background: ${bg}; color: ${color}`}>
    {icon}
  </div>
  <h2 class="guide-card-title">{title}</h2>
  <p class="guide-card-desc">{description}</p>
  <span class="guide-card-link">Read guide →</span>
</a>

<style>
  .guide-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 24px;
    box-shadow: var(--shadow-card);
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
  }

  .guide-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-card-hover);
    border-color: var(--card-color, var(--accent));
  }

  .guide-card-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .guide-card-title {
    font-family: var(--font-display);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }

  .guide-card-desc {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
    flex: 1;
    margin-bottom: 12px;
  }

  .guide-card-link {
    color: var(--card-color, var(--accent));
    font-size: 13px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .guide-card:hover .guide-card-link {
    opacity: 1;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/GuideCard.astro
git commit -m "feat(landing): add GuideCard component"
```

---

## Task 4: Create GuideToc component

**Files:**
- Create: `landing/src/components/GuideToc.astro`

- [ ] **Step 1: Create the table of contents component**

This component renders a sidebar ToC from headings passed as props. Client-side JS handles scroll tracking via Intersection Observer.

```astro
---
// landing/src/components/GuideToc.astro
interface Props {
  headings: Array<{ depth: number; slug: string; text: string }>;
}

const { headings } = Astro.props;
const tocItems = headings.filter((h) => h.depth === 2);
---

{tocItems.length > 0 && (
  <>
    {/* Mobile: collapsible ToC */}
    <details class="toc-mobile">
      <summary class="toc-mobile-toggle">On this page</summary>
      <nav class="toc-mobile-nav">
        {tocItems.map((item) => (
          <a href={`#${item.slug}`} class="toc-link">{item.text}</a>
        ))}
      </nav>
    </details>

    {/* Desktop: sticky sidebar */}
    <aside class="toc-sidebar">
      <p class="toc-label">On this page</p>
      <nav class="toc-nav">
        {tocItems.map((item) => (
          <a href={`#${item.slug}`} class="toc-link" data-heading={item.slug}>
            {item.text}
          </a>
        ))}
      </nav>
    </aside>
  </>
)}

<style>
  .toc-sidebar {
    display: none;
  }

  .toc-mobile {
    margin-bottom: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .toc-mobile-toggle {
    padding: 12px 16px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }

  .toc-mobile-toggle::marker,
  .toc-mobile-toggle::-webkit-details-marker {
    display: none;
  }

  .toc-mobile-toggle::after {
    content: " ▸";
    font-size: 11px;
  }

  .toc-mobile[open] .toc-mobile-toggle::after {
    content: " ▾";
  }

  .toc-mobile-nav {
    display: flex;
    flex-direction: column;
    padding: 0 16px 12px;
    gap: 2px;
  }

  .toc-label {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }

  .toc-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toc-link {
    color: var(--text-muted);
    font-size: 13px;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    border-left: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    text-decoration: none;
    line-height: 1.4;
  }

  .toc-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.04);
  }

  .toc-link.active {
    color: var(--accent);
    border-left-color: var(--accent);
    background: var(--accent-soft);
  }

  @media (min-width: 1080px) {
    .toc-mobile {
      display: none;
    }

    .toc-sidebar {
      display: block;
      width: 220px;
      flex-shrink: 0;
      position: sticky;
      top: 88px;
      height: fit-content;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
    }
  }
</style>

<script>
  const links = document.querySelectorAll<HTMLAnchorElement>(".toc-sidebar .toc-link[data-heading]");
  if (links.length > 0) {
    const headingEls = Array.from(links).map((link) =>
      document.getElementById(link.dataset.heading!)
    ).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            const active = document.querySelector(
              `.toc-sidebar .toc-link[data-heading="${entry.target.id}"]`
            );
            active?.classList.add("active");
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headingEls.forEach((el) => observer.observe(el));
  }
</script>
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/GuideToc.astro
git commit -m "feat(landing): add GuideToc component with scroll tracking"
```

---

## Task 5: Create RelatedGuides component

**Files:**
- Create: `landing/src/components/RelatedGuides.astro`

- [ ] **Step 1: Create the related guides component**

```astro
---
// landing/src/components/RelatedGuides.astro
import { guideMeta } from "../data/guides";

interface Props {
  currentSlug: string;
  lang: string;
}

const { currentSlug, lang } = Astro.props;

const allGuides = Object.values(guideMeta).filter((g) => g.slug !== currentSlug).slice(0, 2);
---

{allGuides.length > 0 && (
  <div class="related-section">
    <h2 class="related-title">Related Guides</h2>
    <div class="related-grid">
      {allGuides.map((guide) => (
        <a href={`/${lang}/guide/${guide.slug}`} class="related-card">
          <div class="related-card-name">
            <span style={`color: ${guide.color}`}>●</span> {guide.label}
          </div>
        </a>
      ))}
    </div>
  </div>
)}
```

Note: This component reuses the `.related-section`, `.related-grid`, `.related-card`, `.related-card-name` CSS classes already defined in `global.css`.

- [ ] **Step 2: Commit**

```bash
git add landing/src/components/RelatedGuides.astro
git commit -m "feat(landing): add RelatedGuides component"
```

---

## Task 6: Create guide index page

**Files:**
- Create: `landing/src/pages/guide.astro`

- [ ] **Step 1: Create the index page**

```astro
---
// landing/src/pages/guide.astro
import BaseLayout from "../layouts/BaseLayout.astro";
import GuideCard from "../components/GuideCard.astro";
import { getCollection } from "astro:content";
import { guideMeta } from "../data/guides";

const allGuides = await getCollection("guides");
const enGuides = allGuides
  .filter((g) => g.id.startsWith("en/"))
  .sort((a, b) => a.data.order - b.data.order);
---

<BaseLayout title="User Guide | 3AT - Endless Paradox" description="Learn how to use 3AT's economy, XP, voice, confession, and moderation systems.">
  <div class="container guide-index">
    <div class="guide-index-hero">
      <p class="section-label">User Guide</p>
      <h1 class="section-title">Everything you need to know about 3AT</h1>
      <p class="section-subtitle">
        Guides for every system — whether you're a member looking to earn coins or an admin setting up your server.
      </p>
    </div>

    <div class="guide-grid">
      {enGuides.map((guide) => {
        const meta = guideMeta[guide.data.slug];
        return (
          <GuideCard
            title={guide.data.title}
            description={guide.data.description}
            icon={guide.data.icon}
            href={`/en/guide/${guide.data.slug}`}
            color={meta?.color ?? "#5865F2"}
            bg={meta?.bg ?? "rgba(88,101,242,0.15)"}
          />
        );
      })}
    </div>
  </div>
</BaseLayout>

<style>
  .guide-index {
    padding-top: 32px;
    padding-bottom: 64px;
  }

  .guide-index-hero {
    text-align: center;
    margin-bottom: 40px;
  }

  .guide-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 900px) {
    .guide-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 560px) {
    .guide-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/pages/guide.astro
git commit -m "feat(landing): add guide index page"
```

---

## Task 7: Create dynamic guide page

**Files:**
- Create: `landing/src/pages/[lang]/guide/[...slug].astro`

- [ ] **Step 1: Create the dynamic guide page**

```astro
---
// landing/src/pages/[lang]/guide/[...slug].astro
import { getCollection, render } from "astro:content";
import BaseLayout from "../../../layouts/BaseLayout.astro";
import Breadcrumb from "../../../components/Breadcrumb.astro";
import LanguageSwitcher from "../../../components/LanguageSwitcher.astro";
import GuideToc from "../../../components/GuideToc.astro";
import RelatedGuides from "../../../components/RelatedGuides.astro";
import RelatedCommands from "../../../components/RelatedCommands.astro";
import { guideMeta } from "../../../data/guides";

export async function getStaticPaths() {
  const pages = await getCollection("guides");

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
const { Content, headings } = await render(page);

const meta = guideMeta[page.data.slug];
const pageTitle = `${page.data.title} — User Guide | 3AT Bot`;
const altLang = lang === "en" ? "vi" : "en";
const hreflang = [
  { lang: "en", href: `/en/guide/${slug}` },
  { lang: "vi", href: `/vi/guide/${slug}` },
];

const breadcrumbItems = [
  { label: "Guide", href: "/guide" },
  { label: page.data.title },
];

const allPages = await getCollection("guides");
const altExists = allPages.some((p) => p.id === `${altLang}/${slug}`);
const showTranslationNotice = lang === "vi" && !altExists;
---

<BaseLayout title={pageTitle} description={page.data.description} hreflang={hreflang}>
  <div class="container guide-page-wrapper">
    <div class="guide-page-main">
      <Breadcrumb items={breadcrumbItems} />

      <div class="guide-header">
        <div class="guide-header-top">
          <div class="guide-title-group">
            <span class="guide-icon">{page.data.icon}</span>
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
          <LanguageSwitcher currentLang={lang!} slug={slug!} basePath="guide" />
        </div>
        <p class="guide-description">{page.data.description}</p>
      </div>

      {showTranslationNotice && (
        <div class="translation-notice">
          Bản dịch đang được cập nhật. Nội dung hiện tại hiển thị bằng tiếng Anh.
        </div>
      )}

      <GuideToc headings={headings} />

      <div class="guide-prose">
        <Content />
      </div>

      <a href="/guide" class="guide-back-link">← Back to Guide</a>

      {page.data.relatedCommands && page.data.relatedCommands.length > 0 && (
        <div class="related-section">
          <h2 class="related-title">Related Commands</h2>
          <div class="related-grid">
            {page.data.relatedCommands.map((cmd: string) => (
              <a href={`/${lang}/commands/${cmd}`} class="related-card">
                <div class="related-card-name">
                  <span style={`color: var(--accent)`}>/</span> {cmd}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <RelatedGuides currentSlug={page.data.slug} lang={lang!} />
    </div>

    <GuideToc headings={headings} />
  </div>
</BaseLayout>

<style>
  .guide-page-wrapper {
    display: flex;
    gap: 32px;
    padding-top: 32px;
    padding-bottom: 64px;
    max-width: 1100px;
  }

  .guide-page-main {
    flex: 1;
    min-width: 0;
    max-width: 820px;
  }

  .guide-icon {
    font-size: 1.5rem;
  }

  /* Hide the inline GuideToc on desktop (the sidebar one is shown) */
  .guide-page-main > :global(.toc-sidebar) {
    display: none;
  }

  /* Hide the wrapper-level GuideToc on mobile (the inline one is shown) */
  .guide-page-wrapper > :global(.toc-sidebar) {
    display: none;
  }

  @media (min-width: 1080px) {
    .guide-page-wrapper > :global(.toc-sidebar) {
      display: block;
    }

    .guide-page-main > :global(.toc-mobile) {
      display: none;
    }
  }

  @media (max-width: 1079px) {
    .guide-page-wrapper {
      flex-direction: column;
    }
  }
</style>
```

Note: GuideToc is rendered twice — once inside `.guide-page-main` (renders the mobile collapsible version) and once as a sibling (renders the desktop sticky sidebar). CSS controls which one is visible. The component itself handles both layouts.

- [ ] **Step 2: Verify build passes (no content yet, so no pages generated)**

```bash
cd landing && npx astro build
```
Expected: Build succeeds. No guide pages generated yet (empty collection content).

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/guide.astro landing/src/pages/[lang]/guide/[...slug].astro
git commit -m "feat(landing): add guide index and dynamic guide pages"
```

---

## Task 8: Write English Economy guide

**Files:**
- Create: `landing/src/content/guides/en/economy.md`

- [ ] **Step 1: Create the economy guide**

```markdown
---
title: Economy System
slug: economy
description: Learn how to earn coins and gems, build pray streaks, and spend in the shop.
icon: "💰"
order: 1
relatedCommands: ["balance", "pray", "curse", "shop", "economy"]
---

## Overview

3AT has a **dual-currency economy** in every server. **Coins** are your everyday currency — easy to earn, used to buy items in the shop. **Gems** are rare and valuable — earned through lucky prays and streak milestones.

Your balance is **per-server**, so each server you're in has its own economy.

## Checking Your Balance

Use `/balance` to see your current coins, gems, pray streak, and last activity. You can also check another user's balance with `/balance user:@someone`.

## Earning Coins: Pray

The main way to earn coins is the `/pray` command — a daily action you can use **once every 24 hours** (resets at UTC midnight).

| Pray Type | Coin Reward | Gem Chance |
|-----------|-------------|------------|
| Self pray (`/pray`) | 50–150 coins | None |
| Targeted pray (`/pray target:@user`) | 100–200 coins | 5% chance for 1 gem |

> **Tip:** Always pray for someone else when possible — the coin reward is higher and you have a chance to earn gems!

## Streak Bonuses

Praying on **consecutive days** builds a streak. Hit these milestones for bonus rewards:

| Streak | Bonus Coins | Bonus Gems |
|--------|-------------|------------|
| 3 days | +50 | — |
| 7 days | +150 | +1 |
| 14 days | +300 | +2 |
| 30 days | +500 | +5 |

> **Warning:** Missing a single day resets your streak to zero. Pray every day to keep it going!

## Earning Coins: Curse

`/curse` is a second daily action, **separate from pray** — you can do both every day.

| Curse Type | Coin Reward |
|------------|-------------|
| Self curse (`/curse`) | 20–80 coins |
| Targeted curse (`/curse target:@user`) | 40–100 coins |

Curse does not have streaks or gem rewards.

## The Shop

Each server can have its own shop with custom items. Browse with `/shop view` and purchase with `/shop buy`.

### Item Types

| Type | What You Get |
|------|-------------|
| Role | A Discord role is assigned to you |
| Cosmetic | Cosmetic items (server-specific) |
| Currency Exchange | Convert between currencies |

Items may have **limited stock** — once sold out, they're gone until the admin restocks.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/balance` | View your coin/gem balance and streak | `/balance` |
| `/balance user:@someone` | View another user's balance | `/balance user:@friend` |
| `/pray` | Daily pray for coins (self) | `/pray` |
| `/pray target:@user` | Daily pray for more coins + gem chance | `/pray target:@friend` |
| `/curse` | Daily curse for coins (self) | `/curse` |
| `/curse target:@user` | Daily curse for more coins | `/curse target:@rival` |
| `/shop view` | Browse available shop items | `/shop view` |
| `/shop buy` | Purchase an item from the shop | `/shop buy` |

## For Admins & Mods

> This section is for server administrators.

### Managing Currency

Use `/economy` to directly adjust any user's balance:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy set-coin` | Set a user's coin balance to an exact amount | `/economy set-coin user:@user amount:500` |
| `/economy add-coin` | Add (or subtract with negative) coins | `/economy add-coin user:@user amount:100` |
| `/economy set-gem` | Set a user's gem balance | `/economy set-gem user:@user amount:10` |
| `/economy add-gem` | Add (or subtract) gems | `/economy add-gem user:@user amount:5` |

All currency changes are logged in the transaction history.

### Managing the Shop

| Subcommand | Description |
|------------|-------------|
| `/shop add` | Add a new item to the server shop (name, price, type, optional stock limit) |
| `/shop remove` | Remove an item from the shop |

> **Tip:** Plan your shop items around your server's role hierarchy. Role items are popular rewards for active members!
```

- [ ] **Step 2: Verify build passes**

```bash
cd landing && npx astro build
```
Expected: Build succeeds. Guide pages for `/en/guide/economy` should be generated.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/economy.md
git commit -m "content(landing): add English economy guide"
```

---

## Task 9: Write English XP & Leveling guide

**Files:**
- Create: `landing/src/content/guides/en/xp.md`

- [ ] **Step 1: Create the XP guide**

```markdown
---
title: XP & Leveling
slug: xp
description: Understand how XP works, level up, and compete on leaderboards.
icon: "📊"
order: 2
relatedCommands: ["rank", "leaderboard", "server-rank", "xp"]
---

## Overview

Every message you send, every minute in voice chat, and every reaction you add earns you **XP**. As your XP grows, you **level up** — and your progress is tracked on both server and global leaderboards.

## How You Earn XP

| Source | XP Earned | Cooldown | Conditions |
|--------|-----------|----------|------------|
| Messages | 15–25 XP | 60 seconds | Min 3 characters, no duplicate messages |
| Voice chat | 5 XP per minute | Continuous | Must be in a channel with 2+ non-bot members, not server-deafened |
| Reactions | 3 XP | 30 seconds | Cannot earn from reacting to your own messages |

> **Tip:** Voice XP adds up fast — a 1-hour call with friends earns you 300 XP!

### Anti-Spam

The bot has built-in protections to keep XP earning fair:
- **Cooldown:** You can only earn message XP once every 60 seconds
- **Duplicate detection:** Sending the same message repeatedly won't earn XP
- **Minimum length:** Messages must be at least 3 characters long

## How Levels Work

The XP needed to reach each level follows a simple formula: **Level² × 50**.

| Level | Total XP Required |
|-------|------------------|
| 1 | 50 |
| 5 | 1,250 |
| 10 | 5,000 |
| 20 | 20,000 |
| 30 | 45,000 |
| 50 | 125,000 |

When you level up, the bot sends a notification in the channel where you were active.

## Your Rank Card

Use `/rank` to see your personalized rank card — a visual image showing:
- Your current **level** and **XP progress** bar
- **Server rank** (among all members in this server)
- **Global rank** (among all 3AT users across every server)
- Activity breakdown (messages, voice minutes, reactions)

You can also view someone else's card with `/rank user:@someone`.

## Leaderboards

Use `/leaderboard` to see who's on top. Three modes are available:

| Mode | Shows |
|------|-------|
| Server | Top members in this server |
| Global | Top users across all servers |
| Servers | Top servers ranked by total XP |

### Period Filters

Toggle the time period using the buttons below the leaderboard:

| Period | Shows XP earned during |
|--------|----------------------|
| All Time | Total accumulated XP |
| Daily | Today (UTC) |
| Weekly | This ISO week |
| Monthly | This month |
| Yearly | This year |

The leaderboard is paginated (10 per page) and auto-disables after 60 seconds of inactivity.

## Server Rank

Use `/server-rank` to see how this server stacks up globally — total XP, member count, activity breakdown, and ranking among all servers using 3AT.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/rank` | View your rank card | `/rank` |
| `/rank user:@someone` | View another user's rank card | `/rank user:@friend` |
| `/leaderboard` | Open the leaderboard | `/leaderboard` |
| `/server-rank` | View this server's global ranking | `/server-rank` |

## For Admins & Mods

> This section is for server administrators.

### Managing XP

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/xp set` | Set a user's XP to an exact amount | `/xp set user:@user amount:5000` |
| `/xp add` | Add XP to a user | `/xp add user:@user amount:500` |
| `/xp remove` | Remove XP from a user | `/xp remove user:@user amount:200` |

### Channel Blacklist

Prevent XP from being earned in specific channels (e.g., bot-spam channels):

| Subcommand | Description |
|------------|-------------|
| `/xp channel-blacklist add` | Disable XP earning in a channel |
| `/xp channel-blacklist remove` | Re-enable XP earning in a channel |

### XP Configuration

Server XP settings can be customized per guild. Default values:

| Setting | Default |
|---------|---------|
| XP per message | 20 |
| XP per voice minute | 5 |
| XP per reaction | 3 |
| Message cooldown | 60 seconds |
| Min message length | 3 characters |
| XP system enabled | Yes |
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/en/xp.md
git commit -m "content(landing): add English XP & Leveling guide"
```

---

## Task 10: Write English Voice Channels guide

**Files:**
- Create: `landing/src/content/guides/en/voice.md`

- [ ] **Step 1: Create the voice guide**

```markdown
---
title: Voice Channels
slug: voice
description: Create your own temporary voice channel and control who can join, see, and use it.
icon: "🎙️"
order: 3
relatedCommands: ["voice"]
---

## Overview

3AT lets you create **temporary voice channels** that you fully own and control. Join a trigger channel, get your own private room, and manage access with buttons or slash commands.

## Getting Started

### Step 1: Join the trigger channel

Look for a voice channel whose name starts with **"3AT "** (e.g., "3AT Join to Create"). When you join it, the bot instantly creates a personal voice channel for you.

### Step 2: You're the owner

Your new channel appears with a **"* "** prefix (e.g., "* Gaming Room"). You'll also see a **control panel** message with buttons for managing your room.

### Step 3: Customize and play

Rename your room, set a user limit, lock it down, or invite friends. When everyone leaves, the channel is automatically deleted.

## Control Panel

When your channel is created, a control panel with buttons appears. Here's what each button does:

| Button | Action | Cooldown |
|--------|--------|----------|
| 🔒 Lock | Prevent everyone from joining | 5s |
| 🔓 Unlock | Allow everyone to join again | 5s |
| 👁️ Hide | Make channel invisible to others | 5s |
| 👤 Permit | Allow a specific user to join (even when locked/hidden) | 5s |
| 🚫 Block | Block a user and disconnect them | 5s |
| 👢 Kick | Kick a user with option to also block | 5s |
| 🔄 Transfer | Transfer ownership to someone else | 5s |
| ✏️ Rename | Change your channel name (max 50 chars) | 120s |
| 🔢 Limit | Set maximum users (0–99, 0 = unlimited) | 120s |

> **Tip:** Permit overrides both Lock and Hide — permitted users can always join and see your channel.

## Slash Commands

You can also use `/voice` subcommands instead of the panel buttons:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/voice lock` | Lock your channel | `/voice lock` |
| `/voice unlock` | Unlock your channel | `/voice unlock` |
| `/voice hide` | Hide your channel | `/voice hide` |
| `/voice permit` | Allow a user | `/voice permit user:@friend` |
| `/voice block` | Block a user | `/voice block user:@troll` |
| `/voice kick` | Kick a user | `/voice kick user:@someone` |
| `/voice transfer` | Transfer ownership | `/voice transfer user:@friend` |
| `/voice name` | Rename channel | `/voice name text:Gaming Room` |
| `/voice limit` | Set user limit | `/voice limit number:5` |

## Things to Know

- **Ownership expires** after 12 hours of inactivity
- **Channels auto-delete** when empty (or only bots remain)
- You **cannot** target yourself for permit, block, kick, or transfer
- **Kick** shows a confirmation — you can choose "Kick only" or "Kick & Block"
- **Transfer** clears your permit and block lists — the new owner starts fresh
- Voice chat in your channel earns **Voice XP** (5 XP/min when 2+ humans are present)

## For Admins & Mods

> This section is for server administrators.

### Setting Up Trigger Channels

To enable temporary voice channels in your server:

1. Create a voice channel with a name starting with **"3AT "** (e.g., "3AT Join to Create")
2. That's it — when any member joins this channel, the bot will create a temporary room for them

You can create multiple trigger channels (e.g., one per category) if you'd like.

> **Tip:** Place the trigger channel at the top of a voice category so members find it easily.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/en/voice.md
git commit -m "content(landing): add English Voice Channels guide"
```

---

## Task 11: Write English Confessions guide

**Files:**
- Create: `landing/src/content/guides/en/confessions.md`

- [ ] **Step 1: Create the confessions guide**

```markdown
---
title: Confessions
slug: confessions
description: Post anonymous confessions, vote, reply, and use VIP features.
icon: "🎭"
order: 4
relatedCommands: ["confession"]
---

## Overview

The confession system lets server members post **anonymous messages** — nobody can see who wrote them (not even admins, unless review mode is on). Confessions are numbered, can be voted on, and replied to.

## Submitting a Confession

Use `/confession submit` to write your confession:

| Option | Required | Description |
|--------|----------|-------------|
| `text` | Yes | Your confession text (max 3,500 characters) |
| `image` | No | Attach an image to your confession |
| `tag` | No | Categorize your confession |
| `vip` | No | Make it a golden VIP confession (costs gems) |
| `skip_cooldown` | No | Skip the cooldown timer (costs coins) |

### Tags

Choose a tag to categorize your confession:

| Tag | Best for |
|-----|----------|
| Heartfelt | Serious, emotional content |
| Funny | Humor and jokes |
| Question | Asking the community something |
| Sharing | General stories and experiences |
| Other | Everything else |

## Instant vs. Review Mode

Your server admin chooses how confessions work:

| Mode | How It Works |
|------|-------------|
| **Instant** | Your confession is posted immediately to the public channel |
| **Review** | Your confession goes to a mod review channel first. Mods approve or reject it before it goes public |

In review mode, mods can see who submitted the confession — but the public post is always anonymous.

## VIP Confessions

Spend gems to make your confession stand out with a **golden embed**. VIP confessions are visually distinct and catch more attention.

## Skip Cooldown

There's a cooldown between confessions (set by your server admin, 1–120 minutes). If you don't want to wait, you can spend coins to skip it.

## Voting & Replies

Every published confession has **upvote** and **downvote** buttons. You can also **reply** to confessions — replies are also anonymous.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/confession submit` | Submit a new confession |

## For Admins & Mods

> This section is for server administrators and moderators.

### Setting Up Confessions

Use `/confession setup` to configure the system:

| Setting | Description |
|---------|-------------|
| Mode | `instant` (posts immediately) or `review` (requires mod approval) |
| Public channel | Where approved confessions are posted |
| Review channel | Where pending confessions go for review (review mode only) |
| Cooldown | Time between submissions per user (1–120 minutes) |

### Moderation Tools

| Command | Permission | Description |
|---------|-----------|-------------|
| `/confession ban` | Manage Messages | Ban a user from confessions (permanent or timed: 1h, 6h, 1d, 7d, 30d) |
| `/confession unban` | Manage Messages | Remove a confession ban |
| `/confession filter-add` | Manage Guild | Add a keyword to the blacklist (confessions containing it are blocked) |
| `/confession filter-remove` | Manage Guild | Remove a keyword from the blacklist |
| `/confession filter-list` | Manage Guild | View all blocked keywords |

### Review Mode Workflow

1. User submits confession → it appears in the **review channel** (author visible to mods)
2. Mod clicks **Approve** → confession is posted anonymously to the public channel
3. Mod clicks **Reject** → confession is deleted (currency refunded if applicable)

> **Tip:** Use keyword filters to automatically block confessions containing inappropriate terms. Filters are case-insensitive and match substrings.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/en/confessions.md
git commit -m "content(landing): add English Confessions guide"
```

---

## Task 12: Write English Moderation guide

**Files:**
- Create: `landing/src/content/guides/en/moderation.md`

- [ ] **Step 1: Create the moderation guide**

```markdown
---
title: Moderation
slug: moderation
description: Timeout, ban, kick, and unban members with proper permission checks.
icon: "🛡️"
order: 5
relatedCommands: ["moderation"]
---

## Overview

3AT provides moderation commands to help keep your server safe. All commands enforce **role hierarchy** — you can only moderate members whose highest role is below yours.

## Commands

| Subcommand | Description | Permission Required |
|------------|-------------|-------------------|
| `/moderation timeout` | Mute a member in text and voice | Moderate Members |
| `/moderation untimeout` | Remove a timeout | Moderate Members |
| `/moderation ban` | Ban a member from the server | Ban Members |
| `/moderation kick` | Kick a member from the server | Kick Members |
| `/moderation unban` | Unban a user by their ID | Ban Members |

## Timeout

Temporarily mute a member in both text and voice channels.

```
/moderation timeout user:@member duration:1h reason:Spam
```

| Duration Options |
|-----------------|
| 1 minute to 28 days |

The member is automatically unmuted when the timeout expires. Use `/moderation untimeout` to remove it early.

## Ban

Permanently remove a member from the server. Optionally delete their recent messages.

```
/moderation ban user:@member reason:Repeated violations
```

> **Tip:** Discord allows deleting up to 7 days of messages from a banned user.

## Kick

Remove a member from the server — they can rejoin with a new invite.

```
/moderation kick user:@member reason:Warning
```

## Unban

Lift a ban using the user's ID (snowflake). You need the numeric ID since banned users aren't in the server.

```
/moderation unban user_id:123456789012345678 reason:Appeal accepted
```

> **Tip:** Find user IDs by enabling Developer Mode in Discord settings, then right-clicking a user → Copy User ID.

## Safety Checks

Every moderation action goes through these checks:

| Check | Rule |
|-------|------|
| Self-target | You cannot moderate yourself |
| Bot target | You cannot moderate bots |
| Owner protection | The server owner cannot be moderated (except by themselves) |
| Role hierarchy | Your highest role must be above the target's highest role |
| Bot hierarchy | The bot's role must be above the target's role |
| Reason length | Truncated to 512 characters (Discord API limit) |

All actions are recorded in Discord's **audit log** with the reason you provide.

## Best Practices

- **Always provide a reason** — it shows in the audit log and helps your mod team understand decisions
- **Escalate gradually:** timeout → kick → ban. Give members a chance to correct behavior
- **Use timeout first** for minor offenses — it's temporary and less disruptive than a kick or ban
- **Document your rules** in a server rules channel so members know what to expect
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/en/moderation.md
git commit -m "content(landing): add English Moderation guide"
```

---

## Task 13: Write Vietnamese Economy guide

**Files:**
- Create: `landing/src/content/guides/vi/economy.md`

- [ ] **Step 1: Create the Vietnamese economy guide**

```markdown
---
title: Hệ Thống Kinh Tế
slug: economy
description: Tìm hiểu cách kiếm coin và gem, xây dựng chuỗi cầu nguyện, và mua sắm trong shop.
icon: "💰"
order: 1
relatedCommands: ["balance", "pray", "curse", "shop", "economy"]
---

## Tổng Quan

3AT có **hệ thống kinh tế kép** trong mỗi server. **Coin** là tiền tệ thông dụng — dễ kiếm, dùng để mua vật phẩm trong shop. **Gem** là loại tiền hiếm và giá trị — kiếm được qua cầu nguyện may mắn và các mốc streak.

Số dư của bạn là **riêng biệt theo server**, mỗi server bạn tham gia có kinh tế riêng.

## Xem Số Dư

Dùng `/balance` để xem số coin, gem, chuỗi cầu nguyện và hoạt động gần nhất. Bạn cũng có thể xem số dư của người khác với `/balance user:@ai_do`.

## Kiếm Coin: Cầu Nguyện

Cách chính để kiếm coin là lệnh `/pray` — hành động hàng ngày bạn có thể dùng **mỗi 24 giờ** (reset lúc nửa đêm UTC).

| Loại Cầu Nguyện | Thưởng Coin | Cơ Hội Gem |
|-----------------|-------------|------------|
| Tự cầu nguyện (`/pray`) | 50–150 coin | Không |
| Cầu nguyện cho người khác (`/pray target:@user`) | 100–200 coin | 5% cơ hội nhận 1 gem |

> **Mẹo:** Luôn cầu nguyện cho người khác khi có thể — thưởng coin cao hơn và có cơ hội nhận gem!

## Thưởng Streak

Cầu nguyện vào **các ngày liên tiếp** sẽ xây dựng streak. Đạt các mốc sau để nhận thưởng:

| Streak | Thưởng Coin | Thưởng Gem |
|--------|-------------|------------|
| 3 ngày | +50 | — |
| 7 ngày | +150 | +1 |
| 14 ngày | +300 | +2 |
| 30 ngày | +500 | +5 |

> **Lưu ý:** Bỏ lỡ một ngày sẽ reset streak về 0. Hãy cầu nguyện mỗi ngày!

## Kiếm Coin: Nguyền Rủa

`/curse` là hành động hàng ngày thứ hai, **tách biệt với pray** — bạn có thể dùng cả hai mỗi ngày.

| Loại Nguyền Rủa | Thưởng Coin |
|-----------------|-------------|
| Tự nguyền rủa (`/curse`) | 20–80 coin |
| Nguyền rủa người khác (`/curse target:@user`) | 40–100 coin |

Curse không có streak hay thưởng gem.

## Shop

Mỗi server có shop riêng với các vật phẩm tùy chỉnh. Xem với `/shop view` và mua với `/shop buy`.

### Loại Vật Phẩm

| Loại | Bạn Nhận Được |
|------|--------------|
| Role | Một role Discord được gán cho bạn |
| Cosmetic | Vật phẩm trang trí (theo server) |
| Currency Exchange | Đổi giữa các loại tiền |

Vật phẩm có thể có **số lượng giới hạn** — hết hàng thì phải đợi admin bổ sung.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/balance` | Xem số dư coin/gem và streak | `/balance` |
| `/balance user:@ai_do` | Xem số dư người khác | `/balance user:@friend` |
| `/pray` | Cầu nguyện hàng ngày (tự thân) | `/pray` |
| `/pray target:@user` | Cầu nguyện cho người khác | `/pray target:@friend` |
| `/curse` | Nguyền rủa hàng ngày (tự thân) | `/curse` |
| `/curse target:@user` | Nguyền rủa người khác | `/curse target:@rival` |
| `/shop view` | Xem các vật phẩm trong shop | `/shop view` |
| `/shop buy` | Mua vật phẩm từ shop | `/shop buy` |

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Quản Lý Tiền Tệ

Dùng `/economy` để điều chỉnh số dư của bất kỳ người dùng nào:

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/economy set-coin` | Đặt số coin chính xác | `/economy set-coin user:@user amount:500` |
| `/economy add-coin` | Thêm (hoặc trừ) coin | `/economy add-coin user:@user amount:100` |
| `/economy set-gem` | Đặt số gem chính xác | `/economy set-gem user:@user amount:10` |
| `/economy add-gem` | Thêm (hoặc trừ) gem | `/economy add-gem user:@user amount:5` |

Mọi thay đổi tiền tệ đều được ghi lại trong lịch sử giao dịch.

### Quản Lý Shop

| Lệnh Con | Mô Tả |
|----------|--------|
| `/shop add` | Thêm vật phẩm mới vào shop (tên, giá, loại, giới hạn số lượng) |
| `/shop remove` | Xóa vật phẩm khỏi shop |

> **Mẹo:** Lên kế hoạch cho các vật phẩm shop phù hợp với hệ thống role của server. Vật phẩm role là phần thưởng phổ biến cho thành viên tích cực!
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/economy.md
git commit -m "content(landing): add Vietnamese Economy guide"
```

---

## Task 14: Write Vietnamese XP guide

**Files:**
- Create: `landing/src/content/guides/vi/xp.md`

- [ ] **Step 1: Create the Vietnamese XP guide**

```markdown
---
title: XP & Cấp Độ
slug: xp
description: Tìm hiểu cách hoạt động của XP, lên cấp và cạnh tranh trên bảng xếp hạng.
icon: "📊"
order: 2
relatedCommands: ["rank", "leaderboard", "server-rank", "xp"]
---

## Tổng Quan

Mỗi tin nhắn bạn gửi, mỗi phút trong voice chat, và mỗi reaction bạn thêm đều kiếm được **XP**. Khi XP tăng, bạn sẽ **lên cấp** — và tiến trình được theo dõi trên cả bảng xếp hạng server và toàn cầu.

## Cách Kiếm XP

| Nguồn | XP Kiếm Được | Cooldown | Điều Kiện |
|-------|-------------|----------|-----------|
| Tin nhắn | 15–25 XP | 60 giây | Tối thiểu 3 ký tự, không trùng lặp |
| Voice chat | 5 XP mỗi phút | Liên tục | Cần 2+ thành viên (không tính bot), không bị server deaf |
| Reaction | 3 XP | 30 giây | Không kiếm từ reaction tin nhắn của chính mình |

> **Mẹo:** XP voice tích lũy nhanh — 1 giờ gọi thoại cùng bạn bè kiếm được 300 XP!

### Chống Spam

Bot có hệ thống bảo vệ để đảm bảo kiếm XP công bằng:
- **Cooldown:** Chỉ kiếm XP tin nhắn mỗi 60 giây một lần
- **Phát hiện trùng lặp:** Gửi cùng một tin nhắn liên tục sẽ không kiếm XP
- **Độ dài tối thiểu:** Tin nhắn phải có ít nhất 3 ký tự

## Cách Hoạt Động Của Cấp Độ

XP cần để đạt mỗi cấp theo công thức: **Cấp² × 50**.

| Cấp Độ | Tổng XP Cần |
|---------|-------------|
| 1 | 50 |
| 5 | 1.250 |
| 10 | 5.000 |
| 20 | 20.000 |
| 30 | 45.000 |
| 50 | 125.000 |

Khi bạn lên cấp, bot sẽ gửi thông báo trong kênh bạn đang hoạt động.

## Thẻ Xếp Hạng

Dùng `/rank` để xem thẻ xếp hạng cá nhân — hình ảnh hiển thị:
- **Cấp độ** hiện tại và thanh **tiến trình XP**
- **Xếp hạng server** (trong tất cả thành viên server)
- **Xếp hạng toàn cầu** (trong tất cả người dùng 3AT)
- Phân tích hoạt động (tin nhắn, phút voice, reaction)

Xem thẻ của người khác với `/rank user:@ai_do`.

## Bảng Xếp Hạng

Dùng `/leaderboard` để xem ai đứng đầu. Ba chế độ:

| Chế Độ | Hiển Thị |
|--------|----------|
| Server | Top thành viên trong server này |
| Global | Top người dùng trên tất cả server |
| Servers | Top server xếp theo tổng XP |

### Bộ Lọc Thời Gian

Chuyển đổi khoảng thời gian bằng các nút bên dưới bảng xếp hạng:

| Khoảng Thời Gian | Hiển Thị XP Kiếm Được |
|-------------------|----------------------|
| All Time | Tổng XP tích lũy |
| Daily | Hôm nay (UTC) |
| Weekly | Tuần ISO này |
| Monthly | Tháng này |
| Yearly | Năm nay |

Bảng xếp hạng phân trang (10 mỗi trang) và tự tắt sau 60 giây không hoạt động.

## Xếp Hạng Server

Dùng `/server-rank` để xem server này đứng ở vị trí nào — tổng XP, số thành viên, phân tích hoạt động, và xếp hạng giữa tất cả server sử dụng 3AT.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/rank` | Xem thẻ xếp hạng | `/rank` |
| `/rank user:@ai_do` | Xem thẻ xếp hạng người khác | `/rank user:@friend` |
| `/leaderboard` | Mở bảng xếp hạng | `/leaderboard` |
| `/server-rank` | Xem xếp hạng toàn cầu của server | `/server-rank` |

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Quản Lý XP

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/xp set` | Đặt XP chính xác | `/xp set user:@user amount:5000` |
| `/xp add` | Thêm XP cho người dùng | `/xp add user:@user amount:500` |
| `/xp remove` | Trừ XP của người dùng | `/xp remove user:@user amount:200` |

### Danh Sách Kênh Đen

Ngăn kiếm XP trong các kênh cụ thể (ví dụ: kênh bot-spam):

| Lệnh Con | Mô Tả |
|----------|--------|
| `/xp channel-blacklist add` | Tắt kiếm XP trong kênh |
| `/xp channel-blacklist remove` | Bật lại kiếm XP trong kênh |

### Cấu Hình XP

Cài đặt XP có thể tùy chỉnh theo server. Giá trị mặc định:

| Cài Đặt | Mặc Định |
|---------|----------|
| XP mỗi tin nhắn | 20 |
| XP mỗi phút voice | 5 |
| XP mỗi reaction | 3 |
| Cooldown tin nhắn | 60 giây |
| Độ dài tin nhắn tối thiểu | 3 ký tự |
| Hệ thống XP bật | Có |
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/xp.md
git commit -m "content(landing): add Vietnamese XP guide"
```

---

## Task 15: Write Vietnamese Voice guide

**Files:**
- Create: `landing/src/content/guides/vi/voice.md`

- [ ] **Step 1: Create the Vietnamese voice guide**

```markdown
---
title: Kênh Thoại
slug: voice
description: Tạo kênh thoại tạm thời của riêng bạn và kiểm soát ai có thể tham gia, xem và sử dụng.
icon: "🎙️"
order: 3
relatedCommands: ["voice"]
---

## Tổng Quan

3AT cho phép bạn tạo **kênh thoại tạm thời** mà bạn hoàn toàn sở hữu và kiểm soát. Tham gia kênh kích hoạt, nhận phòng riêng và quản lý quyền truy cập bằng nút hoặc lệnh slash.

## Bắt Đầu

### Bước 1: Tham gia kênh kích hoạt

Tìm kênh thoại có tên bắt đầu bằng **"3AT "** (ví dụ: "3AT Tham Gia Để Tạo"). Khi bạn vào, bot sẽ tạo ngay một kênh thoại cá nhân cho bạn.

### Bước 2: Bạn là chủ sở hữu

Kênh mới xuất hiện với tiền tố **"* "** (ví dụ: "* Phòng Chơi Game"). Bạn cũng sẽ thấy **bảng điều khiển** với các nút quản lý phòng.

### Bước 3: Tùy chỉnh và sử dụng

Đổi tên phòng, đặt giới hạn người dùng, khóa phòng hoặc mời bạn bè. Khi mọi người rời đi, kênh sẽ tự động bị xóa.

## Bảng Điều Khiển

Khi kênh được tạo, bảng điều khiển với các nút sẽ xuất hiện:

| Nút | Hành Động | Cooldown |
|-----|-----------|----------|
| 🔒 Khóa | Ngăn mọi người tham gia | 5 giây |
| 🔓 Mở Khóa | Cho phép mọi người tham gia lại | 5 giây |
| 👁️ Ẩn | Ẩn kênh khỏi người khác | 5 giây |
| 👤 Cho Phép | Cho phép một người cụ thể tham gia (kể cả khi khóa/ẩn) | 5 giây |
| 🚫 Chặn | Chặn người dùng và ngắt kết nối | 5 giây |
| 👢 Đuổi | Đuổi người dùng với tùy chọn chặn luôn | 5 giây |
| 🔄 Chuyển | Chuyển quyền sở hữu cho người khác | 5 giây |
| ✏️ Đổi Tên | Đổi tên kênh (tối đa 50 ký tự) | 120 giây |
| 🔢 Giới Hạn | Đặt số người tối đa (0–99, 0 = không giới hạn) | 120 giây |

> **Mẹo:** Cho Phép vượt qua cả Khóa và Ẩn — người được cho phép luôn có thể tham gia và nhìn thấy kênh.

## Lệnh Slash

Bạn cũng có thể dùng các lệnh con `/voice` thay vì nút trên bảng:

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/voice lock` | Khóa kênh | `/voice lock` |
| `/voice unlock` | Mở khóa kênh | `/voice unlock` |
| `/voice hide` | Ẩn kênh | `/voice hide` |
| `/voice permit` | Cho phép người dùng | `/voice permit user:@friend` |
| `/voice block` | Chặn người dùng | `/voice block user:@troll` |
| `/voice kick` | Đuổi người dùng | `/voice kick user:@someone` |
| `/voice transfer` | Chuyển quyền sở hữu | `/voice transfer user:@friend` |
| `/voice name` | Đổi tên kênh | `/voice name text:Phòng Game` |
| `/voice limit` | Đặt giới hạn người dùng | `/voice limit number:5` |

## Lưu Ý

- **Quyền sở hữu hết hạn** sau 12 giờ không hoạt động
- **Kênh tự xóa** khi trống (hoặc chỉ còn bot)
- Bạn **không thể** tự permit, block, kick hoặc transfer cho chính mình
- **Kick** hiện xác nhận — bạn có thể chọn "Chỉ đuổi" hoặc "Đuổi và Chặn"
- **Transfer** xóa danh sách permit và block — chủ mới bắt đầu từ đầu
- Chat thoại trong kênh kiếm **Voice XP** (5 XP/phút khi có 2+ người)

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Thiết Lập Kênh Kích Hoạt

Để bật kênh thoại tạm thời trong server:

1. Tạo kênh thoại với tên bắt đầu bằng **"3AT "** (ví dụ: "3AT Tham Gia Để Tạo")
2. Vậy là xong — khi bất kỳ thành viên nào vào kênh này, bot sẽ tạo phòng tạm cho họ

Bạn có thể tạo nhiều kênh kích hoạt (ví dụ: mỗi danh mục một cái) nếu muốn.

> **Mẹo:** Đặt kênh kích hoạt ở đầu danh mục voice để thành viên dễ tìm.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/voice.md
git commit -m "content(landing): add Vietnamese Voice guide"
```

---

## Task 16: Write Vietnamese Confessions guide

**Files:**
- Create: `landing/src/content/guides/vi/confessions.md`

- [ ] **Step 1: Create the Vietnamese confessions guide**

```markdown
---
title: Confession
slug: confessions
description: Đăng confession ẩn danh, bình chọn, trả lời và sử dụng tính năng VIP.
icon: "🎭"
order: 4
relatedCommands: ["confession"]
---

## Tổng Quan

Hệ thống confession cho phép thành viên đăng **tin nhắn ẩn danh** — không ai có thể thấy ai viết (kể cả admin, trừ khi bật chế độ review). Confession được đánh số, có thể bình chọn và trả lời.

## Gửi Confession

Dùng `/confession submit` để viết confession:

| Tùy Chọn | Bắt Buộc | Mô Tả |
|----------|----------|--------|
| `text` | Có | Nội dung confession (tối đa 3.500 ký tự) |
| `image` | Không | Đính kèm hình ảnh |
| `tag` | Không | Phân loại confession |
| `vip` | Không | Confession VIP dạng vàng (tốn gem) |
| `skip_cooldown` | Không | Bỏ qua thời gian chờ (tốn coin) |

### Tags

Chọn tag để phân loại confession:

| Tag | Phù Hợp Cho |
|-----|------------|
| Heartfelt | Nội dung nghiêm túc, cảm xúc |
| Funny | Hài hước, vui vẻ |
| Question | Hỏi cộng đồng |
| Sharing | Chia sẻ câu chuyện, trải nghiệm |
| Other | Mọi thứ khác |

## Chế Độ Instant vs. Review

Admin server chọn cách confession hoạt động:

| Chế Độ | Cách Hoạt Động |
|--------|---------------|
| **Instant** | Confession được đăng ngay lập tức lên kênh công khai |
| **Review** | Confession đến kênh review cho mod trước. Mod duyệt hoặc từ chối trước khi công khai |

Ở chế độ review, mod có thể thấy ai gửi confession — nhưng bài đăng công khai luôn ẩn danh.

## Confession VIP

Dùng gem để confession nổi bật với **embed màu vàng**. Confession VIP khác biệt về mặt hình ảnh và thu hút sự chú ý hơn.

## Bỏ Qua Cooldown

Có thời gian chờ giữa các confession (admin đặt, 1–120 phút). Nếu không muốn đợi, bạn có thể dùng coin để bỏ qua.

## Bình Chọn & Trả Lời

Mỗi confession đã đăng có nút **upvote** và **downvote**. Bạn cũng có thể **trả lời** confession — phản hồi cũng ẩn danh.

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/confession submit` | Gửi confession mới |

## Dành Cho Admin

> Phần này dành cho quản trị viên và moderator.

### Thiết Lập Confession

Dùng `/confession setup` để cấu hình hệ thống:

| Cài Đặt | Mô Tả |
|---------|--------|
| Mode | `instant` (đăng ngay) hoặc `review` (cần mod duyệt) |
| Public channel | Nơi confession được đăng công khai |
| Review channel | Nơi confession chờ duyệt (chỉ chế độ review) |
| Cooldown | Thời gian chờ giữa các lần gửi (1–120 phút) |

### Công Cụ Quản Lý

| Lệnh | Quyền | Mô Tả |
|-------|-------|--------|
| `/confession ban` | Manage Messages | Cấm người dùng gửi confession (vĩnh viễn hoặc tạm thời: 1h, 6h, 1d, 7d, 30d) |
| `/confession unban` | Manage Messages | Gỡ lệnh cấm confession |
| `/confession filter-add` | Manage Guild | Thêm từ khóa vào danh sách đen |
| `/confession filter-remove` | Manage Guild | Xóa từ khóa khỏi danh sách đen |
| `/confession filter-list` | Manage Guild | Xem tất cả từ khóa bị chặn |

### Quy Trình Review

1. Người dùng gửi confession → xuất hiện trong **kênh review** (hiển thị tác giả cho mod)
2. Mod bấm **Approve** → confession được đăng ẩn danh lên kênh công khai
3. Mod bấm **Reject** → confession bị xóa (hoàn tiền nếu có)

> **Mẹo:** Dùng bộ lọc từ khóa để tự động chặn confession chứa nội dung không phù hợp. Bộ lọc không phân biệt hoa thường và khớp chuỗi con.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/confessions.md
git commit -m "content(landing): add Vietnamese Confessions guide"
```

---

## Task 17: Write Vietnamese Moderation guide

**Files:**
- Create: `landing/src/content/guides/vi/moderation.md`

- [ ] **Step 1: Create the Vietnamese moderation guide**

```markdown
---
title: Quản Lý Server
slug: moderation
description: Timeout, ban, kick và unban thành viên với kiểm tra quyền hạn đầy đủ.
icon: "🛡️"
order: 5
relatedCommands: ["moderation"]
---

## Tổng Quan

3AT cung cấp các lệnh quản lý để giúp giữ server an toàn. Tất cả lệnh tuân thủ **thứ bậc role** — bạn chỉ có thể quản lý thành viên có role cao nhất thấp hơn role của bạn.

## Các Lệnh

| Lệnh Con | Mô Tả | Quyền Cần |
|----------|--------|-----------|
| `/moderation timeout` | Tắt tiếng thành viên trong text và voice | Moderate Members |
| `/moderation untimeout` | Gỡ timeout | Moderate Members |
| `/moderation ban` | Cấm thành viên khỏi server | Ban Members |
| `/moderation kick` | Đuổi thành viên khỏi server | Kick Members |
| `/moderation unban` | Gỡ cấm bằng ID người dùng | Ban Members |

## Timeout

Tạm thời tắt tiếng thành viên trong cả kênh text và voice.

```
/moderation timeout user:@member duration:1h reason:Spam
```

| Tùy Chọn Thời Gian |
|-------------------|
| 1 phút đến 28 ngày |

Thành viên tự động được gỡ timeout khi hết hạn. Dùng `/moderation untimeout` để gỡ sớm.

## Ban

Xóa vĩnh viễn thành viên khỏi server. Tùy chọn xóa tin nhắn gần đây.

```
/moderation ban user:@member reason:Vi phạm nhiều lần
```

> **Mẹo:** Discord cho phép xóa tối đa 7 ngày tin nhắn của người bị ban.

## Kick

Đuổi thành viên khỏi server — họ có thể quay lại với lời mời mới.

```
/moderation kick user:@member reason:Cảnh cáo
```

## Unban

Gỡ lệnh ban bằng ID người dùng (snowflake). Bạn cần ID số vì người bị ban không còn trong server.

```
/moderation unban user_id:123456789012345678 reason:Chấp nhận kháng cáo
```

> **Mẹo:** Tìm ID người dùng bằng cách bật Developer Mode trong cài đặt Discord, rồi nhấp chuột phải vào người dùng → Copy User ID.

## Kiểm Tra An Toàn

Mỗi hành động quản lý đều qua các kiểm tra:

| Kiểm Tra | Quy Tắc |
|----------|---------|
| Tự nhắm | Bạn không thể tự quản lý chính mình |
| Nhắm bot | Bạn không thể quản lý bot |
| Bảo vệ chủ server | Chủ server không thể bị quản lý |
| Thứ bậc role | Role cao nhất của bạn phải cao hơn role của mục tiêu |
| Thứ bậc bot | Role của bot phải cao hơn role của mục tiêu |
| Độ dài lý do | Cắt ngắn còn 512 ký tự (giới hạn Discord API) |

Tất cả hành động được ghi trong **audit log** của Discord với lý do bạn cung cấp.

## Thực Hành Tốt

- **Luôn cung cấp lý do** — hiển thị trong audit log và giúp đội mod hiểu quyết định
- **Leo thang dần dần:** timeout → kick → ban. Cho thành viên cơ hội sửa đổi hành vi
- **Dùng timeout trước** cho vi phạm nhỏ — tạm thời và ít gây gián đoạn hơn kick hoặc ban
- **Viết quy tắc rõ ràng** trong kênh rules để thành viên biết trước
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/moderation.md
git commit -m "content(landing): add Vietnamese Moderation guide"
```

---

## Task 18: Final build verification and global styles

**Files:**
- Modify: `landing/src/styles/global.css` (add guide index and ToC layout styles)

- [ ] **Step 1: Add guide-specific global styles**

Append the following CSS to the end of `landing/src/styles/global.css` (before the last responsive `@media` block):

```css
/* Guide index page */
.guide-index {
  padding-top: 32px;
  padding-bottom: 64px;
}

.guide-index-hero {
  text-align: center;
  margin-bottom: 40px;
}

/* Guide page two-column layout */
.guide-page-wrapper {
  display: flex;
  gap: 32px;
  padding-top: 32px;
  padding-bottom: 64px;
  max-width: 1100px;
}

.guide-page-wrapper .guide-page-main {
  flex: 1;
  min-width: 0;
  max-width: 820px;
}

.guide-icon {
  font-size: 1.5rem;
}
```

Note: Most styles live in scoped `<style>` blocks within the Astro components. Only layout-level styles that need to interact with `.guide-prose` and other global classes go here. Review during build — if the scoped styles in Task 6 and Task 7 cover everything, this step may be a no-op.

- [ ] **Step 2: Run full build**

```bash
cd landing && npx astro build
```
Expected: Build succeeds. All 10 guide pages (5 EN + 5 VI) are generated. The guide index at `/guide` renders 5 cards.

- [ ] **Step 3: Run dev server and verify**

```bash
cd landing && npx astro dev
```

Check these URLs:
- `http://localhost:4321/guide` — index with 5 cards
- `http://localhost:4321/en/guide/economy` — English economy guide with ToC
- `http://localhost:4321/vi/guide/economy` — Vietnamese economy guide
- `http://localhost:4321/commands` — verify existing commands page still works
- `http://localhost:4321/en/commands/voice` — verify existing command guide pages still work
- Verify navbar shows "Guide" link between "Commands" and "FAQ"
- Verify LanguageSwitcher toggles correctly between EN/VI on guide pages

- [ ] **Step 4: Commit any remaining style adjustments**

```bash
git add landing/src/styles/global.css
git commit -m "style(landing): add guide page layout styles"
```

- [ ] **Step 5: Final commit with all changes**

If any files were missed in previous commits:
```bash
git add landing/
git status
git commit -m "feat(landing): complete user guide pages with EN/VI content"
```
