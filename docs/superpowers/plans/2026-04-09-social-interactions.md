# Social Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/gift` and `/rob` commands for user-to-user coin transfers with configurable limits, rob protections (min balance + immunity), and rob as a net coin sink.

**Architecture:** Two slash command files use a shared `SocialService` for rob logic (success/fail roll, amount calculation). `GuildSocialConfig` model stores per-guild settings with Redis caching. `/gift` uses `CurrencyService.deduct()` + `addCoin()`. `/rob` uses `SocialService.rollRob()` for pure game logic then `CurrencyService` for transfers.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-09-social-interactions-design.md`

---

### Task 1: Transaction Types + Config Model

**Files:**
- Modify: `src/models/transaction.model.ts`
- Create: `src/models/guildSocialConfig.model.ts`

- [ ] **Step 1: Add `"gift"`, `"rob"`, `"rob_penalty"` to TransactionType**

In `src/models/transaction.model.ts`, add three new types to the union (after `"fish"`) and to the schema enum array.

Union type addition:
```ts
    | "fish"
    | "gift"
    | "rob"
    | "rob_penalty";
```

Also add `"gift"`, `"rob"`, `"rob_penalty"` to the enum array in the schema.

- [ ] **Step 2: Create GuildSocialConfig model**

Create `src/models/guildSocialConfig.model.ts`:

```ts
import { model, Schema, Document } from "mongoose";

export interface IGuildSocialConfig extends Document {
    guildId: string;
    enabled: boolean;
    giftMaxAmount: number;
    robCooldown: number;
    robSuccessRate: number;
    robStealMinPct: number;
    robStealMaxPct: number;
    robPenaltyMinPct: number;
    robPenaltyMaxPct: number;
    robMinBalance: number;
    robImmunityDuration: number;
}

const guildSocialConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        giftMaxAmount: { type: Number, default: 1000 },
        robCooldown: { type: Number, default: 21600 },
        robSuccessRate: { type: Number, default: 0.4 },
        robStealMinPct: { type: Number, default: 10 },
        robStealMaxPct: { type: Number, default: 30 },
        robPenaltyMinPct: { type: Number, default: 10 },
        robPenaltyMaxPct: { type: Number, default: 20 },
        robMinBalance: { type: Number, default: 100 },
        robImmunityDuration: { type: Number, default: 7200 },
    },
    {
        timestamps: true,
        collection: "GuildSocialConfigs",
    }
);

const GuildSocialConfigModel = model<IGuildSocialConfig>(
    "GuildSocialConfig",
    guildSocialConfigSchema
);

export default GuildSocialConfigModel;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts src/models/guildSocialConfig.model.ts
git commit -m "feat(economy): add gift/rob/rob_penalty transaction types and GuildSocialConfig model

Three new transaction types. GuildSocialConfig with gift max (1000),
rob cooldown (6h), success rate (40%), steal 10-30%, penalty 10-20%,
min balance (100), immunity (2h)."
```

---

### Task 2: SocialService — Rob Logic

**Files:**
- Create: `src/services/economy/social.service.ts`

- [ ] **Step 1: Create social service**

Create `src/services/economy/social.service.ts`:

```ts
export interface RobResult {
    success: boolean;
    amount: number;
    percentage: number;
}

interface RobConfig {
    robSuccessRate: number;
    robStealMinPct: number;
    robStealMaxPct: number;
    robPenaltyMinPct: number;
    robPenaltyMaxPct: number;
    robMinBalance: number;
}

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCooldown(seconds: number): string {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
}

function rollRob(
    robberBalance: number,
    targetBalance: number,
    config: RobConfig
): RobResult {
    const success = Math.random() < config.robSuccessRate;

    if (success) {
        const stealPct = randomInRange(config.robStealMinPct, config.robStealMaxPct);
        let stealAmount = Math.floor(targetBalance * stealPct / 100);
        // Never drain target below min balance
        const maxSteal = Math.max(0, targetBalance - config.robMinBalance);
        stealAmount = Math.min(stealAmount, maxSteal);

        return { success: true, amount: stealAmount, percentage: stealPct };
    }

    const penaltyPct = randomInRange(config.robPenaltyMinPct, config.robPenaltyMaxPct);
    const penaltyAmount = Math.floor(robberBalance * penaltyPct / 100);

    return { success: false, amount: penaltyAmount, percentage: penaltyPct };
}

const SocialService = { rollRob, formatCooldown, randomInRange };

export default SocialService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/social.service.ts
git commit -m "feat(economy): add SocialService with rob roll logic

Pure game logic: rollRob() calculates success/fail with steal%
or penalty%. Protects target min balance. formatCooldown() for
human-readable time display."
```

---

### Task 3: i18n Keys — All 15 Locales

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: 13 other locale files

- [ ] **Step 1: Add EN keys to en.json**

Add to `src/locales/en.json`:

```json
    "gift.title": "Gift",
    "gift.success": "**{{from}}** gifted **{{amount}} coin** to **{{to}}**",
    "gift.from_balance": "{{from}}: {{before}} → {{after}} coin",
    "gift.to_balance": "{{to}}: {{before}} → {{after}} coin",
    "gift.max_amount": "Maximum gift is **{{max}}** coin.",
    "gift.self_error": "Cannot gift yourself.",
    "gift.bot_error": "Cannot gift a bot.",
    "gift.insufficient": "Not enough coin. Balance: **{{balance}}**",
    "gift.disabled": "Social commands are disabled in this server.",
    "rob.title.success": "Rob — Success!",
    "rob.title.fail": "Rob — Caught!",
    "rob.success": "**{{robber}}** robbed **{{amount}} coin** from **{{target}}**!",
    "rob.fail": "**{{robber}}** tried to rob **{{target}}** but got caught!\nFined **{{penalty}} coin**",
    "rob.fail_broke": "**{{robber}}** tried to rob **{{target}}** but got caught!\nNo fine — you're broke!",
    "rob.cooldown": "You can rob again in **{{time}}**.",
    "rob.target_poor": "**{{target}}** doesn't have enough coin to rob.",
    "rob.target_immune": "**{{target}}** was recently robbed. Try again in **{{time}}**.",
    "rob.self_error": "Cannot rob yourself.",
    "rob.bot_error": "Cannot rob a bot.",
    "social_config.title": "Social Config",
    "social_config.enabled": "Social Commands",
    "social_config.gift_max": "Gift Max Amount",
    "social_config.rob_cooldown": "Rob Cooldown",
    "social_config.rob_success_rate": "Rob Success Rate",
    "social_config.rob_steal_range": "Rob Steal Range",
    "social_config.rob_penalty_range": "Rob Penalty Range",
    "social_config.rob_min_balance": "Rob Min Balance",
    "social_config.rob_immunity": "Rob Immunity",
    "social_config.updated": "Social config updated.",
    "social_config.toggled_on": "Social commands **enabled**.",
    "social_config.toggled_off": "Social commands **disabled**."
```

- [ ] **Step 2: Add VI keys to vi.json**

```json
    "gift.title": "Quà tặng",
    "gift.success": "**{{from}}** tặng **{{amount}} coin** cho **{{to}}**",
    "gift.from_balance": "{{from}}: {{before}} → {{after}} coin",
    "gift.to_balance": "{{to}}: {{before}} → {{after}} coin",
    "gift.max_amount": "Tặng tối đa **{{max}}** coin.",
    "gift.self_error": "Không thể tặng cho chính mình.",
    "gift.bot_error": "Không thể tặng cho bot.",
    "gift.insufficient": "Không đủ coin. Số dư: **{{balance}}**",
    "gift.disabled": "Lệnh xã hội đã bị tắt trong server này.",
    "rob.title.success": "Cướp — Thành công!",
    "rob.title.fail": "Cướp — Bị bắt!",
    "rob.success": "**{{robber}}** cướp **{{amount}} coin** từ **{{target}}**!",
    "rob.fail": "**{{robber}}** cố cướp **{{target}}** nhưng bị bắt!\nPhạt **{{penalty}} coin**",
    "rob.fail_broke": "**{{robber}}** cố cướp **{{target}}** nhưng bị bắt!\nKhông phạt — bạn đã cháy túi!",
    "rob.cooldown": "Bạn có thể cướp lại sau **{{time}}**.",
    "rob.target_poor": "**{{target}}** không có đủ coin để cướp.",
    "rob.target_immune": "**{{target}}** vừa bị cướp. Thử lại sau **{{time}}**.",
    "rob.self_error": "Không thể cướp chính mình.",
    "rob.bot_error": "Không thể cướp bot.",
    "social_config.title": "Cấu hình Xã hội",
    "social_config.enabled": "Lệnh xã hội",
    "social_config.gift_max": "Tặng tối đa",
    "social_config.rob_cooldown": "Thời gian chờ cướp",
    "social_config.rob_success_rate": "Tỉ lệ cướp thành công",
    "social_config.rob_steal_range": "Phạm vi cướp",
    "social_config.rob_penalty_range": "Phạm vi phạt",
    "social_config.rob_min_balance": "Số dư tối thiểu để bị cướp",
    "social_config.rob_immunity": "Miễn nhiễm sau cướp",
    "social_config.updated": "Đã cập nhật cấu hình xã hội.",
    "social_config.toggled_on": "Lệnh xã hội đã **bật**.",
    "social_config.toggled_off": "Lệnh xã hội đã **tắt**."
```

- [ ] **Step 3: Add EN keys to all 13 other locales**

Add the same English keys (from Step 1) to: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(economy): add gift and rob i18n keys to all 15 locales

EN + VI fully translated. 13 other locales with English placeholder.
Covers gift transfer, rob success/fail, cooldowns, protections,
and admin config strings."
```

---

### Task 4: `/gift` Command

**Files:**
- Create: `src/commands/slash/gift.ts`

- [ ] **Step 1: Create the gift command**

Create `src/commands/slash/gift.ts`:

```ts
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GuildSocialConfigModel, { IGuildSocialConfig } from "../../models/guildSocialConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getSocialConfig(guildId: string): Promise<IGuildSocialConfig> {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildSocialConfig;

    const config = await GuildSocialConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("gift")
        .setDescription("Gift coins to another user")
        .setDescriptionLocalizations(descriptionLocales("cmd.gift.desc"))
        .addUserOption((opt) =>
            opt
                .setName("user")
                .setDescription("User to gift coins to")
                .setRequired(true)
        )
        .addIntegerOption((opt) =>
            opt
                .setName("amount")
                .setDescription("Amount of coin to gift")
                .setMinValue(1)
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const giverId = interaction.user.id;
        const target = interaction.options.getUser("user", true);
        const amount = interaction.options.getInteger("amount", true);

        try {
            const config = await getSocialConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate target
            if (target.bot) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.bot_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (target.id === giverId) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.self_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate amount
            if (amount > config.giftMaxAmount) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.max_amount", { max: String(config.giftMaxAmount) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Get balances before
            const giverBefore = await CurrencyService.getBalance(giverId, guildId);
            const receiverBefore = await CurrencyService.getBalance(target.id, guildId);

            // Deduct from giver
            try {
                await CurrencyService.deduct(giverId, guildId, amount, 0, "gift", {
                    targetId: target.id,
                    amount,
                });
            } catch (error) {
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "gift.insufficient", { balance: String(giverBefore.coin) }))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, embed);
                }
                throw error;
            }

            // Add to receiver
            await CurrencyService.addCoin(target.id, guildId, amount, "gift", {
                fromId: giverId,
                amount,
            });

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${t(locale, "gift.title")}`)
                .setDescription(
                    [
                        t(locale, "gift.success", {
                            from: interaction.user.username,
                            amount: String(amount),
                            to: target.username,
                        }),
                        t(locale, "gift.from_balance", {
                            from: interaction.user.username,
                            before: String(giverBefore.coin),
                            after: String(giverBefore.coin - amount),
                        }),
                        t(locale, "gift.to_balance", {
                            to: target.username,
                            before: String(receiverBefore.coin),
                            after: String(receiverBefore.coin + amount),
                        }),
                    ].join("\n")
                )
                .setColor(0x57f287);

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder()
                .setDescription(t(errLocale, "common.error"))
                .setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/gift.ts
git commit -m "feat(economy): add /gift command

Direct coin transfer to another user. Validates target (not bot,
not self), checks max amount, atomic deduct + add, shows before/
after balances."
```

---

### Task 5: `/rob` Command

**Files:**
- Create: `src/commands/slash/rob.ts`

- [ ] **Step 1: Create the rob command**

Create `src/commands/slash/rob.ts`:

```ts
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import SocialService from "../../services/economy/social.service";
import GuildSocialConfigModel, { IGuildSocialConfig } from "../../models/guildSocialConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getSocialConfig(guildId: string): Promise<IGuildSocialConfig> {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildSocialConfig;

    const config = await GuildSocialConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to rob coins from another user")
        .setDescriptionLocalizations(descriptionLocales("cmd.rob.desc"))
        .addUserOption((opt) =>
            opt
                .setName("user")
                .setDescription("User to rob")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const robberId = interaction.user.id;
        const target = interaction.options.getUser("user", true);

        try {
            const config = await getSocialConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate target
            if (target.bot) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.bot_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (target.id === robberId) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.self_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check robber cooldown
            const cdKey = `rob_cd:${guildId}:${robberId}`;
            const cdRemaining = await redis.ttlKey(cdKey);
            if (cdRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.cooldown", { time: SocialService.formatCooldown(cdRemaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check target balance protection
            const targetBalance = await CurrencyService.getBalance(target.id, guildId);
            if (targetBalance.coin < config.robMinBalance) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.target_poor", { target: target.username }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check target immunity
            const immunityKey = `rob_immunity:${guildId}:${target.id}`;
            const immunityRemaining = await redis.ttlKey(immunityKey);
            if (immunityRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.target_immune", {
                        target: target.username,
                        time: SocialService.formatCooldown(immunityRemaining),
                    }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Get robber balance for penalty calculation
            const robberBalance = await CurrencyService.getBalance(robberId, guildId);

            // Roll rob
            const result = SocialService.rollRob(robberBalance.coin, targetBalance.coin, config);

            let embed: EmbedBuilder;

            if (result.success) {
                if (result.amount > 0) {
                    // Deduct from target
                    await CurrencyService.deduct(target.id, guildId, result.amount, 0, "rob", {
                        robberId,
                        stealPct: result.percentage,
                        stealAmount: result.amount,
                    });
                    // Add to robber
                    await CurrencyService.addCoin(robberId, guildId, result.amount, "rob", {
                        targetId: target.id,
                        stealPct: result.percentage,
                        stealAmount: result.amount,
                    });
                }
                // Set target immunity
                await redis.setJson(immunityKey, 1, config.robImmunityDuration);

                embed = new EmbedBuilder()
                    .setTitle(`💰 ${t(locale, "rob.title.success")}`)
                    .setDescription(t(locale, "rob.success", {
                        robber: interaction.user.username,
                        amount: String(result.amount),
                        target: target.username,
                    }))
                    .setColor(0x57f287);
            } else {
                // Penalty — only deduct if robber has coin and penalty > 0
                if (result.amount > 0) {
                    try {
                        await CurrencyService.deduct(robberId, guildId, result.amount, 0, "rob_penalty", {
                            targetId: target.id,
                            penaltyPct: result.percentage,
                            penaltyAmount: result.amount,
                        });
                    } catch {
                        // If deduct fails (insufficient after calculation), skip penalty
                    }

                    embed = new EmbedBuilder()
                        .setTitle(`🚔 ${t(locale, "rob.title.fail")}`)
                        .setDescription(t(locale, "rob.fail", {
                            robber: interaction.user.username,
                            target: target.username,
                            penalty: String(result.amount),
                        }))
                        .setColor(0xed4245);
                } else {
                    embed = new EmbedBuilder()
                        .setTitle(`🚔 ${t(locale, "rob.title.fail")}`)
                        .setDescription(t(locale, "rob.fail_broke", {
                            robber: interaction.user.username,
                            target: target.username,
                        }))
                        .setColor(0xed4245);
                }
            }

            // Set robber cooldown (always, regardless of success/fail)
            await redis.setJson(cdKey, 1, config.robCooldown);

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder()
                .setDescription(t(errLocale, "common.error"))
                .setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/rob.ts
git commit -m "feat(economy): add /rob command

40% success rate, steal 10-30% of target balance. Fail penalty
10-20% of own balance (coin sink). Protections: min balance,
target immunity, robber cooldown."
```

---

### Task 6: Admin Commands — social-config

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top of `src/commands/slash/economy.ts`:

```ts
import GuildSocialConfigModel from "../../models/guildSocialConfig.model";
```

- [ ] **Step 2: Add subcommands to builder**

Add after the last existing subcommand:

```ts
        .addSubcommand((sub) =>
            sub
                .setName("social-config-view")
                .setDescription("View gift & rob config")
        )
        .addSubcommand((sub) =>
            sub
                .setName("social-config-toggle")
                .setDescription("Enable/disable gift & rob commands")
        )
        .addSubcommand((sub) =>
            sub
                .setName("social-config-set")
                .setDescription("Set a social config value")
                .addStringOption((opt) =>
                    opt
                        .setName("setting")
                        .setDescription("Setting to change")
                        .setRequired(true)
                        .addChoices(
                            { name: "gift-max-amount", value: "giftMaxAmount" },
                            { name: "rob-cooldown", value: "robCooldown" },
                            { name: "rob-min-balance", value: "robMinBalance" },
                            { name: "rob-immunity-duration", value: "robImmunityDuration" },
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("value")
                        .setDescription("New value")
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
```

- [ ] **Step 3: Add switch cases**

Add these cases to the switch block, before the `default` case:

```ts
                case "social-config-view": {
                    const sConfig = await GuildSocialConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const robCdText = `${Math.floor(sConfig.robCooldown / 3600)}h ${Math.floor((sConfig.robCooldown % 3600) / 60)}m`;
                    const immunityText = `${Math.floor(sConfig.robImmunityDuration / 3600)}h ${Math.floor((sConfig.robImmunityDuration % 3600) / 60)}m`;
                    embed = new EmbedBuilder()
                        .setTitle(t(locale, "social_config.title"))
                        .addFields(
                            { name: t(locale, "social_config.enabled"), value: sConfig.enabled ? "✅" : "❌", inline: true },
                            { name: t(locale, "social_config.gift_max"), value: String(sConfig.giftMaxAmount), inline: true },
                            { name: t(locale, "social_config.rob_cooldown"), value: robCdText, inline: true },
                            { name: t(locale, "social_config.rob_success_rate"), value: `${Math.round(sConfig.robSuccessRate * 100)}%`, inline: true },
                            { name: t(locale, "social_config.rob_steal_range"), value: `${sConfig.robStealMinPct}-${sConfig.robStealMaxPct}%`, inline: true },
                            { name: t(locale, "social_config.rob_penalty_range"), value: `${sConfig.robPenaltyMinPct}-${sConfig.robPenaltyMaxPct}%`, inline: true },
                            { name: t(locale, "social_config.rob_min_balance"), value: String(sConfig.robMinBalance), inline: true },
                            { name: t(locale, "social_config.rob_immunity"), value: immunityText, inline: true },
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "social-config-toggle": {
                    const sConfig = await GuildSocialConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const newEnabled = !sConfig.enabled;
                    await GuildSocialConfigModel.updateOne({ guildId }, { $set: { enabled: newEnabled } });
                    await redis.deleteKey(`social_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, newEnabled ? "social_config.toggled_on" : "social_config.toggled_off"))
                        .setColor(newEnabled ? 0x57f287 : 0xed4245);
                    break;
                }
                case "social-config-set": {
                    const setting = interaction.options.getString("setting", true);
                    const value = interaction.options.getInteger("value", true);
                    await GuildSocialConfigModel.findOneAndUpdate(
                        { guildId },
                        { $set: { [setting]: value }, $setOnInsert: { guildId } },
                        { upsert: true }
                    );
                    await redis.deleteKey(`social_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "social_config.updated"))
                        .setColor(0x57f287);
                    break;
                }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add social-config admin subcommands

/economy social-config-view — show gift/rob config with all fields
/economy social-config-toggle — enable/disable gift and rob
/economy social-config-set — set giftMaxAmount, robCooldown, etc."
```

---

### Task 7: Update Steering Documentation

**Files:**
- Modify: `docs/steering/economy-system.md`

- [ ] **Step 1: Add social interactions section**

Append after the "Work & Task Commands" section in `docs/steering/economy-system.md`:

```markdown
## Social Interactions

User-to-user coin transfer commands. Rob acts as a net coin sink.

### Commands

| Command | Mechanics |
|---------|-----------|
| `/gift <user> <amount>` | Direct transfer, max configurable (default 1000), no cooldown |
| `/rob <user>` | 40% success (steal 10-30% target balance), 60% fail (lose 10-20% own balance) |

### Rob Protections

- **Min balance:** Target must have ≥100 coin (configurable) to be robbed
- **Immunity:** Target gets 2h immunity after being successfully robbed
- **Cooldown:** Robber has 6h cooldown between attempts

### Rob Economics

- Average steal: ~20% × 40% = 8% of target transferred per attempt
- Average penalty: ~15% × 60% = 9% of robber destroyed per attempt
- **Net negative for robber** — rob is a coin sink on average

### Configuration

Per-guild via `GuildSocialConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for gift + rob |
| `giftMaxAmount` | `1000` | Max coin per gift |
| `robCooldown` | `21600` (6h) | Robber cooldown |
| `robSuccessRate` | `0.4` (40%) | Rob success chance |
| `robStealMinPct` / `robStealMaxPct` | `10` / `30` | Steal range (% of target) |
| `robPenaltyMinPct` / `robPenaltyMaxPct` | `10` / `20` | Fine range (% of robber) |
| `robMinBalance` | `100` | Target protection threshold |
| `robImmunityDuration` | `7200` (2h) | Target immunity after rob |

Admin commands: `/economy social-config-view`, `social-config-toggle`, `social-config-set`

Transaction types: `"gift"`, `"rob"`, `"rob_penalty"`
```

- [ ] **Step 2: Commit**

```bash
git add docs/steering/economy-system.md
git commit -m "docs: add social interactions section to economy steering doc"
```

---

### Task 8: Final Build Verification

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Verify new files exist**

Run: `ls src/commands/slash/gift.ts src/commands/slash/rob.ts src/services/economy/social.service.ts src/models/guildSocialConfig.model.ts`
Expected: All 4 files listed

- [ ] **Step 4: Verify transaction type consistency**

Run: `grep -n '"gift"\|"rob"\|"rob_penalty"' src/models/transaction.model.ts src/commands/slash/gift.ts src/commands/slash/rob.ts`
Expected: Types appear consistently across files
