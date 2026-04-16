# Premium Upgrade Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ⭐ Upgrade Premium link button at every premium gate, cooldown hint, and info command so users have a clear path to upgrade.

**Architecture:** Create a shared `buildPremiumButton(locale)` utility returning a `ButtonStyle.Link` button pointing to `${URL_HOMEPAGE}/en/guide/premium/`. Integrate it at 10+ locations: premium gate errors (manga, confession), cooldown hints (work, fish, mine, dungeon — free tier only), info commands (`/premium status`, `/premium compare`), and the manga page-limit button.

**Tech Stack:** Discord.js v14 (ButtonBuilder, ButtonStyle.Link, ActionRowBuilder), i18next, existing `Reply` utility with `embedEditComponents()`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/util/premium/upgradeButton.ts` | **Create** | `buildPremiumButton()` shared utility |
| `src/locales/*.json` (15 files) | Modify | Add `premium.upgrade_btn`, `premium.cooldown_hint` |
| `src/util/manga/handler.ts` | Modify | Star charge error + disabled button → upgrade button |
| `src/commands/slash/confession.ts` | Modify | 3 audio error points → embed + upgrade button |
| `src/commands/slash/work.ts` | Modify | Cooldown → hint + upgrade button (free tier) |
| `src/commands/slash/fish.ts` | Modify | Cooldown → hint + upgrade button (free tier) |
| `src/commands/slash/mine.ts` | Modify | Cooldown → hint + upgrade button (free tier) |
| `src/commands/slash/dungeon.ts` | Modify | Cooldown → hint + upgrade button (free tier) |
| `src/commands/slash/premium.ts` | Modify | Status (free) + compare → add upgrade button |

---

## Task 1: Create shared utility + i18n keys

**Files:**
- Create: `src/util/premium/upgradeButton.ts`
- Modify: `src/locales/*.json` (15 files)

- [ ] **Step 1: Create `src/util/premium/upgradeButton.ts`**

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

- [ ] **Step 2: Add English i18n keys to `src/locales/en.json`**

Add after the existing `premium.compare.no` line (search for `"premium.compare.no"`):

```json
"premium.upgrade_btn": "Upgrade Premium",
"premium.cooldown_hint": "⚡ Premium reduces this to **{{reduced}}**",
```

- [ ] **Step 3: Add Vietnamese keys to `src/locales/vi.json`**

```json
"premium.upgrade_btn": "Nâng cấp Premium",
"premium.cooldown_hint": "⚡ Premium giảm còn **{{reduced}}**",
```

- [ ] **Step 4: Add keys to all other 13 locale files**

Each file gets native translations for 2 keys. Add after the `premium.compare.no` line.

**`id.json`:**
```json
"premium.upgrade_btn": "Upgrade Premium",
"premium.cooldown_hint": "⚡ Premium mengurangi ini menjadi **{{reduced}}**",
```

**`es.json`:**
```json
"premium.upgrade_btn": "Mejorar a Premium",
"premium.cooldown_hint": "⚡ Premium reduce esto a **{{reduced}}**",
```

**`ja.json`:**
```json
"premium.upgrade_btn": "プレミアムにアップグレード",
"premium.cooldown_hint": "⚡ プレミアムなら **{{reduced}}** に短縮",
```

**`zh.json`:**
```json
"premium.upgrade_btn": "升级高级版",
"premium.cooldown_hint": "⚡ 高级版可缩短至 **{{reduced}}**",
```

**`ko.json`:**
```json
"premium.upgrade_btn": "프리미엄 업그레이드",
"premium.cooldown_hint": "⚡ 프리미엄으로 **{{reduced}}**로 단축",
```

**`pt-BR.json`:**
```json
"premium.upgrade_btn": "Upgrade Premium",
"premium.cooldown_hint": "⚡ Premium reduz para **{{reduced}}**",
```

**`fr.json`:**
```json
"premium.upgrade_btn": "Passer à Premium",
"premium.cooldown_hint": "⚡ Premium réduit à **{{reduced}}**",
```

**`de.json`:**
```json
"premium.upgrade_btn": "Auf Premium upgraden",
"premium.cooldown_hint": "⚡ Premium verkürzt auf **{{reduced}}**",
```

**`ru.json`:**
```json
"premium.upgrade_btn": "Улучшить до Premium",
"premium.cooldown_hint": "⚡ Premium сокращает до **{{reduced}}**",
```

**`tr.json`:**
```json
"premium.upgrade_btn": "Premium'a Yükselt",
"premium.cooldown_hint": "⚡ Premium bunu **{{reduced}}**'a düşürür",
```

**`it.json`:**
```json
"premium.upgrade_btn": "Passa a Premium",
"premium.cooldown_hint": "⚡ Premium riduce a **{{reduced}}**",
```

**`pl.json`:**
```json
"premium.upgrade_btn": "Ulepsz do Premium",
"premium.cooldown_hint": "⚡ Premium skraca do **{{reduced}}**",
```

**`nl.json`:**
```json
"premium.upgrade_btn": "Upgrade naar Premium",
"premium.cooldown_hint": "⚡ Premium verkort dit naar **{{reduced}}**",
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```bash
git add src/util/premium/upgradeButton.ts src/locales/*.json
git commit -m "feat: add buildPremiumButton utility and i18n keys for upgrade button"
```

---

## Task 2: Add upgrade button to manga handler

**Files:**
- Modify: `src/util/manga/handler.ts`

Two changes: (1) star charge error gets embed + button, (2) disabled "Premium only" button replaced with clickable Link button.

- [ ] **Step 1: Add import for `buildPremiumButton`**

Add after the existing imports at the top of `src/util/manga/handler.ts` (after line ~20):

```typescript
import { buildPremiumButton } from "../premium/upgradeButton";
```

- [ ] **Step 2: Replace the star charge error (line ~171)**

Change:
```typescript
                if (error instanceof InsufficientStarError) {
                    await interaction.reply({ content: t(locale, "manga.no_stars"), flags: MessageFlags.Ephemeral });
                    return;
                }
```

To:
```typescript
                if (error instanceof InsufficientStarError) {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "manga.no_stars"))
                        .setColor(0xed4245);
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
                    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
                    return;
                }
```

Note: `EmbedBuilder`, `ActionRowBuilder`, `ButtonBuilder` are already imported in this file.

- [ ] **Step 3: Replace the disabled "Premium only" button (lines ~91-98)**

In the `buildReadRow` function, change:

```typescript
    } else {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.MANGA_READ)
                .setLabel(t(locale, "manga.premium_only"))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
    }
```

To:

```typescript
    } else {
        row.addComponents(buildPremiumButton(locale));
    }
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(manga): add premium upgrade button to star charge error and page limit"
```

---

## Task 3: Add upgrade button to confession audio errors

**Files:**
- Modify: `src/commands/slash/confession.ts`

Three error points need embed + button. Confession uses `interaction.editReply()` (already deferred). Since confession.ts doesn't import `Reply`, we'll use raw `interaction.editReply()` with embeds + components directly (consistent with existing patterns in the file).

- [ ] **Step 1: Add imports**

Add to the discord.js import block at `src/commands/slash/confession.ts:1-9`:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChannelType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
```

Add after existing imports (e.g., after line ~50):

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
```

- [ ] **Step 2: Replace `audio_premium_only` error (line ~559-561)**

Change:
```typescript
        if (!tierConfig.confessionAudioEnabled) {
            await interaction.editReply({ content: t(locale, "confession.audio_premium_only") });
            return;
        }
```

To:
```typescript
        if (!tierConfig.confessionAudioEnabled) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "confession.audio_premium_only"))
                .setColor(0xed4245);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
```

- [ ] **Step 3: Replace `audio_too_large` error (line ~575-579)**

Change:
```typescript
        if (audioAttachment.size > tierConfig.confessionAudioMaxSize) {
            const maxMB = Math.round(tierConfig.confessionAudioMaxSize / 1_048_576);
            await interaction.editReply({ content: t(locale, "confession.audio_too_large", { max: String(maxMB) }) });
            return;
        }
```

To:
```typescript
        if (audioAttachment.size > tierConfig.confessionAudioMaxSize) {
            const maxMB = Math.round(tierConfig.confessionAudioMaxSize / 1_048_576);
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "confession.audio_too_large", { max: String(maxMB) }))
                .setColor(0xed4245);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
```

- [ ] **Step 4: Replace `audio_daily_limit` error (line ~581-585)**

Change:
```typescript
        const allowed = await checkAndIncrementAudioLimit(userId, tierConfig.confessionAudioDailyLimit);
        if (!allowed) {
            await interaction.editReply({ content: t(locale, "confession.audio_daily_limit") });
            return;
        }
```

To:
```typescript
        const allowed = await checkAndIncrementAudioLimit(userId, tierConfig.confessionAudioDailyLimit);
        if (!allowed) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "confession.audio_daily_limit"))
                .setColor(0xed4245);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(confession): add premium upgrade button to audio error messages"
```

---

## Task 4: Add upgrade button + cooldown hint to work, fish, mine, dungeon

**Files:**
- Modify: `src/commands/slash/work.ts`
- Modify: `src/commands/slash/fish.ts`
- Modify: `src/commands/slash/mine.ts`
- Modify: `src/commands/slash/dungeon.ts`

All four commands follow the same pattern: already have `tierConfig` from `PremiumService.getConfig()`, already have a cooldown embed. We add a hint line + upgrade button when user's cooldown matches the free tier value.

- [ ] **Step 1: Modify `src/commands/slash/work.ts`**

Add imports — change the discord.js import to include `ActionRowBuilder`, `ButtonBuilder`, `type MessageActionRowComponentBuilder`:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

Add after existing imports:

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
```

Then replace the cooldown block (lines ~67-75):

Change:
```typescript
            // Check cooldown
            const cdKey = `work_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "work.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
```

To:
```typescript
            // Check cooldown
            const cdKey = `work_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                let description = t(locale, "work.cooldown", { time: WorkService.formatCooldown(remaining) });
                const isFreeTier = tierConfig.workCooldownMs === TIER_CONFIG.free.workCooldownMs;
                if (isFreeTier) {
                    const reduced = WorkService.formatCooldown(TIER_CONFIG.star.workCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }
```

- [ ] **Step 2: Modify `src/commands/slash/fish.ts`**

Add the same imports as work.ts:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
```

Replace cooldown block (lines ~66-74):

Change:
```typescript
            // Check cooldown
            const cdKey = `fish_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "fish.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
```

To:
```typescript
            // Check cooldown
            const cdKey = `fish_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                let description = t(locale, "fish.cooldown", { time: WorkService.formatCooldown(remaining) });
                const isFreeTier = tierConfig.fishCooldownMs === TIER_CONFIG.free.fishCooldownMs;
                if (isFreeTier) {
                    const reduced = WorkService.formatCooldown(TIER_CONFIG.star.fishCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }
```

- [ ] **Step 3: Modify `src/commands/slash/mine.ts`**

Add imports:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
```

Note: `mine.ts` uses `WorkService.formatCooldown` (already imported). Also, `mine.ts` calls `PremiumService.getConfig(userId)` — check where. Read the cooldown check area.

Replace cooldown block (lines ~43-51):

Change:
```typescript
            // Check cooldown
            const cdKey = `mine_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "mine.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
```

To:
```typescript
            // Check cooldown
            const cdKey = `mine_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const tierConfig = await PremiumService.getConfig(userId);
                let description = t(locale, "mine.cooldown", { time: WorkService.formatCooldown(remaining) });
                const isFreeTier = tierConfig.mineCooldownMs === TIER_CONFIG.free.mineCooldownMs;
                if (isFreeTier) {
                    const reduced = WorkService.formatCooldown(TIER_CONFIG.star.mineCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }
```

Note: For mine, `tierConfig` may not be available at the cooldown check point (it might be loaded later). If so, add `const tierConfig = await PremiumService.getConfig(userId);` inside the cooldown block. The implementer should verify this and load `tierConfig` only when `remaining > 0` to avoid unnecessary Redis calls on non-cooldown paths.

- [ ] **Step 4: Modify `src/commands/slash/dungeon.ts`**

Add imports to the discord.js import (which already has `ActionRowBuilder`, `ButtonBuilder`, `ButtonStyle`). Add `type MessageActionRowComponentBuilder`:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

Add after existing imports:

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
```

Replace cooldown block (lines ~462-470):

Change:
```typescript
            // Check cooldown
            const cdKey = `dungeon_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
```

To:
```typescript
            // Check cooldown
            const cdKey = `dungeon_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const tierConfig = await PremiumService.getConfig(userId);
                let description = t(locale, "dungeon.cooldown", { time: WorkService.formatCooldown(remaining) });
                const isFreeTier = tierConfig.dungeonCooldownMs === TIER_CONFIG.free.dungeonCooldownMs;
                if (isFreeTier) {
                    const reduced = WorkService.formatCooldown(TIER_CONFIG.star.dungeonCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/work.ts src/commands/slash/fish.ts src/commands/slash/mine.ts src/commands/slash/dungeon.ts
git commit -m "feat(economy): add premium cooldown hints with upgrade button for free tier"
```

---

## Task 5: Add upgrade button to `/premium status` and `/premium compare`

**Files:**
- Modify: `src/commands/slash/premium.ts`

- [ ] **Step 1: Add imports**

Update the discord.js import at `src/commands/slash/premium.ts:1`:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

Add after existing imports:

```typescript
import { buildPremiumButton } from "../../util/premium/upgradeButton";
```

- [ ] **Step 2: Replace `handleStatus` free tier response (line ~247)**

Change:
```typescript
    await Reply.embedEdit(interaction, embed);
}
```

(The closing of `handleStatus` function)

To:
```typescript
    if (!status.isActive) {
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(buildPremiumButton(locale));
        await Reply.embedEditComponents(interaction, embed, [row]);
    } else {
        await Reply.embedEdit(interaction, embed);
    }
}
```

Note: The `status.isActive` check was already done earlier in the function. The free-tier path sets `embed.setColor(0x95a5a6)`. We add the button row only for free users.

- [ ] **Step 3: Replace `handleCompare` response (line ~318)**

Change:
```typescript
    await Reply.embedEdit(interaction, embed);
}
```

(The closing of `handleCompare` function)

To:
```typescript
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(buildPremiumButton(locale));
    await Reply.embedEditComponents(interaction, embed, [row]);
}
```

The compare page always shows the upgrade button (even for premium users — they might share the link).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/premium.ts
git commit -m "feat(premium): add upgrade button to status and compare commands"
```

---

## Task 6: Manual testing

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run start:dev`

- [ ] **Step 2: Test manga star charge error**

Use a manga command when free uses are exhausted and no stars available. Verify embed (red) with ⭐ Upgrade Premium button appears. Click the button — verify it opens `URL_HOMEPAGE/en/guide/premium/`.

- [ ] **Step 3: Test manga page limit**

Search for a manga with pages > 35. Verify the disabled "Premium only" button is replaced by a clickable ⭐ Upgrade Premium link button.

- [ ] **Step 4: Test confession audio errors**

As a free tier user, try `/confession submit` with an audio attachment. Verify embed (red) + ⭐ Upgrade Premium button.

- [ ] **Step 5: Test cooldown hints**

Run `/work` twice. On the second (cooldown), verify:
- Embed shows cooldown time + "⚡ Premium reduces this to **2h**"
- ⭐ Upgrade Premium button is present
- As a Star/Galaxy tier user (if testable), verify NO hint and NO button appears

Repeat for `/fish`, `/mine`, `/dungeon`.

- [ ] **Step 6: Test premium commands**

Run `/premium status` as a free user — verify ⭐ Upgrade Premium button.
Run `/premium compare` — verify ⭐ Upgrade Premium button appears.

- [ ] **Step 7: Commit fixes if any**

```bash
git add -A && git commit -m "fix: address issues found during premium button testing"
```

Only create this commit if fixes were needed.
