# User Guide Pages — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Approach:** New `guides` content collection + reuse existing components

## Goal

Create user-facing guide pages on the landing site (`www.discords.sbs`) that teach Discord server members and admins how to use the bot's major systems. Currently, the only user documentation is the `/help` command and individual command reference pages — there is no holistic guide explaining how systems work end-to-end.

## Target Audience

- **Regular users** — learn how to use economy, XP, voice, confessions
- **Server admins & moderators** — learn how to set up and configure systems

Each guide has sections for both audiences, clearly separated.

## Languages

English + Vietnamese (consistent with existing command guide pages).

## Scope

5 guide pages covering all major systems:

1. **Economy** — coins, gems, pray/curse, streaks, shop
2. **XP & Leveling** — XP sources, levels, rank cards, leaderboards
3. **Voice Channels** — temporary channels, ownership, controls
4. **Confessions** — anonymous posting, voting, moderation
5. **Moderation** — timeout, ban, kick (admin-focused)

Plus 1 index page at `/guide`.

---

## Content Architecture

### New Content Collection: `guides`

Add to `src/content.config.ts`:

```typescript
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

**Schema fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Display title, e.g., "Economy System" |
| `slug` | string | URL slug, e.g., "economy" |
| `description` | string | Short description for index cards |
| `icon` | string | Emoji for index cards and header |
| `order` | number | Sort order on index page (1–5) |
| `relatedCommands` | string[] | Command names to link at bottom |

### File Structure

```
src/content/guides/
  en/
    economy.md
    xp.md
    voice.md
    confessions.md
    moderation.md
  vi/
    economy.md
    xp.md
    voice.md
    confessions.md
    moderation.md
```

---

## Routing

| URL | Page | Content |
|-----|------|---------|
| `/guide` | Index | Grid of 5 guide cards |
| `/en/guide/economy` | Guide page | English economy guide |
| `/vi/guide/economy` | Guide page | Vietnamese economy guide |
| `/en/guide/xp` | Guide page | English XP guide |
| `/vi/guide/xp` | Guide page | Vietnamese XP guide |
| `/en/guide/voice` | Guide page | English voice guide |
| `/vi/guide/voice` | Guide page | Vietnamese voice guide |
| `/en/guide/confessions` | Guide page | English confessions guide |
| `/vi/guide/confessions` | Guide page | Vietnamese confessions guide |
| `/en/guide/moderation` | Guide page | English moderation guide |
| `/vi/guide/moderation` | Guide page | Vietnamese moderation guide |

### Astro Pages

- `src/pages/guide.astro` — index page
- `src/pages/[lang]/guide/[...slug].astro` — dynamic guide page

---

## Page Layouts

### Index Page (`/guide`)

- Small hero: title "User Guide", subtitle "Everything you need to know about 3AT"
- Grid of 5 cards (responsive: 3 cols desktop, 2 tablet, 1 mobile)
- Each card shows: icon, title, description, links to `/en/guide/{slug}`
- Card styling follows `.command-card` pattern with class `.guide-card`
- No sidebar or filtering (only 5 items)

### Guide Page (`/[lang]/guide/[...slug]`)

Layout structure (top to bottom):

1. **Breadcrumb** (reuse component): `Guide / Economy System`
2. **Header**: icon + title, description, LanguageSwitcher (adapted for guide routes)
3. **Two-column layout**:
   - **Main content** (left, wider): `.guide-prose` rendered markdown
   - **Sidebar ToC** (right, sticky): Auto-generated from `##` headings via client-side JS
4. **Related Commands** section: Links to command reference pages (from `relatedCommands` frontmatter)
5. **Related Guides**: Links to 1-2 other guide pages
6. **Back link**: "Back to Guide" → `/guide`

**Sidebar ToC behavior:**
- Sticky position, scrolls with content
- Highlights current section via Intersection Observer
- Desktop: right sidebar (220px wide)
- Mobile (< 768px): Collapsible ToC block at top of content, above the prose

**Translation fallback:** Same pattern as command pages — if Vietnamese version doesn't exist, show English with notice: "Ban dich dang duoc cap nhat. Noi dung hien tai hien thi bang tieng Anh."

---

## Components

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `GuideCard` | `src/components/GuideCard.astro` | Card for index grid (icon, title, description, link) |
| `GuideToc` | `src/components/GuideToc.astro` | Client-side table of contents with active heading tracking |
| `RelatedGuides` | `src/components/RelatedGuides.astro` | Links to other guides (exclude current, limit 2) |

### Reused Components (as-is)

| Component | Adaptation |
|-----------|-----------|
| `BaseLayout` | No changes needed |
| `Breadcrumb` | No changes — pass different items |
| `Navbar` | Add "Guide" link between "Commands" and "FAQ" |

### Adapted Components

| Component | Adaptation |
|-----------|-----------|
| `LanguageSwitcher` | Generalize href to accept a `basePath` prop instead of hardcoded `/commands/`. Pass `basePath="/guide"` for guide pages. |

---

## Navigation Updates

Update `Navbar.astro` navLinks array:

```typescript
const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/commands", label: "Commands" },
  { href: "/guide", label: "Guide" },       // NEW
  { href: "/#faq", label: "FAQ" },
  { href: "https://github.com/3Tea/discord-bot/discussions", label: "Support", external: true },
];
```

---

## Styling

### New CSS

All new styles scoped within components or page `<style>` blocks (Astro convention). Key classes:

**Index page:**
- `.guide-index` — page container
- `.guide-index-hero` — small hero section
- `.guide-grid` — card grid (same responsive breakpoints as `.commands-grid`)
- `.guide-card` — individual card with hover effect and icon

**Guide page:**
- `.guide-layout` — two-column flex container (main + sidebar)
- `.guide-toc` — sticky sidebar, 220px wide
- `.guide-toc-link` — individual ToC item
- `.guide-toc-link.active` — highlighted current section
- `.guide-toc-mobile` — collapsible version for mobile

**Responsive breakpoints** (match existing site):
- Desktop (> 768px): Two-column layout with sidebar ToC
- Mobile (< 768px): Single column, ToC collapses to top

### Reused CSS

- `.guide-prose` — already defined in `global.css` for markdown rendering
- `.container`, `.btn`, `.btn-primary` — utility classes
- `.breadcrumb` — existing component styles
- `.lang-switcher` — existing component styles
- `.related-section`, `.related-grid`, `.related-card` — from RelatedCommands

---

## Guide Content Structure

Each guide follows this hybrid format (friendly intro + reference tables):

### Template

```markdown
---
title: {System Name}
slug: {slug}
description: {One-line description}
icon: {emoji}
order: {1-5}
relatedCommands: [{command names}]
---

## Overview

Friendly 2-3 sentence introduction explaining what this system is
and why it matters. Written for someone who's never used it.

## {Core Concept — e.g., "Earning Coins"}

Explanation of how it works, with examples.

| Detail | Value |
|--------|-------|
| ... | ... |

## {Feature — e.g., "Pray & Curse"}

Step-by-step usage with command syntax.

> **Tip:** Helpful advice in blockquotes.

## {Feature — e.g., "Shop"}

More details.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/command` | What it does | `/command args` |

## For Admins & Mods

> This section is for server administrators and moderators.

### {Admin Feature — e.g., "Managing Currency"}

Admin-specific setup and configuration.
```

### Per-Guide Content Outline

**1. Economy (`economy.md`, order: 1)**
- Overview: Two currencies — Coin (common) and Gem (rare/premium)
- Earning Coins: Pray (self 50-150, targeted 100-200), Curse (self 20-80, targeted 40-100)
- Gems: 5% chance on targeted pray, streak milestones
- Streaks: Table of milestones (Day 3: +50 coin, Day 7: +150 coin +1 gem, Day 14: +300 coin +2 gem, Day 30: +500 coin +5 gem)
- Shop: How to browse (`/shop view`), buy items (`/shop buy`), item types (role, cosmetic)
- Balance: Checking your balance (`/balance`)
- Commands Reference: Table of all economy commands
- Admin Section: `/economy set-coin/add-coin/set-gem/add-gem`, `/shop add/remove`, transaction logging
- `relatedCommands`: ["balance", "pray", "curse", "shop", "economy"]

**2. XP & Leveling (`xp.md`, order: 2)**
- Overview: Earn XP by participating, level up, compete on leaderboards
- XP Sources: Table (Messages: 15-25 XP, 60s cooldown / Voice: 5 XP/min, 2+ members / Reactions: 3 XP, 30s cooldown)
- How Levels Work: Formula explanation (Level^2 x 50), example milestones table (Level 5 = 1,250 XP, Level 10 = 5,000 XP, Level 20 = 20,000 XP, Level 50 = 125,000 XP)
- Rank Card: `/rank` shows canvas image with level, XP bar, ranks, activity
- Leaderboards: `/leaderboard` with 3 modes (server/global/servers) + period filters (daily/weekly/monthly/yearly)
- Server Rank: `/server-rank` shows server's global standing
- Tips: Participate in voice chats, react to messages, consistent activity
- Admin Section: `/xp set/add/remove`, `/xp channel-blacklist add/remove`, XP config rates
- `relatedCommands`: ["rank", "leaderboard", "server-rank", "xp"]

**3. Voice Channels (`voice.md`, order: 3)**
- Overview: Create your own temporary voice channel and control it
- Getting Started: Join a channel prefixed "3AT " → bot creates your personal room
- Control Panel: Buttons explanation with descriptions (Lock, Unlock, Hide, Limit, Rename, Permit, Block, Kick, Transfer)
- Slash Commands: Table of `/voice` subcommands with cooldowns
- How Ownership Works: You own the channel, 12h expiry, auto-delete when empty
- Tips: Transfer before leaving, permit overrides lock/hide, use limit 0 for unlimited
- Admin Section: How to create trigger channels (name prefix "3AT ")
- `relatedCommands`: ["voice"]

**4. Confessions (`confessions.md`, order: 4)**
- Overview: Post anonymous confessions in your server
- Submitting: `/confession submit` with text, optional image, tag selection
- Tags: Table (Heartfelt, Funny, Question, Sharing, Other)
- VIP Confessions: Costs gems, golden embed, stands out
- Skip Cooldown: Costs coins to bypass the wait
- Voting & Replies: Upvote/downvote buttons, reply to confessions
- Tips: Use appropriate tags, VIP for important confessions
- Admin Section: `/confession setup` (mode, channels, cooldown), `/confession ban/unban`, `/confession filter-add/remove/list`
- `relatedCommands`: ["confession"]

**5. Moderation (`moderation.md`, order: 5)**
- Overview: Tools for keeping your server safe (admin/mod focused, no user/admin split)
- Commands: Table with permissions required (Timeout: ModerateMembers, Ban: BanMembers, Kick: KickMembers)
- How It Works: Hierarchy enforcement, reason field, audit log
- Timeout: Duration options (1 min to 28 days), text + voice mute
- Ban & Kick: Message deletion option for ban, kick removes from server
- Unban: By user ID (snowflake)
- Best Practices: Always provide reason, escalation path (timeout → kick → ban), check hierarchy
- `relatedCommands`: ["moderation"]

---

## SEO

- Each guide page has `<title>` and `<meta description>` from frontmatter
- hreflang alternates for EN/VI (same pattern as command pages)
- Guide index page: `<title>User Guide | 3AT - Endless Paradox</title>`

---

## Summary of Changes

| Area | Change |
|------|--------|
| `src/content.config.ts` | Add `guides` collection |
| `src/content/guides/{en,vi}/` | 10 markdown files (5 per language) |
| `src/pages/guide.astro` | New index page |
| `src/pages/[lang]/guide/[...slug].astro` | New dynamic guide page |
| `src/components/GuideCard.astro` | New card component |
| `src/components/GuideToc.astro` | New ToC component |
| `src/components/RelatedGuides.astro` | New related guides component |
| `src/components/LanguageSwitcher.astro` | Add `basePath` prop (default `/commands`) |
| `src/components/Navbar.astro` | Add "Guide" nav link |
| `src/data/guides.ts` | Guide metadata for index page (optional, can derive from collection) |
