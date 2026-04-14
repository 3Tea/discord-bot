# Star Guide Landing Page — Design Spec

## Goal

Create a comprehensive Star Currency guide on the landing site, covering all earning methods, spending mechanisms, and wallet management. Also update the existing Manga and Economy guides to cross-reference the new guide.

## Files to Create

### `landing/src/content/guides/en/star.md`

EN Star Guide with frontmatter:

```yaml
title: Star Currency
description: Everything about stars — how to earn, spend, and manage your global currency.
icon: "⭐"
order: 2
relatedCommands: ["wallet", "pray", "curse", "work", "fish", "mine", "dungeon", "nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
```

Content sections:

1. **Overview** — Star is a global (cross-server) currency. Cannot be admin-controlled or traded. Different from per-server coin/gem.
2. **Earning Stars**
   - **Daily Claim** (`/wallet daily`): 1–3 stars random. Streak bonuses at 3d (+2), 7d (+5), 14d (+10), 30d (+20). Missing a day resets streak.
   - **Star Drops**: Random 1-star drop from activities — pray (5%), curse (5%), work (4%), mine (4%), fish (3%), dungeon combat win (3%).
   - **Achievement Milestones** (one-time): XP-based (level 10/25/50/100 → 5/15/30/50★), pray streak (7/14/30d → 3/8/20★), multi-server (3/5/10 → 5/10/20★), leaderboard top 3 (10★). Total possible: 176★.
3. **Spending Stars**
   - **Manga Commands**: 3 free uses/day (UTC midnight reset), then 1 star per use. All 6 sources share the same counter. Auto-refund on error. Link to Manga Guide.
   - **Global Shop** (`/global-shop buy`): Items priced in stars, variable cost. Link cross-reference.
4. **Managing Your Wallet** — Command reference table: `/wallet view`, `/wallet daily`, `/wallet history`.
5. **Tips & Strategy** — Daily routine advice, streak importance, stacking activities for drops, milestone tracking.

### `landing/src/content/guides/vi/star.md`

Vietnamese translation of the above, matching structure exactly. Native Vietnamese text (not English placeholders).

## Files to Edit

### `landing/src/data/guides.ts`

Add entry:

```ts
star: { slug: "star", label: "Star Currency", color: "#F39C12", bg: "rgba(243,156,18,0.15)" },
```

### `landing/src/content/guides/en/manga.md`

Add "Star Cost" section after "How to Use", before "NSFW Safety":

- 3 free uses per day (UTC midnight reset)
- After free uses: 1 star per command
- Auto-refund on error
- Link to Star Guide for earning methods

### `landing/src/content/guides/vi/manga.md`

Vietnamese version of the same addition.

### `landing/src/content/guides/en/economy.md`

Replace the "Global Wallet & Star Currency" section (lines 101–127) with a shorter version (~5 lines) that summarizes star as a global currency and links to the Star Guide for full details.

### `landing/src/content/guides/vi/economy.md`

Vietnamese version of the same replacement (lines 101–127).

## Design Decisions

- **Separate guide over expanding existing ones**: Star is cross-server and fundamentally different from per-server coin/gem. A dedicated guide prevents the economy guide from growing too large and keeps information centralized.
- **Order 2**: Places Star Guide right after Economy (order 1), since stars are the natural progression after understanding coins/gems.
- **Cross-references**: Manga guide gets star cost info inline (since it's directly relevant to the user experience), economy guide gets a short pointer. Both link to the full Star Guide.
- **relatedCommands includes manga sources**: Since manga is a primary star spending mechanism, linking all 6 manga commands helps discoverability.
- **Color #F39C12**: Gold/amber to match the ⭐ icon, distinct from economy's #F1C40F (slightly warmer).
