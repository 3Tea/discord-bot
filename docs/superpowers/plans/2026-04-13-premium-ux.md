# Premium UX — Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-facing premium commands (`/premium status`, `/premium compare`), premium badge on rank cards, and a landing page guide — completing the premium feature set.

**Architecture:** Extend existing `/premium` command with public subcommands (no DEV gate). Add `premiumBadge` field to `RankCardOptions` and render it on the canvas. Create content collection guide for the landing site.

**Tech Stack:** Discord.js v14, @napi-rs/canvas, Astro content collections, i18next

**Spec:** `docs/superpowers/specs/2026-04-13-premium-system-design.md`
**Depends on:** Plan 1 (Core) + Plan 2 (Integrations) — completed

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/commands/slash/premium.ts` | Add status + compare subcommands, split DEV gate |
| Modify | `src/util/xp/canvasRankCard.ts` | Render premium badge on rank card |
| Modify | `src/util/xp/canvasHelpers.ts` | Add `drawPremiumBadge` helper |
| Modify | `src/commands/slash/rank.ts` | Pass premium badge to renderRankCard |
| Modify | `src/locales/*.json` (15 files) | Add user-facing premium i18n keys |
| Create | `landing/src/content/guides/en/premium.md` | EN premium guide |
| Create | `landing/src/content/guides/vi/premium.md` | VI premium guide |
| Modify | `landing/src/data/guides.ts` | Register premium guide metadata |

---

### Task 1: Add i18n keys for user-facing premium commands

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

```json
"premium.status.title": "Your Premium Status",
"premium.status.active": "You have **{{tier}}** premium!",
"premium.status.expires": "Expires",
"premium.status.benefits": "Your Benefits",
"premium.status.free": "You don't have premium yet.",
"premium.status.free_desc": "Use `/premium compare` to see what premium offers.",
"premium.compare.title": "Premium Comparison",
"premium.compare.benefit": "Benefit",
"premium.compare.free_tier": "Free",
"premium.compare.star_tier": "⭐ Star",
"premium.compare.galaxy_tier": "🌌 Galaxy",
"premium.compare.manga_free": "Manga free uses/day",
"premium.compare.manga_pages": "Manga max pages",
"premium.compare.work_cd": "Work cooldown",
"premium.compare.fish_cd": "Fish cooldown",
"premium.compare.mine_cd": "Mine cooldown",
"premium.compare.dungeon_cd": "Dungeon cooldown",
"premium.compare.star_drop": "Star drop bonus",
"premium.compare.confession_skip": "Free confession skip CD",
"premium.compare.confession_vip": "Free confession VIP",
"premium.compare.daily_bonus": "Daily bonus stars",
"premium.compare.badge": "Rank card badge",
"premium.compare.unlimited": "Unlimited",
"premium.compare.yes": "✅",
"premium.compare.no": "❌",
"cmd.premium.desc": "Premium status and management"
```

Note: the `cmd.premium.desc` key already exists — update it from "bot developer only" to include user context.

- [ ] **Step 2: Add keys to vi.json**

```json
"premium.status.title": "Trạng Thái Premium Của Bạn",
"premium.status.active": "Bạn đang có premium **{{tier}}**!",
"premium.status.expires": "Hết hạn",
"premium.status.benefits": "Quyền Lợi Của Bạn",
"premium.status.free": "Bạn chưa có premium.",
"premium.status.free_desc": "Dùng `/premium compare` để xem premium mang lại gì.",
"premium.compare.title": "So Sánh Premium",
"premium.compare.benefit": "Quyền lợi",
"premium.compare.free_tier": "Miễn phí",
"premium.compare.star_tier": "⭐ Star",
"premium.compare.galaxy_tier": "🌌 Galaxy",
"premium.compare.manga_free": "Lượt manga miễn phí/ngày",
"premium.compare.manga_pages": "Số trang manga tối đa",
"premium.compare.work_cd": "Thời gian chờ làm việc",
"premium.compare.fish_cd": "Thời gian chờ câu cá",
"premium.compare.mine_cd": "Thời gian chờ khai thác",
"premium.compare.dungeon_cd": "Thời gian chờ hầm ngục",
"premium.compare.star_drop": "Bonus tỉ lệ rơi star",
"premium.compare.confession_skip": "Bỏ qua CD confession miễn phí",
"premium.compare.confession_vip": "Confession VIP miễn phí",
"premium.compare.daily_bonus": "Star bonus hàng ngày",
"premium.compare.badge": "Huy hiệu rank card",
"premium.compare.unlimited": "Không giới hạn",
"premium.compare.yes": "✅",
"premium.compare.no": "❌",
"cmd.premium.desc": "Trạng thái và quản lý premium"
```

- [ ] **Step 3: Add keys to all other 13 locale files with native translations**

- [ ] **Step 4: Commit**

```bash
git add src/locales/
git commit -m "feat(premium): add i18n keys for user-facing premium commands"
```

---

### Task 2: Add status + compare subcommands to /premium

**Files:**
- Modify: `src/commands/slash/premium.ts`

- [ ] **Step 1: Add two new subcommands to the builder**

After the existing `lookup` subcommand builder, add:

```typescript
        .addSubcommand((sub) =>
            sub
                .setName("status")
                .setDescription("View your premium status and benefits")
        )
        .addSubcommand((sub) =>
            sub
                .setName("compare")
                .setDescription("Compare Free vs Star vs Galaxy benefits")
        )
```

- [ ] **Step 2: Split the DEV gate to allow public subcommands**

Replace the execute function to check subcommand FIRST, then gate admin commands:

```typescript
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);

        // Public subcommands — no permission check
        if (subcommand === "status" || subcommand === "compare") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            try {
                if (subcommand === "status") {
                    await handleStatus(interaction, locale);
                } else {
                    await handleCompare(interaction, locale);
                }
            } catch {
                await interaction.editReply(t(locale, "common.error"));
            }
            return;
        }

        // Admin subcommands — DEV_USER_ID only
        if (interaction.user.id !== DEV_USER_ID) {
            await interaction.reply({
                content: t(await resolveLocale(interaction).catch(() => "en" as const), "premium.no_permission"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            switch (subcommand) {
                case "grant":
                    await handleGrant(interaction, locale);
                    break;
                case "revoke":
                    await handleRevoke(interaction, locale);
                    break;
                case "lookup":
                    await handleLookup(interaction, locale);
                    break;
            }
        } catch {
            await interaction.editReply(t(locale, "common.error"));
        }
    },
```

- [ ] **Step 3: Implement handleStatus**

Add import for `getTierConfig`:
```typescript
import { getTierConfig } from "../../services/premium/premium.config";
```

```typescript
async function handleStatus(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const status = await PremiumService.getPremiumStatus(interaction.user.id);

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "premium.status.title"))
        .setTimestamp();

    if (status.isActive) {
        const config = getTierConfig(status.tier);
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:R>`
            : t(locale, "premium.lookup.lifetime");

        embed
            .setColor(status.tier === "galaxy" ? 0x9b59b6 : 0xf39c12)
            .setDescription(t(locale, "premium.status.active", { tier: (status.tier ?? "").toUpperCase() }))
            .addFields(
                { name: t(locale, "premium.status.expires"), value: untilStr, inline: true },
                { name: t(locale, "premium.compare.manga_free"), value: Number.isFinite(config.mangaFreeUses) ? `${config.mangaFreeUses}/day` : t(locale, "premium.compare.unlimited"), inline: true },
                { name: t(locale, "premium.compare.manga_pages"), value: `${config.mangaMaxPages}`, inline: true },
                { name: t(locale, "premium.compare.star_drop"), value: `×${config.starDropMultiplier}`, inline: true },
                { name: t(locale, "premium.compare.daily_bonus"), value: `+${config.dailyBonusStars}`, inline: true },
            );
    } else {
        embed
            .setColor(0x95a5a6)
            .setDescription(t(locale, "premium.status.free"))
            .addFields({ name: "\u200b", value: t(locale, "premium.status.free_desc") });
    }

    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 4: Implement handleCompare**

```typescript
function formatCd(ms: number): string {
    const h = ms / (60 * 60 * 1000);
    if (h >= 1) return `${h}h`;
    return `${ms / (60 * 1000)}m`;
}

async function handleCompare(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const free = getTierConfig(null);
    const star = getTierConfig("star");
    const galaxy = getTierConfig("galaxy");

    const yes = t(locale, "premium.compare.yes");
    const no = t(locale, "premium.compare.no");
    const unlimited = t(locale, "premium.compare.unlimited");

    const rows = [
        [t(locale, "premium.compare.manga_free"), `${free.mangaFreeUses}`, `${star.mangaFreeUses}`, unlimited],
        [t(locale, "premium.compare.manga_pages"), `${free.mangaMaxPages}`, `${star.mangaMaxPages}`, `${galaxy.mangaMaxPages}`],
        [t(locale, "premium.compare.work_cd"), formatCd(free.workCooldownMs), formatCd(star.workCooldownMs), formatCd(galaxy.workCooldownMs)],
        [t(locale, "premium.compare.fish_cd"), formatCd(free.fishCooldownMs), formatCd(star.fishCooldownMs), formatCd(galaxy.fishCooldownMs)],
        [t(locale, "premium.compare.mine_cd"), formatCd(free.mineCooldownMs), formatCd(star.mineCooldownMs), formatCd(galaxy.mineCooldownMs)],
        [t(locale, "premium.compare.dungeon_cd"), formatCd(free.dungeonCooldownMs), formatCd(star.dungeonCooldownMs), formatCd(galaxy.dungeonCooldownMs)],
        [t(locale, "premium.compare.star_drop"), "×1.0", "×1.5", "×2.0"],
        [t(locale, "premium.compare.confession_skip"), no, yes, yes],
        [t(locale, "premium.compare.confession_vip"), no, no, yes],
        [t(locale, "premium.compare.daily_bonus"), "0", "0", "+2"],
        [t(locale, "premium.compare.badge"), no, "⭐", "🌌"],
    ];

    const description = rows.map(([label, f, s, g]) => `**${label}**\n${t(locale, "premium.compare.free_tier")}: ${f} | ${t(locale, "premium.compare.star_tier")}: ${s} | ${t(locale, "premium.compare.galaxy_tier")}: ${g}`).join("\n\n");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "premium.compare.title"))
        .setDescription(description)
        .setColor(0xf39c12)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 5: Update command description**

Change the SlashCommandBuilder description from "Premium management (bot developer only)" to:
```typescript
.setDescription("Premium status and management")
```

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/premium.ts
git commit -m "feat(premium): add /premium status and /premium compare user commands"
```

---

### Task 3: Add premium badge to rank card

**Files:**
- Modify: `src/util/xp/canvasHelpers.ts`
- Modify: `src/util/xp/canvasRankCard.ts`
- Modify: `src/commands/slash/rank.ts`

- [ ] **Step 1: Add drawPremiumBadge to canvasHelpers.ts**

Add this function at the end of `src/util/xp/canvasHelpers.ts` (before the final export or at the bottom):

```typescript
export function drawPremiumBadge(ctx: Ctx, badge: string, x: number, y: number): void {
    if (!badge) return;

    const label = badge === "galaxy" ? "🌌 GALAXY" : "⭐ STAR";
    const colors: [string, string] = badge === "galaxy" ? ["#9b59b6", "#6a0dad"] : ["#f39c12", "#e67e22"];

    ctx.font = '12px "Inter Bold"';
    const tw = ctx.measureText(label).width;
    const bw = tw + 16;
    const bh = 22;

    const grad = ctx.createLinearGradient(x, y, x + bw, y);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);

    roundRect(ctx, x, y, bw, bh, 6);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + bw / 2, y + bh / 2);
}
```

- [ ] **Step 2: Add premiumBadge to RankCardOptions**

In `src/util/xp/canvasRankCard.ts`, add to the `RankCardOptions` interface:

```typescript
premiumBadge?: string | null;
```

In the destructuring inside `renderRankCard`, add:
```typescript
premiumBadge = null,
```

After the rank badges are drawn (after `drawRankBadge` for global), add:
```typescript
if (premiumBadge) {
    drawPremiumBadge(ctx, premiumBadge, AV_CX - 35, badgeStartY + badgeH + 6 + 30 + 8);
}
```

Also import `drawPremiumBadge` from canvasHelpers.

- [ ] **Step 3: Pass premiumBadge from rank command**

Read `src/commands/slash/rank.ts` to find where `renderRankCard` is called. Import `PremiumService` and pass the badge:

```typescript
import PremiumService from "../../services/premium/premium.service";
```

Before the `renderRankCard` call, get the config:
```typescript
const tierConfig = await PremiumService.getConfig(targetUserId);
```

Add to the options object:
```typescript
premiumBadge: tierConfig.badge,
```

- [ ] **Step 4: Commit**

```bash
git add src/util/xp/canvasHelpers.ts src/util/xp/canvasRankCard.ts src/commands/slash/rank.ts
git commit -m "feat(premium): add premium badge to rank card canvas"
```

---

### Task 4: Create landing page premium guide

**Files:**
- Create: `landing/src/content/guides/en/premium.md`
- Create: `landing/src/content/guides/vi/premium.md`
- Modify: `landing/src/data/guides.ts`

- [ ] **Step 1: Register guide metadata**

Add to `landing/src/data/guides.ts`:

```typescript
premium: { slug: "premium", label: "Premium", color: "#F39C12", bg: "rgba(243,156,18,0.15)" },
```

- [ ] **Step 2: Create EN guide**

Create `landing/src/content/guides/en/premium.md`:

```markdown
---
title: Premium
description: Upgrade your experience with Star and Galaxy premium tiers — more manga, faster cooldowns, and exclusive perks.
icon: "👑"
order: 3
relatedCommands: ["premium", "wallet"]
---

## Overview

3AT offers two premium tiers — **Star** ⭐ and **Galaxy** 🌌 — that enhance your experience across all servers. Premium is **per-user and global**: buy once, enjoy everywhere.

## Tier Comparison

| Benefit | Free | ⭐ Star | 🌌 Galaxy |
|---------|------|---------|-----------|
| Manga free uses/day | 3 | 10 | Unlimited |
| Manga max pages | 35 | 70 | 100 |
| Work cooldown | 4h | 2h | 1h |
| Fish cooldown | 1h | 30m | 15m |
| Mine cooldown | 2h | 1h | 30m |
| Dungeon cooldown | 1h | 30m | 15m |
| Star drop rate bonus | — | +50% | +100% |
| Confession skip cooldown | 50 coins | Free | Free |
| Confession VIP embed | 5 gems | 5 gems | Free |
| Daily bonus stars | — | — | +2 |
| Rank card badge | — | ⭐ Star | 🌌 Galaxy |
| Rank card theme | Standard | Standard | Exclusive Galaxy |

> **Note:** Free users can access every feature. Premium makes things faster, more generous, and adds exclusive cosmetics — it never locks content.

## How to Get Premium

Premium is available through the bot owner. Contact the support server for purchasing options. Once activated, your premium works on **every server** with 3AT.

## Managing Your Premium

| Command | What It Does |
|---------|-------------|
| `/premium status` | View your current tier, expiry date, and active benefits |
| `/premium compare` | Side-by-side comparison of all tiers |

## Tips

1. **Star tier is the sweet spot** for most users — 10 manga/day and halved cooldowns cover casual to active play.
2. **Galaxy tier** is for power users — unlimited manga, fastest cooldowns, +2 daily bonus stars, and the exclusive Galaxy rank card theme.
3. **Premium stacks with streaks** — the daily bonus stars compound with your wallet daily streak for maximum star income.
4. **All cooldown reductions apply immediately** — the moment your premium activates, your next command uses the reduced cooldown.
```

- [ ] **Step 3: Create VI guide**

Create `landing/src/content/guides/vi/premium.md` with native Vietnamese translation of the above, matching structure exactly.

- [ ] **Step 4: Commit**

```bash
git add landing/src/data/guides.ts landing/src/content/guides/en/premium.md landing/src/content/guides/vi/premium.md
git commit -m "feat(landing): add premium guide page"
```

---

### Task 5: Verify build

- [ ] **Step 1: Run bot build**

```bash
npm run build
```

- [ ] **Step 2: Run landing site build**

```bash
cd landing && npm run build
```

- [ ] **Step 3: Spot-check premium commands and rank card**

If dev environment available, test:
- `/premium status` — should show your (free) status
- `/premium compare` — should show comparison table
- `/premium grant` — should still require DEV_USER_ID
