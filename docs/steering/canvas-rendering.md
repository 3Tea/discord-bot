# Canvas Rendering

> Steering doc for AI assistants and contributors. Covers the canvas-based rank card system — @napi-rs/canvas pipeline, anime Sakura theme, layout structure, color palette, font management, helper functions, and embed fallback.

## Overview

Rank cards are rendered as PNG images using `@napi-rs/canvas` (a native Node.js canvas binding). Both `/rank` and `/server-rank` produce a stylized anime Sakura-themed card with a dark purple sky, mountains, cherry blossoms, and a crescent moon. When canvas rendering fails, the system falls back to a Discord embed with equivalent data. All rendering logic lives in `src/util/xp/`.

## Source Files

| File | Purpose |
|------|---------|
| `canvasHelpers.ts` | Shared constants, color palette, font registration, background sub-renderers, UI drawing functions |
| `canvasRankCard.ts` | User rank card renderer (`renderRankCard`) |
| `canvasServerRankCard.ts` | Server rank card renderer (`renderServerRankCard`) |
| `rankCard.ts` | Embed fallback builders (`buildRankEmbed`, `buildServerRankEmbed`), period stats query, leaderboard embeds |
| `calculator.ts` | `levelFromXP()`, `progressToNextLevel()`, `xpForLevel()` — used by both canvas and embed paths |

## User Rank Card (`/rank`)

Canvas: 934 x 360 px (934 x 400 when period stats present). Output: PNG buffer attached as `rank.png`.

### Visual Elements (draw order)

| Element | Position | Details |
|---------|----------|---------|
| Rounded clip | Full card | 14 px corner radius |
| Anime background | Full card | Sky gradient, nebula, stars, moon, clouds, mountains, torii, blossoms, bokeh, readability overlay |
| Accent stripe | Left edge | 5 px wide, vertical pink-to-purple gradient |
| Avatar | Left column, vertically centered | 72 px radius circular image with gradient ring and outer glow |
| Online status dot | Below-left of avatar | Green dot with ring and highlight |
| Server rank badge | Below avatar | Pink-to-purple gradient border, label: `SERVER  #N` |
| Global rank badge | Below server badge | Gold gradient border, label: `GLOBAL  #N` |
| Level box | Top-right corner | 118 x 110 px panel with "LEVEL" label and large gradient number |
| Name block | Right content area, top | Username (44 px, pink-purple gradient) + subtitle ("Member") + accent underline |
| Divider | Below name block | Horizontal line, `rgba(255,255,255,0.07)` |
| XP bar | Below divider | 24 px tall rounded bar with gradient fill, shimmer highlight, glow tip, percentage label, XP sub-labels |
| Stat cards (4) | Bottom row | MESSAGES, VOICE, REACTIONS, TOTAL XP — each with left accent bar |
| Period stat cards (3) | Above stat row (if present) | TODAY, THIS WEEK, THIS MONTH — XP change values prefixed with `+` |
| Outer border | Full card | 1 px `rgba(255,255,255,0.06)` stroke |

### RankCardOptions

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `username` | string | Yes | — |
| `discriminator` | string | No | `"Member"` |
| `avatarURL` | string \| null | Yes | — |
| `level` | number | Yes | — |
| `rank` | number | Yes | — |
| `globalRank` | number | Yes | — |
| `xp` | number | Yes | — |
| `xpForNextLevel` | number | Yes | — |
| `percentage` | number | Yes | — |
| `messageCount` | number | Yes | — |
| `voiceMinutes` | number | Yes | — |
| `reactionCount` | number | Yes | — |
| `totalXP` | number | No | `xp` |
| `periodStats` | `{ daily, weekly, monthly }` | No | — |
| `premiumBadge` | string \| null | No | `null` |
| `rankCardTheme` | string | No | `"standard"` |

### Galaxy Theme

When `rankCardTheme === "galaxy"`, the card uses an alternate color scheme defined in the `GALAXY` constant:

| Key | Value | Replaces |
|-----|-------|----------|
| `accentA` | `#ffd700` (gold) | `C.pink` in name gradient, XP bar start |
| `accentB` | `#6a0dad` (deep purple) | `C.purple` in name gradient, XP bar end |
| `stat1` | `#ffd700` (gold) | Pink accent on MESSAGES stat |
| `stat2` | `#00d4ff` (cyan) | Purple accent on VOICE stat |
| `stat3` | `#c44dff` (purple) | Gold accent on REACTIONS stat |
| `stat4` | `#ffd700` (gold) | Gold accent on TOTAL XP stat |
| `borderGlow` | `rgba(255,215,0,0.15)` | Standard border glow |
| `tint` | `rgba(106,13,173,0.08)` | No tint in standard theme |

Galaxy theme applies a purple tint overlay on the background and uses a gold outer glow on the card border.

### Premium Badge

When `premiumBadge` is set (e.g., `"star"` or `"galaxy"`), `drawPremiumBadge()` renders a small pill badge below the rank badges:
- **Star**: `"⭐ STAR"` with orange gradient (`#f39c12` → `#e67e22`)
- **Galaxy**: `"🌌 GALAXY"` with purple gradient (`#9b59b6` → `#6a0dad`)

## Server Rank Card (`/server-rank`)

Canvas: 934 x 360 px (934 x 400 when period stats present). Output: PNG buffer attached as `server-rank.png`.

### Differences from User Rank Card

| Aspect | User card | Server card |
|--------|-----------|-------------|
| Avatar source | User avatar URL | Guild icon URL |
| Fallback char | First char of username | First char of guild name (or `"S"`) |
| Status dot | Green online dot drawn | Not drawn |
| Rank badges | Two badges (server + global) | One badge: `RANK  #N / total` |
| Badge colors | Server=pink/purple, Global=gold | Gold only |
| Name subtitle | `"Member"` (or discriminator) | `"Server"` |
| 4th stat card | TOTAL XP | MEMBERS (activeMembers count) |
| Level calculation | Passed in from caller | Computed internally via `levelFromXP(totalXP)` |
| XP bar target | Passed in `xpForNextLevel` | Computed via `xpForLevel(level + 1)` |

### ServerRankCardOptions

| Field | Type | Required |
|-------|------|----------|
| `guildName` | string | Yes |
| `guildIconURL` | string \| null | Yes |
| `totalXP` | number | Yes |
| `rank` | number | Yes |
| `totalServers` | number | Yes |
| `totalMessages` | number | Yes |
| `totalVoiceMinutes` | number | Yes |
| `totalReactions` | number | Yes |
| `activeMembers` | number | Yes |
| `periodStats` | `{ daily, weekly, monthly }` | No |

## Background Layers

`drawAnimeBackground()` composites 10 layers in strict order. Every layer is procedurally drawn (no external image assets).

| # | Layer | Function | Details |
|---|-------|----------|---------|
| 1 | Sky gradient | `drawAnimeSky` | 7-stop vertical gradient from near-black (#050210) to warm pink (#c44068) + radial horizon glow |
| 2 | Nebula blobs | `drawNebula` | 4 radial gradients in purple/pink/blue at low opacity (0.04-0.06) |
| 3 | Star field | `drawStarField` | 40 pre-defined stars, each with a radial glow halo + bright white core |
| 4 | Crescent moon | `drawCrescentMoon` | Position (780, 52), radius 28 px, 3 layered glow rings, warm gradient body, crescent shadow cutout |
| 5 | Clouds | `drawAnimeCloud` | 5 clusters of 7 overlapping ellipses each, very low opacity (0.04-0.06) |
| 6 | Mountains (far) | `drawMountains` | Quadratic-curve silhouette, `rgba(30,15,55,0.7)` |
| 7 | Mountains (mid) | `drawMountains` | Darker silhouette, `rgba(18,8,35,0.8)` |
| 8 | Mountains (near) | `drawMountains` | Darkest silhouette, `rgba(8,4,18,0.85)` |
| 9 | Torii gate | `drawTorii` | Small silhouette at (580, H-148) on tallest far peak — 2 pillars, curved top beam, middle beam |
| 10 | Cherry blossoms | `drawSceneBlossoms` | 14 pre-defined elliptical petals in pink/purple, rotated, low opacity (0.08-0.2) |
| 11 | Bokeh particles | `drawBokehParticles` | 12 radial-gradient soft circles, pink-tinted, very low opacity (0.03-0.07) |
| 12 | Readability overlay | `drawReadabilityOverlay` | Left-to-right darkening gradient (0.75 left to 0.25 right) + bottom darkening for stat area |

All star positions, bokeh particles, blossom petals, and cloud clusters are defined as pre-computed `readonly` tuple arrays in `canvasHelpers.ts` (not randomized at runtime).

## Color Palette

All colors defined in the `C` constant object (`canvasHelpers.ts`).

| Key | Hex / Value | Usage |
|-----|-------------|-------|
| `bgDeep` | `#0a0614` | Card background fill, status dot ring |
| `bgMid` | `#120b22` | Mid-tone background (available, not directly used in main render) |
| `bgTop` | `#1a0e2e` | Top-layer background tone |
| `pink` | `#ff6b9d` | Primary accent — name gradient, XP bar start, stat card accents, server rank badge, blossom petals |
| `purple` | `#c44dff` | Secondary accent — name gradient end, XP bar end, global rank badge, blossom petals |
| `gold` | `#ffd700` | Global rank badge, TOTAL XP / MEMBERS stat card accent |
| `muted` | `#7a6899` | Labels ("LEVEL", "EXPERIENCE", stat card labels), subtitle text |
| `dimmer` | `#5a4878` | XP sub-label text (current/next XP values) |
| `panelFill` | `rgba(255,255,255,0.04)` | Level box and stat card background |
| `panelBorder` | `rgba(255,255,255,0.07)` | Level box border |
| `green` | `#3ba55c` | Online status dot (user card only) |
| `greenHi` | `#57d87a` | Status dot highlight |

## Font Management

Two fonts registered via `GlobalFonts.registerFromPath()` at module load time in `canvasHelpers.ts`:

| Font | File | Registration Name | Usage |
|------|------|-------------------|-------|
| Inter Bold | `src/assets/fonts/Inter-Bold.ttf` | `"Inter Bold"` | Username (44 px), level number (56 px), labels (14-16 px), stat values (28 px), XP percentage, rank badges |
| Inter Regular | `src/assets/fonts/Inter-Regular.ttf` | `"Inter"` | Subtitle (18 px), XP sub-labels (15 px) |

Fonts are resolved relative to `process.cwd()`. The `FONTS_DIR` constant points to `src/assets/fonts/`.

## Data Flow

### `/rank` Command

1. `deferReply()` — secures the 3-second interaction window
2. Resolve target user (option or self) and locale
3. Query `MemberXPModel` for guild-specific XP data
4. Count documents with higher XP for guild rank
5. `getGlobalRank(userId)` for global rank and total XP
6. `getPeriodStats(userId, guildId)` — queries `XPSnapshot` for daily/weekly/monthly period keys
7. `progressToNextLevel(xp)` for level, percentage
8. **Try**: `renderRankCard(options)` returns PNG `Buffer`, wrap in `AttachmentBuilder`, `editReply({ files })`
9. **Catch**: `buildRankEmbed(...)` returns `EmbedBuilder`, `editReply({ embeds })`
10. **Outer catch**: `editReply(t(locale, "rank.error"))` plain text error

### `/server-rank` Command

1. Guard: reject if `!interaction.guildId` (ephemeral error)
2. `deferReply()`
3. Query `GuildStatsModel` for server-wide aggregates
4. Count documents with higher `totalXP` for server rank + total server count
5. `getServerPeriodStats(guildId)` — queries `GuildStatsSnapshotModel` for daily/weekly/monthly
6. **Try**: `renderServerRankCard(options)` returns PNG `Buffer`, attach as `server-rank.png`
7. **Catch**: `buildServerRankEmbed(...)` embed fallback
8. **Outer catch**: plain text error via `t(locale, "server_rank.error")`

## Helper Functions

All exported from `canvasHelpers.ts`.

| Function | Signature | Purpose |
|----------|-----------|---------|
| `roundRect` | `(ctx, x, y, w, h, r)` | Draw a rounded rectangle path (does not fill/stroke — caller decides) |
| `gradientH` | `(ctx, x, w, y, stops) => CanvasGradient` | Create horizontal linear gradient with arbitrary color stops |
| `gradientV` | `(ctx, y, h, x, stops) => CanvasGradient` | Create vertical linear gradient with arbitrary color stops |
| `shadow` | `(ctx, color, blur, ox?, oy?)` | Set canvas shadow properties |
| `clearShadow` | `(ctx)` | Reset shadow to transparent/0 |
| `clampText` | `(ctx, text, maxWidth) => string` | Truncate text with `..` suffix if it exceeds `maxWidth` (measured with current font) |
| `formatVoice` | `(minutes) => string` | Format minutes as `Xh Ym` or `Ym` |
| `drawAnimeBackground` | `(ctx)` | Composite all background layers (see Background Layers section) |
| `drawCircularImage` | `async (ctx, imageURL, fallbackChar, cx, cy, radius)` | Fetch image via axios, draw clipped to circle with gradient ring + outer glow. On fetch failure, calls `drawCircularFallback` |
| `drawCircularFallback` | `(ctx, cx, cy, r, fallbackChar)` | Pink-purple gradient circle with centered uppercase letter |
| `drawRankBadge` | `(ctx, label, cx, topY, colors) => height` | Pill-shaped badge with gradient border, centered text, returns badge height for stacking |
| `drawNameBlock` | `(ctx, username, subtitle, x, y, maxW)` | Username in gradient + subtitle in muted + accent underline. Uses `clampText` for overflow |
| `drawXPBar` | `(ctx, xp, xpForNextLevel, percentage, x, y, barW)` | Full XP bar: label row, track, gradient fill, shimmer, glow tip, sub-labels |
| `drawLevelBox` | `(ctx, level, x, y, w, h)` | Panel with "LEVEL" label and large gradient number |
| `drawStatCard` | `(ctx, label, value, x, y, w, h, accentColor)` | Stat panel with left accent bar, label, and value |
| `drawDivider` | `(ctx, x, y, w)` | Horizontal divider line |

### Type Alias

```typescript
export type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;
```

All drawing functions accept `Ctx` as the first parameter.

## Error Handling

Three-tier fallback on both `/rank` and `/server-rank`:

| Tier | Trigger | Response |
|------|---------|----------|
| 1 — Canvas | Default path | PNG image attached to reply |
| 2 — Embed | Canvas `renderRankCard` / `renderServerRankCard` throws | `buildRankEmbed` / `buildServerRankEmbed` with text-based progress bar (`FILLED.repeat + EMPTY.repeat`) |
| 3 — Error message | Any outer exception (DB query failure, etc.) | Plain text `t(locale, "rank.error")` or `t(locale, "server_rank.error")` |

Canvas failures are silently caught (empty `catch` block). The embed fallback contains equivalent data: rank, level, progress bar, XP values, period stats, activity counts.

### Avatar Fetch Failure

Inside `drawCircularImage`, if `axios.get(imageURL)` throws, `drawCircularFallback` renders a gradient circle with the user's/server's first character. This does **not** escalate to the embed fallback tier.

## Period Stats

When `periodStats` is provided, the card height increases from 360 to 400 px. Three additional stat cards render above the main stat row:

| Card | Label | Value format | Accent color |
|------|-------|-------------|--------------|
| Daily | `TODAY` | `+N` | pink |
| Weekly | `THIS WEEK` | `+N` | purple |
| Monthly | `THIS MONTH` | `+N` | gold |

Period stat dimensions: 60 px tall, 3 cards with 12 px gap, positioned 12 px above the main stat row.

Data source: `XPSnapshot` model for user cards (queried via `getPeriodStats`), `GuildStatsSnapshot` model for server cards (queried via `getServerPeriodStats`). Period keys generated by `getCurrentPeriodKeys()` from `periodKey.ts`.

## Layout Measurements

### Card Dimensions

| Measurement | Value |
|-------------|-------|
| Card width (`W`) | 934 px |
| Card height (`H`) | 360 px (400 with period stats) |
| Corner radius | 14 px |
| Outer padding (`PAD`) | 32 px |
| Accent stripe width | 5 px |

### Avatar Area

| Measurement | Value |
|-------------|-------|
| Avatar radius (`AV_R`) | 72 px (144 px diameter) |
| Avatar center X (`AV_CX`) | `PAD + AV_R + 8` = 112 px |
| Avatar center Y (`AV_CY`) | `cardH / 2 - 10` (vertically centered, offset up) |
| Gradient ring width | 4 px, offset 3 px from avatar edge |
| Outer glow radius | `AV_R + 20` = 92 px |
| Rank badge start Y | `AV_CY + AV_R + 12` |

### Content Area

| Measurement | Value |
|-------------|-------|
| Content start X (`CONTENT_X`) | `AV_CX + AV_R + 28` = 212 px |
| Content width (`CONTENT_W`) | `LV_X - CONTENT_X - 20` (dynamic, ~584 px) |
| Name Y offset | `PAD + 40` = 72 px |
| Divider Y offset | Name Y + 48 = 120 px |
| XP bar Y offset | Name Y + 64 = 136 px |
| XP bar height | 24 px |

### Level Box

| Measurement | Value |
|-------------|-------|
| Width (`LV_W`) | 118 px |
| Height (`LV_H`) | 110 px |
| Position X (`LV_X`) | `W - PAD - LV_W` = 784 px |
| Position Y (`LV_Y`) | `PAD` = 32 px |

### Stat Cards

| Measurement | Value |
|-------------|-------|
| Count | 4 (main row) + 3 (period row, optional) |
| Main row height (`STAT_H`) | 78 px |
| Period row height | 60 px |
| Gap between cards | 12 px |
| Main card width | `(CONTENT_W - 3 * 12) / 4` (~137 px) |
| Period card width | `(CONTENT_W - 2 * 12) / 3` (~187 px) |
| Main row Y | `cardH - PAD - 78` |
| Period row Y | Main row Y - 60 - 12 |

## Cross-References

- XP data models, leveling formula, and snapshot system: [xp-system.md](xp-system.md)
- `levelFromXP()`, `progressToNextLevel()`, `xpForLevel()`: `src/util/xp/calculator.ts`
- Period key generation: `src/util/xp/periodKey.ts`
- Global XP aggregation: `src/util/xp/globalXP.ts`
- Font assets: `src/assets/fonts/Inter-Bold.ttf`, `src/assets/fonts/Inter-Regular.ttf`
