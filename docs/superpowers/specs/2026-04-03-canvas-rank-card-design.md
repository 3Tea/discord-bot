# Canvas Rank Card — Design Spec (Sub-project 2)

**Date**: 2026-04-03
**Status**: Approved
**Scope**: Replace enhanced embed rank card with canvas-rendered PNG image
**Depends on**: Sub-project 1 (XP System Core) — models, calculator, rankCard utilities

## Overview

Upgrade `/rank` command from a text-based Discord embed to a beautiful canvas-rendered PNG image. Anime Sakura theme with dark purple background, pink/violet gradients, sakura petal decorations, and avatar glow effect.

## Visual Design

### Canvas Size

934 x 350 px

### Theme: Anime Sakura

**Background:**
- Linear gradient 135deg: `#2d1b4e` → `#1a1035` → `#0d0a1a`

**Avatar:**
- 80x80 circle, fetched from Discord CDN (user's avatar URL)
- Glow effect: `shadowColor: rgba(196, 77, 255, 0.4)`, `shadowBlur: 15`
- Position: left side, vertically centered
- Fallback: if no avatar, draw first letter of username on gradient circle

**Username:**
- 20px bold
- Gradient fill: `#ff6b9d` → `#c44dff` (horizontal)
- Position: right of avatar, top

**Level badge:**
- Small rounded rect near avatar
- Background: gradient `#ff6b9d` → `#c44dff`
- Text: white, bold, "LV 15"

**Rank:**
- Right side of card
- "Rank" in `#8a7aaa`, "#3" in gold `#ffd700`, bold

**XP text:**
- 14px, color `#8a7aaa`
- Format: `8,450 / 11,250 XP`

**Progress bar:**
- Width: ~60% of card width
- Height: 14px, rounded corners (7px radius)
- Background: `rgba(255, 107, 157, 0.15)`
- Fill: gradient `#ff6b9d` → `#c44dff`
- Glow: `shadowColor: rgba(255, 107, 157, 0.5)`, `shadowBlur: 8`

**Stats line:**
- Bottom area, 13px, color `#8a7aaa`
- Format: `💬 2,341  ·  🎤 48h 32m  ·  ❤️ 156`
- Emoji rendered as text (canvas supports basic emoji with proper font)

**Sakura petals:**
- 10+ petals, drawn with canvas ellipse + rotation
- Random positions across the card, heavier on right side
- Multiple sizes: small (4-6px), medium (8-10px), large (12-16px)
- Color: `#ff6b9d` with varying opacity 15-40%
- Some petals have slight rotation to simulate falling
- Pre-defined array of petal configs (not random each render — consistent look)

### Petal Drawing

Each petal is an ellipse with radiusX ~60% of radiusY, rotated at various angles:

```
ctx.beginPath();
ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
ctx.fillStyle = `rgba(255, 107, 157, ${opacity})`;
ctx.fill();
```

## Technical Implementation

### New Dependency

`@napi-rs/canvas` — native Node.js canvas bindings, prebuilt binaries.

### Font

Bundle one font file for consistent rendering across environments:
- Font: **Inter** (or Noto Sans) — supports Latin + Vietnamese
- Location: `src/assets/fonts/Inter-Bold.ttf` (for username/level) + `src/assets/fonts/Inter-Regular.ttf` (for stats/XP)
- Register with `GlobalFonts.registerFromPath()` on startup

### Files Changed

```
src/
  assets/
    fonts/
      Inter-Bold.ttf         # Bundled font (bold)
      Inter-Regular.ttf       # Bundled font (regular)
  util/
    xp/
      canvasRankCard.ts       # NEW: Canvas rendering logic
      rankCard.ts             # UNCHANGED: keep buildRankEmbed as fallback
  commands/slash/
    rank.ts                   # MODIFY: use canvas, fallback to embed
```

### `canvasRankCard.ts` — Public API

```typescript
export async function renderRankCard(options: {
    username: string;
    avatarURL: string | null;
    level: number;
    rank: number;
    xp: number;
    xpForNextLevel: number;
    percentage: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}): Promise<Buffer>
```

Returns a PNG buffer ready to be sent via `AttachmentBuilder`.

### `rank.ts` — Updated Flow

```typescript
// After querying MemberXP and calculating rank...
try {
    const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
    const pngBuffer = await renderRankCard({
        username: target.username,
        avatarURL,
        level: progress.level,
        rank,
        xp: member?.xp ?? 0,
        xpForNextLevel: xpForLevel(progress.level + 1),
        percentage: progress.percentage,
        messageCount: member?.messageCount ?? 0,
        voiceMinutes: member?.voiceMinutes ?? 0,
        reactionCount: member?.reactionCount ?? 0,
    });

    const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
    await interaction.editReply({ files: [attachment] });
} catch {
    // Fallback to embed
    const embed = buildRankEmbed(member, target.username, rank);
    await interaction.editReply({ embeds: [embed] });
}
```

### Avatar Fetching

- Use `target.displayAvatarURL({ extension: "png", size: 256 })`
- Fetch image bytes with `axios.get(url, { responseType: "arraybuffer" })`
- Load into canvas with `await loadImage(Buffer.from(data))`
- If fetch fails: draw fallback circle with first letter of username

## Error Handling

| Scenario | Response |
|----------|----------|
| Canvas render fails | Fallback to `buildRankEmbed` (enhanced embed) |
| Avatar fetch fails | Draw gradient circle with username initial |
| Font not found | Canvas uses system default font |
| `@napi-rs/canvas` not installed | `rank.ts` catches import error, uses embed |

## Performance

- Canvas render: ~50-100ms per card (native bindings are fast)
- Avatar fetch: ~100-200ms (Discord CDN)
- Total: well within Discord's 15-second editReply window (already deferred)
- Font registration: once on module load, not per render

## Docker Considerations

`@napi-rs/canvas` includes prebuilt binaries for Linux x64/arm64. No extra system packages needed in the Dockerfile. The font files must be included in the Docker image (they're in `src/assets/fonts/` which is copied during build).
