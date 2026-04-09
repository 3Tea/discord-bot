# Work & Fish Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/work` and `/fish` cooldown-based coin earning commands with shared service and per-guild admin configuration.

**Architecture:** Two slash command files share a `WorkService` for game logic (random rewards, fish rarity rolls, cooldown formatting). `GuildWorkConfig` Mongoose model stores per-guild settings with Redis caching. Commands use existing `CurrencyService.addCoin()` for payouts and `redis.ttlKey()`/`setJson()` for cooldowns.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-09-work-commands-design.md`

---

### Task 1: Transaction Types + Config Model

**Files:**
- Modify: `src/models/transaction.model.ts`
- Create: `src/models/guildWorkConfig.model.ts`

- [ ] **Step 1: Add `"work"` and `"fish"` to TransactionType**

In `src/models/transaction.model.ts`, add `"work"` and `"fish"` to the union type (after `"gambling"`) and to the schema enum array.

Union type addition:
```ts
    | "gambling"
    | "work"
    | "fish";
```

Also add `"work"` and `"fish"` to the enum array in the schema.

- [ ] **Step 2: Create GuildWorkConfig model**

Create `src/models/guildWorkConfig.model.ts`:

```ts
import { model, Schema, Document } from "mongoose";

export interface IGuildWorkConfig extends Document {
    guildId: string;
    enabled: boolean;
    workCooldown: number;
    workMinReward: number;
    workMaxReward: number;
    fishCooldown: number;
    fishRewardMultiplier: number;
}

const guildWorkConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        workCooldown: { type: Number, default: 14400 },
        workMinReward: { type: Number, default: 80 },
        workMaxReward: { type: Number, default: 200 },
        fishCooldown: { type: Number, default: 3600 },
        fishRewardMultiplier: { type: Number, default: 1.0 },
    },
    {
        timestamps: true,
        collection: "GuildWorkConfigs",
    }
);

const GuildWorkConfigModel = model<IGuildWorkConfig>(
    "GuildWorkConfig",
    guildWorkConfigSchema
);

export default GuildWorkConfigModel;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts src/models/guildWorkConfig.model.ts
git commit -m "feat(economy): add work/fish transaction types and GuildWorkConfig model

Add 'work' and 'fish' to TransactionType. Create GuildWorkConfig
with workCooldown (4h), workMinReward (80), workMaxReward (200),
fishCooldown (1h), fishRewardMultiplier (1.0)."
```

---

### Task 2: WorkService — Shared Logic

**Files:**
- Create: `src/services/economy/work.service.ts`

- [ ] **Step 1: Create work service**

Create `src/services/economy/work.service.ts`:

```ts
export interface FishRollResult {
    name: string;
    rarity: string;
    emoji: string;
    minCoin: number;
    maxCoin: number;
}

// --- Random helpers ---

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

// --- Work ---

function rollWorkReward(min: number, max: number): number {
    return randomInRange(min, max);
}

function rollWorkText(): number {
    return Math.floor(Math.random() * 10);
}

// --- Fish ---

const FISH_TABLE = [
    { threshold: 0.55, rarity: "common",    emoji: "🐟", minCoin: 10,  maxCoin: 30 },
    { threshold: 0.83, rarity: "uncommon",  emoji: "🐠", minCoin: 40,  maxCoin: 80 },
    { threshold: 0.96, rarity: "rare",      emoji: "🐡", minCoin: 100, maxCoin: 200 },
    { threshold: 1.00, rarity: "legendary", emoji: "🦈", minCoin: 300, maxCoin: 600 },
];

const FISH_POOL_SIZE = 5; // 5 fish names per rarity

function rollFish(): FishRollResult {
    const roll = Math.random();
    for (const entry of FISH_TABLE) {
        if (roll < entry.threshold) {
            const nameIndex = Math.floor(Math.random() * FISH_POOL_SIZE);
            return {
                name: `fish.${entry.rarity}.${nameIndex}`,
                rarity: entry.rarity,
                emoji: entry.emoji,
                minCoin: entry.minCoin,
                maxCoin: entry.maxCoin,
            };
        }
    }
    // Fallback
    return {
        name: "fish.common.0",
        rarity: "common",
        emoji: "🐟",
        minCoin: 10,
        maxCoin: 30,
    };
}

function rollFishReward(minCoin: number, maxCoin: number, multiplier: number): number {
    return Math.floor(randomInRange(minCoin, maxCoin) * multiplier);
}

// Rarity → embed color
const RARITY_COLORS: Record<string, number> = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    legendary: 0xf1c40f,
};

function getRarityColor(rarity: string): number {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}

const WorkService = {
    randomInRange,
    formatCooldown,
    rollWorkReward,
    rollWorkText,
    rollFish,
    rollFishReward,
    getRarityColor,
};

export default WorkService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/work.service.ts
git commit -m "feat(economy): add WorkService with work reward and fish rarity logic

Shared helpers: randomInRange, formatCooldown, rollWorkReward,
rollFish (4-tier rarity table), rollFishReward (with multiplier),
getRarityColor."
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
    "work.title": "Work",
    "work.flavor": "**{{username}}** {{text}}",
    "work.reward": "+{{amount}} coin",
    "work.cooldown": "You can work again in **{{time}}**.",
    "work.disabled": "Work commands are disabled in this server.",
    "work.texts.0": "worked a shift at the coffee shop...",
    "work.texts.1": "delivered packages across town...",
    "work.texts.2": "fixed bugs in production code...",
    "work.texts.3": "taught a Discord bot to behave...",
    "work.texts.4": "organized files in the server room...",
    "work.texts.5": "cleaned up the guild hall...",
    "work.texts.6": "repaired the town bridge...",
    "work.texts.7": "guarded the castle gates...",
    "work.texts.8": "translated ancient scrolls...",
    "work.texts.9": "painted murals in the marketplace...",
    "fish.title": "Fishing",
    "fish.catch": "You caught a {{emoji}} **{{fish}}**! ({{rarity}})",
    "fish.reward": "+{{amount}} coin",
    "fish.cooldown": "You can fish again in **{{time}}**.",
    "fish.rarity.common": "Common",
    "fish.rarity.uncommon": "Uncommon",
    "fish.rarity.rare": "Rare",
    "fish.rarity.legendary": "Legendary",
    "fish.common.0": "Sardine",
    "fish.common.1": "Anchovy",
    "fish.common.2": "Carp",
    "fish.common.3": "Mackerel",
    "fish.common.4": "Herring",
    "fish.uncommon.0": "Salmon",
    "fish.uncommon.1": "Tuna",
    "fish.uncommon.2": "Bass",
    "fish.uncommon.3": "Trout",
    "fish.uncommon.4": "Catfish",
    "fish.rare.0": "Pufferfish",
    "fish.rare.1": "Swordfish",
    "fish.rare.2": "Eel",
    "fish.rare.3": "Octopus",
    "fish.rare.4": "Lobster",
    "fish.legendary.0": "Shark",
    "fish.legendary.1": "Whale",
    "fish.legendary.2": "Golden Koi",
    "fish.legendary.3": "Kraken",
    "fish.legendary.4": "Leviathan",
    "work_config.title": "Work & Fish Config",
    "work_config.enabled": "Work Commands",
    "work_config.work_cooldown": "Work Cooldown",
    "work_config.work_min": "Work Min Reward",
    "work_config.work_max": "Work Max Reward",
    "work_config.fish_cooldown": "Fish Cooldown",
    "work_config.fish_multiplier": "Fish Reward Multiplier",
    "work_config.updated": "Work config updated.",
    "work_config.toggled_on": "Work commands **enabled**.",
    "work_config.toggled_off": "Work commands **disabled**."
```

- [ ] **Step 2: Add VI keys to vi.json**

```json
    "work.title": "Làm việc",
    "work.flavor": "**{{username}}** {{text}}",
    "work.reward": "+{{amount}} coin",
    "work.cooldown": "Bạn có thể làm việc lại sau **{{time}}**.",
    "work.disabled": "Lệnh làm việc đã bị tắt trong server này.",
    "work.texts.0": "làm ca ở quán cà phê...",
    "work.texts.1": "giao hàng khắp thành phố...",
    "work.texts.2": "sửa bug trong code production...",
    "work.texts.3": "dạy bot Discord cách cư xử...",
    "work.texts.4": "sắp xếp file trong phòng server...",
    "work.texts.5": "dọn dẹp hội trường guild...",
    "work.texts.6": "sửa chữa cây cầu thị trấn...",
    "work.texts.7": "canh gác cổng lâu đài...",
    "work.texts.8": "dịch những cuộn giấy cổ...",
    "work.texts.9": "vẽ tranh tường ở chợ...",
    "fish.title": "Câu cá",
    "fish.catch": "Bạn câu được {{emoji}} **{{fish}}**! ({{rarity}})",
    "fish.reward": "+{{amount}} coin",
    "fish.cooldown": "Bạn có thể câu cá lại sau **{{time}}**.",
    "fish.rarity.common": "Thường",
    "fish.rarity.uncommon": "Hiếm nhẹ",
    "fish.rarity.rare": "Hiếm",
    "fish.rarity.legendary": "Huyền thoại",
    "fish.common.0": "Cá mòi",
    "fish.common.1": "Cá cơm",
    "fish.common.2": "Cá chép",
    "fish.common.3": "Cá thu",
    "fish.common.4": "Cá trích",
    "fish.uncommon.0": "Cá hồi",
    "fish.uncommon.1": "Cá ngừ",
    "fish.uncommon.2": "Cá vược",
    "fish.uncommon.3": "Cá hương",
    "fish.uncommon.4": "Cá trê",
    "fish.rare.0": "Cá nóc",
    "fish.rare.1": "Cá kiếm",
    "fish.rare.2": "Lươn",
    "fish.rare.3": "Bạch tuộc",
    "fish.rare.4": "Tôm hùm",
    "fish.legendary.0": "Cá mập",
    "fish.legendary.1": "Cá voi",
    "fish.legendary.2": "Cá Koi vàng",
    "fish.legendary.3": "Kraken",
    "fish.legendary.4": "Leviathan",
    "work_config.title": "Cấu hình Làm việc & Câu cá",
    "work_config.enabled": "Lệnh làm việc",
    "work_config.work_cooldown": "Thời gian chờ làm việc",
    "work_config.work_min": "Thưởng tối thiểu làm việc",
    "work_config.work_max": "Thưởng tối đa làm việc",
    "work_config.fish_cooldown": "Thời gian chờ câu cá",
    "work_config.fish_multiplier": "Hệ số thưởng câu cá",
    "work_config.updated": "Đã cập nhật cấu hình làm việc.",
    "work_config.toggled_on": "Lệnh làm việc đã **bật**.",
    "work_config.toggled_off": "Lệnh làm việc đã **tắt**."
```

- [ ] **Step 3: Add EN keys to all 13 other locales**

Add the same English keys (from Step 1) to: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(economy): add work and fish i18n keys to all 15 locales

EN + VI fully translated (including 10 work flavor texts, 20 fish
names, rarity labels, config strings). 13 other locales with
English placeholder."
```

---

### Task 4: `/work` Command

**Files:**
- Create: `src/commands/slash/work.ts`

- [ ] **Step 1: Create the work command**

Create `src/commands/slash/work.ts`:

```ts
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import WorkService from "../../services/economy/work.service";
import GuildWorkConfigModel, { IGuildWorkConfig } from "../../models/guildWorkConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getWorkConfig(guildId: string): Promise<IGuildWorkConfig> {
    const cacheKey = `work_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildWorkConfig;

    const config = await GuildWorkConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work a job to earn coins")
        .setDescriptionLocalizations(descriptionLocales("cmd.work.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            const config = await getWorkConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "work.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `work_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "work.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Roll reward
            const reward = WorkService.rollWorkReward(config.workMinReward, config.workMaxReward);
            const textIndex = WorkService.rollWorkText();

            // Pay out
            await CurrencyService.addCoin(userId, guildId, reward, "work", { reward });

            // Set cooldown
            await redis.setJson(cdKey, 1, config.workCooldown);

            // Build embed
            const flavorText = t(locale, `work.texts.${textIndex}`);
            const embed = new EmbedBuilder()
                .setTitle(`💼 ${t(locale, "work.title")}`)
                .setDescription(
                    [
                        t(locale, "work.flavor", { username: interaction.user.username, text: flavorText }),
                        t(locale, "work.reward", { amount: String(reward) }),
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
git add src/commands/slash/work.ts
git commit -m "feat(economy): add /work command

Cooldown-based work with random 80-200 coin reward and flavor
text. Uses WorkService for reward roll, Redis for cooldown,
CurrencyService for payout."
```

---

### Task 5: `/fish` Command

**Files:**
- Create: `src/commands/slash/fish.ts`

- [ ] **Step 1: Create the fish command**

Create `src/commands/slash/fish.ts`:

```ts
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import WorkService from "../../services/economy/work.service";
import GuildWorkConfigModel, { IGuildWorkConfig } from "../../models/guildWorkConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getWorkConfig(guildId: string): Promise<IGuildWorkConfig> {
    const cacheKey = `work_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildWorkConfig;

    const config = await GuildWorkConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("fish")
        .setDescription("Go fishing — catch fish for coins")
        .setDescriptionLocalizations(descriptionLocales("cmd.fish.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            const config = await getWorkConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "work.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `fish_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "fish.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Roll fish
            const fish = WorkService.rollFish();
            const reward = WorkService.rollFishReward(fish.minCoin, fish.maxCoin, config.fishRewardMultiplier);

            // Pay out
            await CurrencyService.addCoin(userId, guildId, reward, "fish", {
                fish: fish.name,
                rarity: fish.rarity,
                reward,
            });

            // Set cooldown
            await redis.setJson(cdKey, 1, config.fishCooldown);

            // Build embed
            const fishName = t(locale, fish.name);
            const rarityLabel = t(locale, `fish.rarity.${fish.rarity}`);
            const embed = new EmbedBuilder()
                .setTitle(`🎣 ${t(locale, "fish.title")}`)
                .setDescription(
                    [
                        t(locale, "fish.catch", { emoji: fish.emoji, fish: fishName, rarity: rarityLabel }),
                        t(locale, "fish.reward", { amount: String(reward) }),
                    ].join("\n")
                )
                .setColor(WorkService.getRarityColor(fish.rarity));

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
git add src/commands/slash/fish.ts
git commit -m "feat(economy): add /fish command

4-rarity fishing with coin rewards (10-600 coin) and admin-
configurable multiplier. Uses WorkService for fish roll,
Redis for cooldown, CurrencyService for payout."
```

---

### Task 6: Admin Commands — work-config

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top of `src/commands/slash/economy.ts`:

```ts
import GuildWorkConfigModel from "../../models/guildWorkConfig.model";
```

- [ ] **Step 2: Add subcommands to builder**

Add after the last existing subcommand:

```ts
        .addSubcommand((sub) =>
            sub
                .setName("work-config-view")
                .setDescription("View work & fish config")
        )
        .addSubcommand((sub) =>
            sub
                .setName("work-config-toggle")
                .setDescription("Enable/disable work & fish commands")
        )
        .addSubcommand((sub) =>
            sub
                .setName("work-config-set")
                .setDescription("Set a work/fish config value")
                .addStringOption((opt) =>
                    opt
                        .setName("setting")
                        .setDescription("Setting to change")
                        .setRequired(true)
                        .addChoices(
                            { name: "work-cooldown", value: "workCooldown" },
                            { name: "work-min-reward", value: "workMinReward" },
                            { name: "work-max-reward", value: "workMaxReward" },
                            { name: "fish-cooldown", value: "fishCooldown" },
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

Note: `fishRewardMultiplier` is a float so it doesn't fit in an integer option. If needed, it can be set via a separate subcommand with a number option later. For now, the 4 most common settings are available.

- [ ] **Step 3: Add switch cases**

Add these cases to the switch block, before the `default` case:

```ts
                case "work-config-view": {
                    const wConfig = await GuildWorkConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const workCdText = `${Math.floor(wConfig.workCooldown / 3600)}h ${Math.floor((wConfig.workCooldown % 3600) / 60)}m`;
                    const fishCdText = `${Math.floor(wConfig.fishCooldown / 3600)}h ${Math.floor((wConfig.fishCooldown % 3600) / 60)}m`;
                    embed = new EmbedBuilder()
                        .setTitle(t(locale, "work_config.title"))
                        .addFields(
                            { name: t(locale, "work_config.enabled"), value: wConfig.enabled ? "✅" : "❌", inline: true },
                            { name: t(locale, "work_config.work_cooldown"), value: workCdText, inline: true },
                            { name: t(locale, "work_config.work_min"), value: String(wConfig.workMinReward), inline: true },
                            { name: t(locale, "work_config.work_max"), value: String(wConfig.workMaxReward), inline: true },
                            { name: t(locale, "work_config.fish_cooldown"), value: fishCdText, inline: true },
                            { name: t(locale, "work_config.fish_multiplier"), value: `×${wConfig.fishRewardMultiplier}`, inline: true },
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "work-config-toggle": {
                    const wConfig = await GuildWorkConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const newEnabled = !wConfig.enabled;
                    await GuildWorkConfigModel.updateOne({ guildId }, { $set: { enabled: newEnabled } });
                    await redis.deleteKey(`work_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, newEnabled ? "work_config.toggled_on" : "work_config.toggled_off"))
                        .setColor(newEnabled ? 0x57f287 : 0xed4245);
                    break;
                }
                case "work-config-set": {
                    const setting = interaction.options.getString("setting", true);
                    const value = interaction.options.getInteger("value", true);
                    await GuildWorkConfigModel.findOneAndUpdate(
                        { guildId },
                        { $set: { [setting]: value }, $setOnInsert: { guildId } },
                        { upsert: true }
                    );
                    await redis.deleteKey(`work_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "work_config.updated"))
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
git commit -m "feat(economy): add work-config admin subcommands

/economy work-config-view — show work/fish cooldowns and rewards
/economy work-config-toggle — enable/disable work and fish
/economy work-config-set — set cooldown and reward values"
```

---

### Task 7: Update Steering Documentation

**Files:**
- Modify: `docs/steering/economy-system.md`

- [ ] **Step 1: Add work commands section**

Append after the "Gambling Mini-Games" section in `docs/steering/economy-system.md`:

```markdown
## Work & Task Commands

Cooldown-based coin earning commands for steady income between daily pray/curse cycles.

### Commands

| Command | Cooldown | Reward | Mechanics |
|---------|----------|--------|-----------|
| `/work` | 4h (configurable) | 80-200 coin | Random reward + flavor text |
| `/fish` | 1h (configurable) | 10-600 coin | 4-rarity fish roll (common/uncommon/rare/legendary) |

### Fish Rarity Table

| Rarity | Probability | Coin Range | Emoji |
|--------|------------|------------|-------|
| Common | 55% | 10-30 | 🐟 |
| Uncommon | 28% | 40-80 | 🐠 |
| Rare | 13% | 100-200 | 🐡 |
| Legendary | 4% | 300-600 | 🦈 |

Expected value: ~65 coin/hour at default settings.

### Configuration

Per-guild via `GuildWorkConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for work + fish |
| `workCooldown` | `14400` (4h) | Work cooldown in seconds |
| `workMinReward` | `80` | Minimum work coin reward |
| `workMaxReward` | `200` | Maximum work coin reward |
| `fishCooldown` | `3600` (1h) | Fish cooldown in seconds |
| `fishRewardMultiplier` | `1.0` | Multiplier applied to all fish rewards |

Admin commands: `/economy work-config-view`, `work-config-toggle`, `work-config-set`

Transaction types: `"work"`, `"fish"`
```

- [ ] **Step 2: Commit**

```bash
git add docs/steering/economy-system.md
git commit -m "docs: add work & task commands section to economy steering doc"
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

Run: `ls src/commands/slash/work.ts src/commands/slash/fish.ts src/services/economy/work.service.ts src/models/guildWorkConfig.model.ts`
Expected: All 4 files listed

- [ ] **Step 4: Verify transaction type consistency**

Run: `grep -n '"work"\|"fish"' src/models/transaction.model.ts src/commands/slash/work.ts src/commands/slash/fish.ts`
Expected: Types appear consistently across files
