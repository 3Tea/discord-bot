# Command Guide Pages — Landing Site

**Date:** 2026-04-08
**Status:** Approved
**Approach:** Astro Content Collections + Static i18n Routes

## Summary

Add per-command detail/guide pages to the landing site at `landing/`. Each command gets a dedicated page with usage instructions, syntax tables, and step-by-step guides for complex commands. Pages support i18n (English + Vietnamese initially), powered by Astro Content Collections with Markdown files.

## Routing & i18n

### URL Pattern

```
/commands                    → listing page (unchanged, English only)
/en/commands/{slug}          → English guide
/vi/commands/{slug}          → Vietnamese guide
```

### Locale Behavior

- Listing page `/commands` stays English-only — no i18n applied
- Detail pages default to English (`/en/commands/{slug}`)
- Language switcher on detail pages toggles EN ↔ VI
- No automatic browser language detection
- Fallback: if Vietnamese translation doesn't exist, serve English with a notice "Bản dịch đang được cập nhật"

### Dynamic Route

```
landing/src/pages/[lang]/commands/[slug].astro
```

Astro generates static pages at build time from content collection entries.

## Content Collections

### Directory Structure

```
landing/src/content/
  config.ts
  commands/
    en/
      voice.md
      pray.md
      ping.md
      ... (25 files total — one per command)
    vi/
      voice.md
      pray.md
      ping.md
      ... (25 files total)
```

### Frontmatter Schema

```typescript
{
  title: string          // e.g. "Voice Channel Management"
  command: string        // e.g. "voice" — maps to commands.ts slug
  category: string       // e.g. "voice" — maps to category key
  description: string    // short 1-2 sentence description
  permissions?: string[] // e.g. ["Manage Channels"] — optional
  cooldown?: string      // e.g. "5s-120s" — optional
}
```

Body content is freeform Markdown: headings, tables, code blocks, blockquote callouts for tips/warnings.

### Markdown Content Format

Commands follow one of two templates based on complexity:

**Simple commands** (ping, avatar, help, trans, weather, info, balance):
- Frontmatter + short description
- Syntax/options table
- 1-2 usage examples
- ~10-20 lines of content

**Complex commands** (voice, moderation, leaderboard, confession, shop, xp, economy, pray, curse, settings, rank, server-rank):
- Frontmatter + description
- Subcommands/options table with examples
- Step-by-step guide with numbered headings
- Tips (blockquote `> **💡 Tip:**`) and warnings (blockquote `> **⚠️ Warning:**`)
- ~50-100+ lines of content

### Example: `en/voice.md`

```markdown
---
title: Voice Channel Management
command: voice
category: voice
description: Create and manage temporary voice channels with full control over permissions, naming, and user access.
permissions: []
cooldown: "5s-120s"
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/voice limit <number>` | Set user limit (0-99) | `/voice limit 5` |
| `/voice name <text>` | Rename your channel (max 50 chars) | `/voice name Gaming Room` |
| `/voice lock` | Lock channel from everyone | `/voice lock` |
| `/voice unlock` | Unlock channel | `/voice unlock` |
| `/voice hide` | Hide channel from everyone | `/voice hide` |
| `/voice permit <user>` | Allow a specific user | `/voice permit @friend` |
| `/voice block <user>` | Block and disconnect a user | `/voice block @troll` |
| `/voice kick <user>` | Kick a user (with confirmation) | `/voice kick @user` |
| `/voice transfer <user>` | Transfer room ownership | `/voice transfer @friend` |

## How to Use

### Step 1: Join the trigger channel
Join the designated voice channel in any server using 3AT. A personal voice room is automatically created for you.

### Step 2: Customize your room
Use `/voice name` to rename your room and `/voice limit` to set the maximum number of users.

> **💡 Tip:** You are the owner of your room. Only you can use management commands.

### Step 3: Manage access
Use `/voice lock` to prevent others from joining, `/voice permit @user` to whitelist specific users, or `/voice block @user` to ban someone from your room.

> **⚠️ Warning:** Name and limit changes have a 120-second cooldown. Other commands have a 5-second cooldown.

### Step 4: Transfer or leave
Use `/voice transfer @user` to hand ownership to someone else. When everyone leaves, the room is automatically deleted.
```

## Command Detail Page Layout

### Sections (top to bottom)

1. **Header**
   - Breadcrumb: Commands → {Category} → {Command Name} (clickable)
   - Command name as `<h1>` + category badge (colored per category)
   - Short description (1-2 sentences from frontmatter)
   - Language switcher (EN | VI toggle buttons) — right-aligned

2. **Overview Section**
   - Rendered from Markdown: syntax table, options, subcommands
   - Permission requirements badge (if applicable)
   - Cooldown info (if applicable)

3. **Guide Section** (complex commands only)
   - Step-by-step instructions with numbered headings (h3)
   - Code block examples for syntax
   - Callout boxes: tips (yellow/accent), warnings (red)
   - All rendered from Markdown body content

4. **Related Commands**
   - 2-3 command cards from the same category
   - Small card format, clickable → links to their detail pages
   - Pulled from `commands.ts` data based on matching category

5. **Back Navigation**
   - "← Back to Commands" link before Related Commands section

### SEO

- `<title>`: `{Command Name} Guide — 3AT Bot`
- `<meta name="description">`: from frontmatter `description`
- `<link rel="alternate" hreflang="en" href="/en/commands/{slug}">`
- `<link rel="alternate" hreflang="vi" href="/vi/commands/{slug}">`

## Commands Listing Page Changes

### Card Modifications

- Entire card becomes a clickable `<a>` link → `/en/commands/{slug}`
- Add "Guide →" text button at bottom-right of each card
- Enhanced hover: cursor pointer, border color → accent, subtle translateY(-2px) lift
- Both card click and button click navigate to same URL

### No Changes

- Sidebar category filter — unchanged
- Search functionality — unchanged
- Grid layout (2-col desktop, 1-col mobile) — unchanged
- Command count display — unchanged
- Category badges on cards — unchanged

## Language Switcher Component

- Position: right side of detail page header
- Style: two toggle buttons `EN` | `VI`, active button has accent background (#5865F2)
- Behavior: navigates to same slug in other language
- If target translation doesn't exist: still links to EN, shows inline notice

## Command Inventory (25 commands)

All commands get a detail page. Complexity classification determines content depth:

### Simple (7) — Overview only
| Command | Slug |
|---------|------|
| ping | `ping` |
| help | `help` |
| info | `info` |
| avatar | `avatar` |
| trans | `trans` |
| weather | `weather` |
| balance | `balance` |

### Complex (18) — Overview + Step-by-step Guide
| Command | Slug | Key Guide Topics |
|---------|------|-----------------|
| voice | `voice` | Ownership model, permission flow, cooldowns |
| moderation | `moderation` | Permission hierarchy, duration formatting, role validation |
| leaderboard | `leaderboard` | Modes (server/global/servers), periods, pagination |
| confession | `confession` | Admin setup, instant vs review mode, moderation flow |
| shop | `shop` | Item types, stock management, admin setup |
| xp | `xp` | Admin XP management, channel blacklists |
| economy | `economy` | Admin currency management |
| pray | `pray` | Streak system, milestones, target mechanics |
| curse | `curse` | Target mechanics, cooldowns |
| settings | `settings` | Language preference, server defaults |
| rank | `rank` | Reading rank card, global vs server rank |
| server-rank | `server-rank` | Server stats, period comparisons |
| nhentai | `nhentai` | NSFW requirement, reading by ID, pagination |
| 3hentai | `3hentai` | NSFW requirement, reading by ID |
| asmhentai | `asmhentai` | NSFW requirement, reading by ID |
| hentaifox | `hentaifox` | NSFW requirement, reading by ID |
| nhentai-lite | `nhentai-lite` | NSFW requirement, reading by ID |
| pururin | `pururin` | NSFW requirement, reading by ID |

Note: The 6 manga commands share similar guide structure — can use a common template with source-specific details.

## Styling

All new components follow the existing design system:
- CSS custom properties from `global.css` (colors, fonts, spacing, radii)
- Discord-inspired dark theme
- Scoped component styles in `.astro` files
- Responsive breakpoints: 768px, 560px
- Existing animation patterns (scroll reveal, hover transitions)

### New Style Elements

- **Breadcrumb:** text-muted color, `/` separators, last item text-primary
- **Language toggle:** pill buttons, accent bg for active, border for inactive
- **Callout boxes:** left-border accent (yellow for tip, red for warning), bg-secondary background
- **Syntax tables:** styled like existing command tables on listing page
- **Guide steps:** numbered h3 headings with accent-colored step numbers
- **Related cards:** smaller version of existing CommandCard, 3-up grid

## Technical Decisions

- **Astro Content Collections** (not Pages glob): type-safe schema, built-in validation, `getCollection()` API
- **Static generation**: all pages built at compile time, zero runtime cost
- **Markdown (not MDX)**: no need for interactive components in guides — keep it simple
- **i18n only on detail pages**: avoids reworking the entire landing site for minimal gain
- **English as default**: listing page links to `/en/commands/{slug}`, language switcher enables VI access
- **Fallback strategy**: missing VI content falls back to EN page with notice — ensures no broken links

## Future Extensibility

- Add more languages by creating new folders under `content/commands/{lang}/`
- Schema validation ensures new content files have correct frontmatter
- Related commands section auto-updates from `commands.ts` data
- i18n could later extend to listing page and other pages if needed
