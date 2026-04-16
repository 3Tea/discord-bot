# Premium Upgrade Button Design

**Date:** 2026-04-16
**Status:** Approved

## Problem

When users hit premium gates (features blocked, cooldowns, daily limits), there is no actionable path to upgrade. Error messages say "Premium feature" or "Upgrade to unlock" but provide no button or link. Users must manually discover `/premium compare` and then figure out how to purchase.

## Solution

Add a shared `buildPremiumButton(locale)` utility that returns a `ButtonBuilder` with `ButtonStyle.Link` pointing to the premium landing page. Integrate it at every premium gate, cooldown hint, and info command.

## Decisions

| Question | Answer |
|----------|--------|
| Button action | `ButtonStyle.Link` → opens `${URL_HOMEPAGE}/en/guide/premium/` in browser |
| URL source | Hardcoded path appended to existing `URL_HOMEPAGE` config |
| Scope | All premium gate errors + cooldown hints (free tier only) + `/premium status` + `/premium compare` + manga page limit button |
| Premium expiry DM | Out of scope — not included |
| Button style | Link button with ⭐ emoji |

## Shared Utility

### `src/util/premium/upgradeButton.ts` (new file)

```typescript
import { ButtonBuilder, ButtonStyle } from "discord.js";
import { URL_HOMEPAGE } from "../config/index";
import type { SupportedLocale } from "../i18n/index";
import { t } from "../i18n/t";

export function buildPremiumButton(locale: SupportedLocale): ButtonBuilder {
    return new ButtonBuilder()
        .setLabel(t(locale, "premium.upgrade_btn"))
        .setURL(`${URL_HOMEPAGE}/en/guide/premium/`)
        .setStyle(ButtonStyle.Link)
        .setEmoji("⭐");
}
```

- No handler needed — Discord opens the URL directly
- i18n label via `premium.upgrade_btn` key
- Single source of truth for URL and styling

## Integration Points

### Group 1 — Premium Gate Errors

These are hard blocks where user cannot proceed without premium.

| File | Location | Current | After |
|------|----------|---------|-------|
| `src/util/manga/handler.ts:171` | Star charge — insufficient stars | `interaction.reply({ content: t(locale, "manga.no_stars"), flags: Ephemeral })` | Embed (red) + ⭐ Upgrade button, ephemeral |
| `src/commands/slash/confession.ts:560` | Audio — not enabled for tier | `interaction.editReply({ content: t(locale, "confession.audio_premium_only") })` | Embed (red) + ⭐ Upgrade button |
| `src/commands/slash/confession.ts:575-579` | Audio — file too large for tier | `interaction.editReply({ content: t(locale, "confession.audio_too_large", ...) })` | Embed (red) + ⭐ Upgrade button |
| `src/commands/slash/confession.ts:581-585` | Audio — daily limit reached | `interaction.editReply({ content: t(locale, "confession.audio_daily_limit") })` | Embed (red) + ⭐ Upgrade button |

### Group 2 — Cooldown Hints (free tier only)

Show a hint about premium reducing cooldowns. Only for users with free-tier cooldown values.

| File | Location | Current | After |
|------|----------|---------|-------|
| `src/commands/slash/work.ts:70-74` | Work cooldown | Embed: "Chờ Xh" | Embed: "Chờ Xh" + hint line + ⭐ Upgrade button |
| `src/commands/slash/fish.ts:66-74` | Fish cooldown | Embed: "Chờ Xh" | Same pattern |
| `src/commands/slash/mine.ts:43-51` | Mine cooldown | Embed: "Chờ Xh" | Same pattern |
| `src/commands/slash/dungeon.ts:462-470` | Dungeon cooldown | Embed: "Chờ Xh" | Same pattern |

**Detection:** Compare `tierConfig.{command}CooldownMs` with `TIER_CONFIG.free.{command}CooldownMs`. If equal → user is on free tier → show hint. This avoids an extra `getTier()` Redis call since `tierConfig` is already loaded.

**Hint format:** Append `\n${t(locale, "premium.cooldown_hint", { reduced: formatCd(starCooldown) })}` to the cooldown description. The `reduced` value shows the Star tier's cooldown.

### Group 3 — Premium Info Commands

| File | Location | Current | After |
|------|----------|---------|-------|
| `src/commands/slash/premium.ts:241-244` | `/premium status` (free tier path) | `Reply.embedEdit(interaction, embed)` | Add ⭐ Upgrade button row |
| `src/commands/slash/premium.ts:315-319` | `/premium compare` | `Reply.embedEdit(interaction, embed)` | Add ⭐ Upgrade button row |

### Group 4 — Manga Page Limit

| File | Location | Current | After |
|------|----------|---------|-------|
| `src/util/manga/handler.ts:91-98` | Disabled "Premium only" button | `ButtonBuilder` with `setDisabled(true)` + label "Premium only" | Replace with `buildPremiumButton(locale)` (Link style, clickable) |

## Reply Format Changes

Discord does not allow buttons on plain text messages. Several gates currently use `interaction.reply({ content: ... })` or `interaction.editReply({ content: ... })`. These must change to embed + components:

```typescript
// Before (plain text, no button possible)
await interaction.reply({ content: t(locale, "manga.no_stars"), flags: MessageFlags.Ephemeral });

// After (embed + button)
const embed = new EmbedBuilder()
    .setDescription(t(locale, "manga.no_stars"))
    .setColor(0xed4245);
const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
```

For commands that use `Reply.embedEdit()`, use `Reply.embedEditComponents()` (added in the gamble replay buttons feature) instead:

```typescript
const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(buildPremiumButton(locale));
await Reply.embedEditComponents(interaction, embed, [row]);
```

## i18n Keys

New keys to add to all 15 locale files:

| Key | EN value | Purpose |
|-----|----------|---------|
| `premium.upgrade_btn` | `Upgrade Premium` | Link button label |
| `premium.cooldown_hint` | `⚡ Premium reduces this to **{{reduced}}**` | Cooldown hint text (free tier only) |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `URL_HOMEPAGE` is empty string | Button URL becomes `/en/guide/premium/` — relative URL, Discord may reject. Acceptable: bot should always have `URL_HOMEPAGE` set in production. |
| User already has Star tier, sees cooldown | No hint shown — their cooldown already matches Star tier value (or Galaxy). Button not added. |
| Galaxy tier user on `/premium compare` | Button still shown — they might want to share the link or see the page. |

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/util/premium/upgradeButton.ts` | **Create** | `buildPremiumButton()` shared utility |
| `src/util/manga/handler.ts` | Modify | Star charge error → embed + button; disabled button → Link button |
| `src/commands/slash/confession.ts` | Modify | 3 audio error points → embed + button |
| `src/commands/slash/work.ts` | Modify | Cooldown → hint + button (free tier) |
| `src/commands/slash/fish.ts` | Modify | Cooldown → hint + button (free tier) |
| `src/commands/slash/mine.ts` | Modify | Cooldown → hint + button (free tier) |
| `src/commands/slash/dungeon.ts` | Modify | Cooldown → hint + button (free tier) |
| `src/commands/slash/premium.ts` | Modify | Status (free) + compare → add button row |
| `src/locales/*.json` (15 files) | Modify | Add `premium.upgrade_btn`, `premium.cooldown_hint` |
