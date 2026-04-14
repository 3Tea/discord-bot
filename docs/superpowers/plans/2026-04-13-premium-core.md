# Premium Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add premium infrastructure — data model, service layer, tier config, admin commands, and expiry cron — so premium can be granted, revoked, checked, and expired. No command integrations yet (that's Plan 2).

**Architecture:** Extend `UserWallet` model with premium fields. New `PremiumService` reads/writes premium status with Redis caching. Tier config centralizes all benefit values. Admin-only `/premium` command for grant/revoke/lookup. Cron job expires stale premium every 10 minutes.

**Tech Stack:** Mongoose, ioredis, Discord.js v14 (SlashCommandBuilder), i18next

**Spec:** `docs/superpowers/specs/2026-04-13-premium-system-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/models/userWallet.model.ts` | Add premium fields to schema |
| Modify | `src/models/transaction.model.ts` | Add premium transaction types |
| Create | `src/services/premium/premium.config.ts` | Tier benefit values |
| Create | `src/services/premium/premium.service.ts` | Premium CRUD + Redis cache |
| Create | `src/services/premium/premiumExpiry.ts` | Cron job to expire stale premium |
| Create | `src/commands/slash/premium.ts` | Admin grant/revoke/lookup command |
| Modify | `src/bin/www.ts` | Start expiry cron on boot |
| Modify | `src/locales/en.json` | English translation keys |
| Modify | `src/locales/vi.json` | Vietnamese translation keys |
| Modify | 13 other locale files | Premium translation keys |

---

### Task 1: Extend UserWallet model with premium fields

**Files:**
- Modify: `src/models/userWallet.model.ts`

- [ ] **Step 1: Add premium fields to IUserWallet interface**

In `src/models/userWallet.model.ts`, replace the interface and schema to add 4 new fields:

```typescript
import { Document, model, Schema } from "mongoose";

export type PremiumTier = "star" | "galaxy";
export type PremiumSource = "auto" | "manual";

export interface IUserWallet extends Document {
    userId: string;
    star: number;
    lastDaily: Date | null;
    dailyStreak: number;
    lastStreakDate: Date | null;
    claimedMilestones: string[];
    premiumTier: PremiumTier | null;
    premiumUntil: Date | null;
    premiumSource: PremiumSource | null;
    premiumGrantedBy: string | null;
}

const userWalletSchema = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        star: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        dailyStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
        claimedMilestones: { type: [String], default: [] },
        premiumTier: { type: String, enum: ["star", "galaxy", null], default: null },
        premiumUntil: { type: Date, default: null },
        premiumSource: { type: String, enum: ["auto", "manual", null], default: null },
        premiumGrantedBy: { type: String, default: null },
    },
    { timestamps: true, collection: "UserWallets" }
);

userWalletSchema.index({ userId: 1 }, { unique: true });
userWalletSchema.index({ star: -1 });
userWalletSchema.index({ premiumTier: 1, premiumUntil: 1 });

export default model<IUserWallet>("UserWallet", userWalletSchema);
```

Key changes:
- Export `PremiumTier` and `PremiumSource` types (used by other files)
- 4 new fields: `premiumTier`, `premiumUntil`, `premiumSource`, `premiumGrantedBy`
- New compound index on `premiumTier + premiumUntil` for expiry cron queries

- [ ] **Step 2: Commit**

```bash
git add src/models/userWallet.model.ts
git commit -m "feat(premium): add premium fields to UserWallet model"
```

---

### Task 2: Add premium transaction types

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add 6 premium transaction types**

In `src/models/transaction.model.ts`, add the new types to BOTH the TypeScript union (top) AND the schema enum array (bottom):

Add to the `TransactionType` union (after `"dungeon"`):

```typescript
    | "premium_activate"
    | "premium_expire"
    | "premium_revoke"
    | "premium_upgrade"
    | "premium_downgrade"
    | "premium_extend";
```

Add to the schema `enum` array (after `"dungeon"`):

```typescript
                "premium_activate",
                "premium_expire",
                "premium_revoke",
                "premium_upgrade",
                "premium_downgrade",
                "premium_extend",
```

- [ ] **Step 2: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(premium): add premium transaction types"
```

---

### Task 3: Create premium tier config

**Files:**
- Create: `src/services/premium/premium.config.ts`

- [ ] **Step 1: Create the tier config file**

```typescript
// src/services/premium/premium.config.ts

import type { PremiumTier } from "../../models/userWallet.model";

export interface TierConfig {
    mangaFreeUses: number;
    mangaMaxPages: number;
    workCooldownMs: number;
    fishCooldownMs: number;
    mineCooldownMs: number;
    dungeonCooldownMs: number;
    starDropMultiplier: number;
    confessionSkipCdFree: boolean;
    confessionVipFree: boolean;
    dailyBonusStars: number;
    badge: string | null;
    rankCardTheme: string;
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const TIER_CONFIG: Record<"free" | PremiumTier, TierConfig> = {
    free: {
        mangaFreeUses: 3,
        mangaMaxPages: 35,
        workCooldownMs: 4 * HOUR,
        fishCooldownMs: 1 * HOUR,
        mineCooldownMs: 2 * HOUR,
        dungeonCooldownMs: 1 * HOUR,
        starDropMultiplier: 1.0,
        confessionSkipCdFree: false,
        confessionVipFree: false,
        dailyBonusStars: 0,
        badge: null,
        rankCardTheme: "standard",
    },
    star: {
        mangaFreeUses: 10,
        mangaMaxPages: 70,
        workCooldownMs: 2 * HOUR,
        fishCooldownMs: 30 * MINUTE,
        mineCooldownMs: 1 * HOUR,
        dungeonCooldownMs: 30 * MINUTE,
        starDropMultiplier: 1.5,
        confessionSkipCdFree: true,
        confessionVipFree: false,
        dailyBonusStars: 0,
        badge: "star",
        rankCardTheme: "standard",
    },
    galaxy: {
        mangaFreeUses: Infinity,
        mangaMaxPages: 100,
        workCooldownMs: 1 * HOUR,
        fishCooldownMs: 15 * MINUTE,
        mineCooldownMs: 30 * MINUTE,
        dungeonCooldownMs: 15 * MINUTE,
        starDropMultiplier: 2.0,
        confessionSkipCdFree: true,
        confessionVipFree: true,
        dailyBonusStars: 2,
        badge: "galaxy",
        rankCardTheme: "galaxy",
    },
} as const;

export function getTierConfig(tier: PremiumTier | null): TierConfig {
    return TIER_CONFIG[tier ?? "free"];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/premium/premium.config.ts
git commit -m "feat(premium): create tier config with benefit values"
```

---

### Task 4: Create premium service

**Files:**
- Create: `src/services/premium/premium.service.ts`

- [ ] **Step 1: Create the premium service**

```typescript
// src/services/premium/premium.service.ts

import UserWalletModel, { PremiumTier, PremiumSource } from "../../models/userWallet.model";
import TransactionModel, { TransactionType } from "../../models/transaction.model";
import redis from "../../connector/redis/index";
import { getTierConfig, TierConfig } from "./premium.config";

const GLOBAL_GUILD_ID = "global";
const CACHE_TTL = 300; // 5 minutes

export interface PremiumStatus {
    tier: PremiumTier | null;
    isActive: boolean;
    until: Date | null;
    source: PremiumSource | null;
}

// --- Redis cache helpers ---

function cacheKey(userId: string): string {
    return `premium:${userId}`;
}

async function cacheGet(userId: string): Promise<PremiumStatus | null> {
    return redis.getJson(cacheKey(userId));
}

async function cacheSet(userId: string, status: PremiumStatus): Promise<void> {
    await redis.setJson(cacheKey(userId), status, CACHE_TTL);
}

async function cacheClear(userId: string): Promise<void> {
    await redis.deleteKey(cacheKey(userId));
}

// --- Transaction logging ---

async function logPremiumTransaction(
    userId: string,
    type: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await TransactionModel.create({
        userId,
        guildId: GLOBAL_GUILD_ID,
        type,
        coinDelta: 0,
        gemDelta: 0,
        metadata,
    });
}

// --- Duration parsing ---

export type DurationKey = "7d" | "30d" | "90d" | "365d" | "lifetime";

const DURATION_MS: Record<Exclude<DurationKey, "lifetime">, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "365d": 365 * 24 * 60 * 60 * 1000,
};

function computeExpiry(duration: DurationKey, existingUntil: Date | null): Date | null {
    if (duration === "lifetime") return null;
    const baseDate = existingUntil && existingUntil.getTime() > Date.now() ? existingUntil : new Date();
    return new Date(baseDate.getTime() + DURATION_MS[duration]);
}

// --- Public API ---

async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
    const cached = await cacheGet(userId);
    if (cached) return cached;

    const wallet = await UserWalletModel.findOne({ userId }).lean();
    if (!wallet || !wallet.premiumTier) {
        const status: PremiumStatus = { tier: null, isActive: false, until: null, source: null };
        await cacheSet(userId, status);
        return status;
    }

    const isExpired = wallet.premiumUntil !== null && wallet.premiumUntil.getTime() < Date.now();
    if (isExpired) {
        // Lazy expiry: clean up on read
        await clearPremium(userId);
        await logPremiumTransaction(userId, "premium_expire", {
            expiredTier: wallet.premiumTier,
            expiredAt: wallet.premiumUntil,
        });
        const status: PremiumStatus = { tier: null, isActive: false, until: null, source: null };
        await cacheSet(userId, status);
        return status;
    }

    const status: PremiumStatus = {
        tier: wallet.premiumTier as PremiumTier,
        isActive: true,
        until: wallet.premiumUntil,
        source: wallet.premiumSource as PremiumSource | null,
    };
    await cacheSet(userId, status);
    return status;
}

async function getTier(userId: string): Promise<PremiumTier | null> {
    const { tier } = await getPremiumStatus(userId);
    return tier;
}

async function getConfig(userId: string): Promise<TierConfig> {
    const tier = await getTier(userId);
    return getTierConfig(tier);
}

async function activate(
    userId: string,
    tier: PremiumTier,
    duration: DurationKey,
    source: PremiumSource,
    grantedBy?: string
): Promise<{ action: "activate" | "extend" | "upgrade" | "downgrade"; until: Date | null }> {
    const current = await getPremiumStatus(userId);
    let action: "activate" | "extend" | "upgrade" | "downgrade";
    let transactionType: TransactionType;
    let premiumUntil: Date | null;

    if (!current.isActive) {
        // New activation
        action = "activate";
        transactionType = "premium_activate";
        premiumUntil = computeExpiry(duration, null);
    } else if (current.tier === tier) {
        // Same tier — extend duration
        action = "extend";
        transactionType = "premium_extend";
        premiumUntil = computeExpiry(duration, current.until);
    } else if (current.tier === "star" && tier === "galaxy") {
        // Upgrade — switch immediately
        action = "upgrade";
        transactionType = "premium_upgrade";
        premiumUntil = computeExpiry(duration, null);
    } else {
        // Downgrade (galaxy → star) — switch immediately for manual
        action = "downgrade";
        transactionType = "premium_downgrade";
        premiumUntil = computeExpiry(duration, null);
    }

    // Ensure wallet exists
    await UserWalletModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, star: 0, dailyStreak: 0, claimedMilestones: [] } },
        { upsert: true }
    );

    await UserWalletModel.updateOne(
        { userId },
        {
            $set: {
                premiumTier: tier,
                premiumUntil,
                premiumSource: source,
                premiumGrantedBy: grantedBy ?? null,
            },
        }
    );

    await logPremiumTransaction(userId, transactionType, {
        tier,
        duration,
        source,
        grantedBy: grantedBy ?? null,
        until: premiumUntil?.toISOString() ?? "lifetime",
        previousTier: current.tier,
    });

    await cacheClear(userId);

    return { action, until: premiumUntil };
}

async function revoke(userId: string, revokedBy: string, reason?: string): Promise<boolean> {
    const current = await getPremiumStatus(userId);
    if (!current.isActive) return false;

    await clearPremium(userId);

    await logPremiumTransaction(userId, "premium_revoke", {
        revokedTier: current.tier,
        revokedBy,
        reason: reason ?? null,
    });

    return true;
}

async function clearPremium(userId: string): Promise<void> {
    await UserWalletModel.updateOne(
        { userId },
        {
            $set: {
                premiumTier: null,
                premiumUntil: null,
                premiumSource: null,
                premiumGrantedBy: null,
            },
        }
    );
    await cacheClear(userId);
}

export default { getPremiumStatus, getTier, getConfig, activate, revoke };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/premium/premium.service.ts
git commit -m "feat(premium): create premium service with cache and CRUD"
```

---

### Task 5: Create premium expiry cron

**Files:**
- Create: `src/services/premium/premiumExpiry.ts`
- Modify: `src/bin/www.ts`

- [ ] **Step 1: Create the expiry cron file**

```typescript
// src/services/premium/premiumExpiry.ts

import UserWalletModel from "../../models/userWallet.model";
import TransactionModel from "../../models/transaction.model";
import redis from "../../connector/redis/index";
import { logger } from "../../util/log/logger.mixed";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const GLOBAL_GUILD_ID = "global";

async function expireStale(): Promise<void> {
    const now = new Date();

    const expired = await UserWalletModel.find({
        premiumTier: { $ne: null },
        premiumUntil: { $ne: null, $lt: now },
    }).lean();

    if (expired.length === 0) return;

    const userIds = expired.map((w) => w.userId);

    // Bulk clear premium
    await UserWalletModel.updateMany(
        { userId: { $in: userIds } },
        {
            $set: {
                premiumTier: null,
                premiumUntil: null,
                premiumSource: null,
                premiumGrantedBy: null,
            },
        }
    );

    // Log transactions
    const transactions = expired.map((w) => ({
        userId: w.userId,
        guildId: GLOBAL_GUILD_ID,
        type: "premium_expire" as const,
        coinDelta: 0,
        gemDelta: 0,
        metadata: { expiredTier: w.premiumTier, expiredAt: w.premiumUntil },
    }));
    await TransactionModel.insertMany(transactions);

    // Clear Redis cache
    await Promise.all(userIds.map((id) => redis.deleteKey(`premium:${id}`)));

    logger.info(`[premiumExpiry] Expired ${expired.length} premium subscription(s)`);
}

export function startPremiumExpiry(): void {
    setTimeout(() => {
        expireStale().catch((error) => {
            logger.error(`[premiumExpiry] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, 10_000);

    setInterval(() => {
        expireStale().catch((error) => {
            logger.error(`[premiumExpiry] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, INTERVAL_MS);
}
```

- [ ] **Step 2: Wire up cron in www.ts**

Read `src/bin/www.ts` to find where `startGuildStatsAggregator` is imported/called. Add the premium expiry import and call right next to it:

```typescript
import { startPremiumExpiry } from "../services/premium/premiumExpiry";
```

And call it in the same block where `startGuildStatsAggregator()` is called:

```typescript
startPremiumExpiry();
```

- [ ] **Step 3: Commit**

```bash
git add src/services/premium/premiumExpiry.ts src/bin/www.ts
git commit -m "feat(premium): add premium expiry cron (10-minute interval)"
```

---

### Task 6: Add i18n keys for premium commands

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

Add these keys to `src/locales/en.json` (inside the root object):

```json
"premium.no_permission": "Only the bot developer can use this command.",
"premium.grant.success": "Granted **{{tier}}** premium to <@{{userId}}> for **{{duration}}**.",
"premium.grant.extended": "Extended **{{tier}}** premium for <@{{userId}}>. New expiry: **{{until}}**.",
"premium.grant.upgraded": "Upgraded <@{{userId}}> from **{{from}}** to **{{tier}}**. Expires: **{{until}}**.",
"premium.grant.downgraded": "Downgraded <@{{userId}}> from **{{from}}** to **{{tier}}**. Expires: **{{until}}**.",
"premium.revoke.success": "Revoked premium from <@{{userId}}>. Previous tier: **{{tier}}**.",
"premium.revoke.not_active": "This user does not have an active premium subscription.",
"premium.lookup.title": "Premium Lookup: {{username}}",
"premium.lookup.no_premium": "No active premium.",
"premium.lookup.tier": "Tier",
"premium.lookup.expires": "Expires",
"premium.lookup.lifetime": "Lifetime",
"premium.lookup.source": "Source",
"premium.lookup.granted_by": "Granted By",
"cmd.premium.desc": "Premium management (bot developer only)"
```

- [ ] **Step 2: Add keys to vi.json**

Add these keys to `src/locales/vi.json`:

```json
"premium.no_permission": "Chỉ nhà phát triển bot mới có thể sử dụng lệnh này.",
"premium.grant.success": "Đã cấp premium **{{tier}}** cho <@{{userId}}> trong **{{duration}}**.",
"premium.grant.extended": "Đã gia hạn premium **{{tier}}** cho <@{{userId}}>. Hết hạn mới: **{{until}}**.",
"premium.grant.upgraded": "Đã nâng cấp <@{{userId}}> từ **{{from}}** lên **{{tier}}**. Hết hạn: **{{until}}**.",
"premium.grant.downgraded": "Đã hạ cấp <@{{userId}}> từ **{{from}}** xuống **{{tier}}**. Hết hạn: **{{until}}**.",
"premium.revoke.success": "Đã thu hồi premium của <@{{userId}}>. Tier trước: **{{tier}}**.",
"premium.revoke.not_active": "Người dùng này không có premium đang hoạt động.",
"premium.lookup.title": "Tra cứu Premium: {{username}}",
"premium.lookup.no_premium": "Không có premium.",
"premium.lookup.tier": "Tier",
"premium.lookup.expires": "Hết hạn",
"premium.lookup.lifetime": "Vĩnh viễn",
"premium.lookup.source": "Nguồn",
"premium.lookup.granted_by": "Được cấp bởi",
"cmd.premium.desc": "Quản lý premium (chỉ nhà phát triển bot)"
```

- [ ] **Step 3: Add keys to all other 13 locale files**

Add the same keys to `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json` — each with native translations. These are admin-facing strings so quality is less critical than user-facing, but must be native language, not English placeholders.

- [ ] **Step 4: Commit**

```bash
git add src/locales/
git commit -m "feat(premium): add i18n keys for premium commands (15 locales)"
```

---

### Task 7: Create /premium admin command

**Files:**
- Create: `src/commands/slash/premium.ts`

- [ ] **Step 1: Create the premium command file**

```typescript
// src/commands/slash/premium.ts

import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { DEV_USER_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import PremiumService, { DurationKey } from "../../services/premium/premium.service";
import type { PremiumTier } from "../../models/userWallet.model";

const DURATION_LABELS: Record<DurationKey, string> = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "365d": "365 days",
    lifetime: "Lifetime",
};

export default {
    data: new SlashCommandBuilder()
        .setName("premium")
        .setDescription("Premium management (bot developer only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.premium.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("grant")
                .setDescription("Grant premium to a user")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("tier")
                        .setDescription("Premium tier")
                        .setRequired(true)
                        .addChoices(
                            { name: "Star", value: "star" },
                            { name: "Galaxy", value: "galaxy" }
                        )
                )
                .addStringOption((opt) =>
                    opt
                        .setName("duration")
                        .setDescription("Subscription duration")
                        .setRequired(true)
                        .addChoices(
                            { name: "7 days", value: "7d" },
                            { name: "30 days", value: "30d" },
                            { name: "90 days", value: "90d" },
                            { name: "365 days", value: "365d" },
                            { name: "Lifetime", value: "lifetime" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("revoke")
                .setDescription("Revoke premium from a user")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName("reason").setDescription("Reason for revocation").setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("lookup")
                .setDescription("Check a user's premium status")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
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
            const subcommand = interaction.options.getSubcommand(true);

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
};

async function handleGrant(
    interaction: ChatInputCommandInteraction,
    locale: string
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const tier = interaction.options.getString("tier", true) as PremiumTier;
    const duration = interaction.options.getString("duration", true) as DurationKey;

    const result = await PremiumService.activate(target.id, tier, duration, "manual", interaction.user.id);
    const untilStr = result.until ? `<t:${Math.floor(result.until.getTime() / 1000)}:F>` : "Lifetime";

    let key: string;
    const params: Record<string, string> = { userId: target.id, tier, until: untilStr };

    switch (result.action) {
        case "activate":
            key = "premium.grant.success";
            params.duration = DURATION_LABELS[duration];
            break;
        case "extend":
            key = "premium.grant.extended";
            break;
        case "upgrade": {
            key = "premium.grant.upgraded";
            const prev = await PremiumService.getPremiumStatus(target.id);
            params.from = prev.tier ?? "free";
            break;
        }
        case "downgrade": {
            key = "premium.grant.downgraded";
            const prev = await PremiumService.getPremiumStatus(target.id);
            params.from = prev.tier ?? "free";
            break;
        }
    }

    const embed = new EmbedBuilder().setDescription(t(locale, key, params)).setColor(0xf39c12).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleRevoke(
    interaction: ChatInputCommandInteraction,
    locale: string
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const status = await PremiumService.getPremiumStatus(target.id);
    const revoked = await PremiumService.revoke(target.id, interaction.user.id, reason);

    if (!revoked) {
        await interaction.editReply(t(locale, "premium.revoke.not_active"));
        return;
    }

    const embed = new EmbedBuilder()
        .setDescription(t(locale, "premium.revoke.success", { userId: target.id, tier: status.tier ?? "none" }))
        .setColor(0xe74c3c)
        .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleLookup(
    interaction: ChatInputCommandInteraction,
    locale: string
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const status = await PremiumService.getPremiumStatus(target.id);

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "premium.lookup.title", { username: target.username }))
        .setColor(status.isActive ? 0xf39c12 : 0x95a5a6)
        .setTimestamp();

    if (!status.isActive) {
        embed.setDescription(t(locale, "premium.lookup.no_premium"));
    } else {
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:F>`
            : t(locale, "premium.lookup.lifetime");

        embed.addFields(
            { name: t(locale, "premium.lookup.tier"), value: status.tier!.toUpperCase(), inline: true },
            { name: t(locale, "premium.lookup.expires"), value: untilStr, inline: true },
            { name: t(locale, "premium.lookup.source"), value: status.source ?? "—", inline: true }
        );
    }

    await interaction.editReply({ embeds: [embed] });
}
```

Note about the `handleGrant` upgrade/downgrade case: we capture `status.tier` BEFORE calling `activate()`, so we need to read it beforehand. Let me fix the logic — the previous tier info should come from `result` metadata, not a re-read after activation. Actually, for the upgrade/downgrade message, the previous tier is known from `result.action` context — if action is "upgrade" the previous was "star", if "downgrade" the previous was "galaxy". Simplified:

Replace the upgrade/downgrade cases with:

```typescript
        case "upgrade":
            key = "premium.grant.upgraded";
            params.from = "star"; // upgrade is always star → galaxy
            break;
        case "downgrade":
            key = "premium.grant.downgraded";
            params.from = "galaxy"; // downgrade is always galaxy → star
            break;
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/slash/premium.ts
git commit -m "feat(premium): add /premium grant, revoke, lookup admin commands"
```

---

### Task 8: Verify everything compiles

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no errors. The premium command is auto-discovered by the command loader.

- [ ] **Step 2: Fix any type errors if present, then commit fixes**

- [ ] **Step 3: Deploy commands in dev**

```bash
npm run start:dev
```

Verify the `/premium` command appears in the dev guild. Test:
- `/premium grant user:@testuser tier:star duration:30d` — should succeed
- `/premium lookup user:@testuser` — should show Star tier, 30d expiry
- `/premium revoke user:@testuser` — should succeed
- `/premium lookup user:@testuser` — should show no premium
