# Gambling Mini-Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/gamble coinflip|slots|dice` command with coin betting, per-guild configurable limits/cooldowns, and admin config via `/economy gambling-config-*`.

**Architecture:** `GamblingService` handles pure game logic (no DB/Discord). `/gamble` command validates bets, checks cooldowns, deducts coins via `CurrencyService.deduct()`, calls service, pays out via `CurrencyService.addCoin()`. `GuildGamblingConfig` model stores per-guild limits with Redis caching.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-09-gambling-minigames-design.md`

---

### Task 1: Transaction Type + Config Model

**Files:**
- Modify: `src/models/transaction.model.ts`
- Create: `src/models/guildGamblingConfig.model.ts`

- [ ] **Step 1: Add `"gambling"` to TransactionType**

In `src/models/transaction.model.ts`, add `"gambling"` to the union type (after `"voice_reward"`) and to the schema enum array (after `"voice_reward"`).

Union type becomes:
```ts
export type TransactionType =
    | "pray"
    | "curse"
    | "purchase"
    | "exchange"
    | "streak_bonus"
    | "admin"
    | "confession_vip"
    | "confession_skip_cd"
    | "confession_refund"
    | "confession_reply"
    | "level_up"
    | "voice_reward"
    | "gambling";
```

And add `"gambling"` to the enum array in the schema.

- [ ] **Step 2: Create GuildGamblingConfig model**

Create `src/models/guildGamblingConfig.model.ts`:

```ts
import { model, Schema, Document } from "mongoose";

export interface IGuildGamblingConfig extends Document {
    guildId: string;
    enabled: boolean;
    minBet: number;
    maxBet: number;
    cooldown: number;
}

const guildGamblingConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        minBet: { type: Number, default: 10 },
        maxBet: { type: Number, default: 500 },
        cooldown: { type: Number, default: 30 },
    },
    {
        timestamps: true,
        collection: "GuildGamblingConfigs",
    }
);

const GuildGamblingConfigModel = model<IGuildGamblingConfig>(
    "GuildGamblingConfig",
    guildGamblingConfigSchema
);

export default GuildGamblingConfigModel;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts src/models/guildGamblingConfig.model.ts
git commit -m "feat(economy): add gambling transaction type and GuildGamblingConfig model

Add 'gambling' to TransactionType. Create GuildGamblingConfig with
enabled, minBet (10), maxBet (500), cooldown (30s) per guild."
```

---

### Task 2: GamblingService — Pure Game Logic

**Files:**
- Create: `src/services/economy/gambling.service.ts`

- [ ] **Step 1: Create gambling service**

Create `src/services/economy/gambling.service.ts`:

```ts
export interface CoinflipResult {
    result: "heads" | "tails";
    won: boolean;
    multiplier: number;
}

export interface SlotsResult {
    reels: [string, string, string];
    combo: string;
    won: boolean;
    multiplier: number;
}

export interface DiceResult {
    dice: [number, number];
    total: number;
    mode: "high" | "low";
    won: boolean;
    multiplier: number;
}

// --- Coinflip: 50/50, 0% house edge ---

function coinflip(): CoinflipResult {
    const isHeads = Math.random() < 0.5;
    return {
        result: isHeads ? "heads" : "tails",
        won: isHeads,
        multiplier: isHeads ? 2 : 0,
    };
}

// --- Slots: flat probability table, ~12% house edge ---

const SYMBOLS = ["🍒", "🍋", "🔔", "💎", "7️⃣"] as const;

const SLOTS_TABLE = [
    { threshold: 0.005, combo: "777",     reels: ["7️⃣", "7️⃣", "7️⃣"] as [string, string, string], multiplier: 20 },
    { threshold: 0.020, combo: "diamond", reels: ["💎", "💎", "💎"] as [string, string, string], multiplier: 8 },
    { threshold: 0.060, combo: "bell",    reels: ["🔔", "🔔", "🔔"] as [string, string, string], multiplier: 4 },
    { threshold: 0.160, combo: "lemon",   reels: ["🍋", "🍋", "🍋"] as [string, string, string], multiplier: 2 },
    { threshold: 0.310, combo: "cherry3", reels: ["🍒", "🍒", "🍒"] as [string, string, string], multiplier: 1.5 },
    { threshold: 0.460, combo: "cherry2", reels: null,                                            multiplier: 0.5 },
    { threshold: 1.000, combo: "none",    reels: null,                                            multiplier: 0 },
];

function randomSymbolExcept(...exclude: string[]): string {
    const pool = SYMBOLS.filter((s) => !exclude.includes(s));
    return pool[Math.floor(Math.random() * pool.length)];
}

function generateNoMatchReels(): [string, string, string] {
    // Generate 3 symbols that don't form a triple and aren't cherry-cherry-X
    const first = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    let second: string;
    let third: string;

    // Avoid cherry-cherry-X pattern
    if (first === "🍒") {
        second = randomSymbolExcept("🍒");
        third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    } else {
        second = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (second === first) {
            // Avoid triple
            third = randomSymbolExcept(first);
        } else if (first !== "🍒" && second === "🍒") {
            third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        } else {
            third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            // If we accidentally made a triple, reroll third
            if (third === first && second === first) {
                third = randomSymbolExcept(first);
            }
        }
    }

    return [first, second, third];
}

function slots(): SlotsResult {
    const roll = Math.random();

    for (const entry of SLOTS_TABLE) {
        if (roll < entry.threshold) {
            let reels: [string, string, string];
            if (entry.reels) {
                reels = [...entry.reels] as [string, string, string];
            } else if (entry.combo === "cherry2") {
                reels = ["🍒", "🍒", randomSymbolExcept("🍒")];
            } else {
                reels = generateNoMatchReels();
            }

            return {
                reels,
                combo: entry.combo,
                won: entry.multiplier > 0,
                multiplier: entry.multiplier,
            };
        }
    }

    // Fallback (should not reach here)
    return { reels: generateNoMatchReels(), combo: "none", won: false, multiplier: 0 };
}

// --- Dice: 2d6, high/low, ~17% house edge (7 always loses) ---

function rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
}

function dice(mode: "high" | "low"): DiceResult {
    const d1 = rollDie();
    const d2 = rollDie();
    const total = d1 + d2;

    const won = mode === "high" ? total >= 8 : total <= 6;

    return {
        dice: [d1, d2],
        total,
        mode,
        won,
        multiplier: won ? 2 : 0,
    };
}

const GamblingService = { coinflip, slots, dice };

export default GamblingService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/gambling.service.ts
git commit -m "feat(economy): add GamblingService with coinflip, slots, dice

Pure game logic: coinflip (50/50), slots (flat probability table,
~12% house edge), dice (2d6 high/low, ~17% house edge). No DB
or Discord dependencies."
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
    "gamble.coinflip.title": "Coinflip",
    "gamble.coinflip.heads": "Heads",
    "gamble.coinflip.tails": "Tails",
    "gamble.slots.title": "Slots",
    "gamble.slots.combo.777": "JACKPOT 7️⃣7️⃣7️⃣",
    "gamble.slots.combo.diamond": "Triple Diamond!",
    "gamble.slots.combo.bell": "Triple Bell!",
    "gamble.slots.combo.lemon": "Triple Lemon!",
    "gamble.slots.combo.cherry3": "Triple Cherry!",
    "gamble.slots.combo.cherry2": "Double Cherry",
    "gamble.slots.combo.none": "No match",
    "gamble.dice.title": "Dice",
    "gamble.dice.high": "High",
    "gamble.dice.low": "Low",
    "gamble.win": "Win! ✅",
    "gamble.lose": "Lose ❌",
    "gamble.bet": "Bet: {{amount}} coin",
    "gamble.payout.win": "+{{amount}} coin (×{{multiplier}})",
    "gamble.payout.lose": "-{{amount}} coin",
    "gamble.payout.partial": "{{amount}} coin back (×{{multiplier}})",
    "gamble.cooldown": "Wait **{{seconds}}s** before gambling again.",
    "gamble.disabled": "Gambling is disabled in this server.",
    "gamble.min_bet": "Minimum bet is **{{min}}** coin.",
    "gamble.max_bet": "Maximum bet is **{{max}}** coin.",
    "gamble.insufficient": "Not enough coin. Balance: **{{balance}}**",
    "gambling_config.title": "Gambling Config",
    "gambling_config.enabled": "Gambling",
    "gambling_config.min_bet": "Min Bet",
    "gambling_config.max_bet": "Max Bet",
    "gambling_config.cooldown": "Cooldown (sec)",
    "gambling_config.updated": "Gambling config updated.",
    "gambling_config.toggled_on": "Gambling **enabled**.",
    "gambling_config.toggled_off": "Gambling **disabled**."
```

- [ ] **Step 2: Add VI keys to vi.json**

```json
    "gamble.coinflip.title": "Tung đồng xu",
    "gamble.coinflip.heads": "Ngửa",
    "gamble.coinflip.tails": "Sấp",
    "gamble.slots.title": "Máy xèng",
    "gamble.slots.combo.777": "JACKPOT 7️⃣7️⃣7️⃣",
    "gamble.slots.combo.diamond": "Ba viên kim cương!",
    "gamble.slots.combo.bell": "Ba chuông!",
    "gamble.slots.combo.lemon": "Ba chanh!",
    "gamble.slots.combo.cherry3": "Ba cherry!",
    "gamble.slots.combo.cherry2": "Hai cherry",
    "gamble.slots.combo.none": "Không trùng",
    "gamble.dice.title": "Xúc xắc",
    "gamble.dice.high": "Cao",
    "gamble.dice.low": "Thấp",
    "gamble.win": "Thắng! ✅",
    "gamble.lose": "Thua ❌",
    "gamble.bet": "Cược: {{amount}} coin",
    "gamble.payout.win": "+{{amount}} coin (×{{multiplier}})",
    "gamble.payout.lose": "-{{amount}} coin",
    "gamble.payout.partial": "Nhận lại {{amount}} coin (×{{multiplier}})",
    "gamble.cooldown": "Chờ **{{seconds}}s** trước khi chơi tiếp.",
    "gamble.disabled": "Cờ bạc đã bị tắt trong server này.",
    "gamble.min_bet": "Cược tối thiểu là **{{min}}** coin.",
    "gamble.max_bet": "Cược tối đa là **{{max}}** coin.",
    "gamble.insufficient": "Không đủ coin. Số dư: **{{balance}}**",
    "gambling_config.title": "Cấu hình cờ bạc",
    "gambling_config.enabled": "Cờ bạc",
    "gambling_config.min_bet": "Cược tối thiểu",
    "gambling_config.max_bet": "Cược tối đa",
    "gambling_config.cooldown": "Thời gian chờ (giây)",
    "gambling_config.updated": "Đã cập nhật cấu hình cờ bạc.",
    "gambling_config.toggled_on": "Cờ bạc đã **bật**.",
    "gambling_config.toggled_off": "Cờ bạc đã **tắt**."
```

- [ ] **Step 3: Add EN keys to all 13 other locales**

Add the same English keys (from Step 1) to: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(economy): add gambling i18n keys to all 15 locales

EN + VI fully translated. 13 other locales with English placeholder.
Covers game titles, results, bet validation, cooldown, and admin config."
```

---

### Task 4: `/gamble` Command

**Files:**
- Create: `src/commands/slash/gamble.ts`

- [ ] **Step 1: Create the gamble command**

Create `src/commands/slash/gamble.ts`:

```ts
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GamblingService from "../../services/economy/gambling.service";
import GuildGamblingConfigModel, { IGuildGamblingConfig } from "../../models/guildGamblingConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getGamblingConfig(guildId: string): Promise<IGuildGamblingConfig> {
    const cacheKey = `gambling_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildGamblingConfig;

    const config = await GuildGamblingConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gambling mini-games — bet coins on coinflip, slots, or dice")
        .setDescriptionLocalizations(descriptionLocales("cmd.gamble.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("coinflip")
                .setDescription("Flip a coin — 50/50 chance to double your bet")
                .addIntegerOption((opt) =>
                    opt
                        .setName("bet")
                        .setDescription("Amount of coin to bet")
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("slots")
                .setDescription("Spin the slot machine — match symbols to win")
                .addIntegerOption((opt) =>
                    opt
                        .setName("bet")
                        .setDescription("Amount of coin to bet")
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("dice")
                .setDescription("Roll 2 dice — guess high or low to win")
                .addIntegerOption((opt) =>
                    opt
                        .setName("bet")
                        .setDescription("Amount of coin to bet")
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("mode")
                        .setDescription("Guess high (≥8) or low (≤6)")
                        .setRequired(true)
                        .addChoices(
                            { name: "High (≥8)", value: "high" },
                            { name: "Low (≤6)", value: "low" },
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand(true);
        const bet = interaction.options.getInteger("bet", true);

        try {
            // Load config
            const config = await getGamblingConfig(guildId);

            // Check enabled
            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate bet
            if (bet < config.minBet) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.min_bet", { min: String(config.minBet) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (bet > config.maxBet) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.max_bet", { max: String(config.maxBet) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `gamble_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.cooldown", { seconds: String(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Deduct bet
            try {
                await CurrencyService.deduct(userId, guildId, bet, 0, "gambling", {
                    game: subcommand,
                    bet,
                    phase: "deduct",
                });
            } catch (error) {
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    const balance = await CurrencyService.getBalance(userId, guildId);
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "gamble.insufficient", { balance: String(balance.coin) }))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, embed);
                }
                throw error;
            }

            // Play game
            let embed: EmbedBuilder;

            switch (subcommand) {
                case "coinflip": {
                    const result = GamblingService.coinflip();
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "coinflip",
                            bet,
                            result: result.result,
                            won: true,
                            payout,
                        });
                    }

                    const resultText = result.result === "heads"
                        ? t(locale, "gamble.coinflip.heads")
                        : t(locale, "gamble.coinflip.tails");

                    embed = new EmbedBuilder()
                        .setTitle(`🪙 ${t(locale, "gamble.coinflip.title")}`)
                        .setDescription(
                            [
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                `${resultText} ${result.won ? "✅" : "❌"}`,
                                result.won
                                    ? t(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                                    : t(locale, "gamble.payout.lose", { amount: String(bet) }),
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                case "slots": {
                    const result = GamblingService.slots();
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "slots",
                            bet,
                            reels: result.reels,
                            combo: result.combo,
                            won: result.won,
                            payout,
                        });
                    }

                    const comboText = t(locale, `gamble.slots.combo.${result.combo}`);
                    const payoutLine = result.multiplier >= 1
                        ? t(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: String(result.multiplier) })
                        : result.multiplier > 0
                            ? t(locale, "gamble.payout.partial", { amount: String(payout), multiplier: String(result.multiplier) })
                            : t(locale, "gamble.payout.lose", { amount: String(bet) });

                    embed = new EmbedBuilder()
                        .setTitle(`🎰 ${t(locale, "gamble.slots.title")}`)
                        .setDescription(
                            [
                                `┃ ${result.reels[0]} ┃ ${result.reels[1]} ┃ ${result.reels[2]} ┃`,
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                `${comboText} ${result.won ? "✅" : "❌"}`,
                                payoutLine,
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                case "dice": {
                    const mode = interaction.options.getString("mode", true) as "high" | "low";
                    const result = GamblingService.dice(mode);
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "dice",
                            bet,
                            dice: result.dice,
                            total: result.total,
                            mode,
                            won: true,
                            payout,
                        });
                    }

                    const modeText = mode === "high"
                        ? t(locale, "gamble.dice.high")
                        : t(locale, "gamble.dice.low");

                    embed = new EmbedBuilder()
                        .setTitle(`🎲 ${t(locale, "gamble.dice.title")} — ${modeText}`)
                        .setDescription(
                            [
                                `🎲 ${result.dice[0]} + 🎲 ${result.dice[1]} = **${result.total}**`,
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                result.won
                                    ? t(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                                    : t(locale, "gamble.payout.lose", { amount: String(bet) }),
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                default: {
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                }
            }

            // Set cooldown
            await redis.setJson(cdKey, 1, config.cooldown);

            return Reply.embedEdit(interaction, embed);
        } catch (error) {
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

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/gamble.ts
git commit -m "feat(economy): add /gamble command with coinflip, slots, dice

Full bet flow: config check → validate bet → cooldown → deduct →
play → payout → set cooldown → embed reply. Uses GamblingService
for pure game logic, CurrencyService for coin operations."
```

---

### Task 5: Admin Commands — gambling-config

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `src/commands/slash/economy.ts`:

```ts
import GuildGamblingConfigModel from "../../models/guildGamblingConfig.model";
```

- [ ] **Step 2: Add subcommands to builder**

Add after the last existing subcommand (before the closing of the builder chain):

```ts
        .addSubcommand((sub) =>
            sub
                .setName("gambling-config-view")
                .setDescription("View gambling config")
        )
        .addSubcommand((sub) =>
            sub
                .setName("gambling-config-toggle")
                .setDescription("Enable/disable gambling")
        )
        .addSubcommand((sub) =>
            sub
                .setName("gambling-config-set")
                .setDescription("Set a gambling config value")
                .addStringOption((opt) =>
                    opt
                        .setName("setting")
                        .setDescription("Setting to change")
                        .setRequired(true)
                        .addChoices(
                            { name: "min-bet", value: "minBet" },
                            { name: "max-bet", value: "maxBet" },
                            { name: "cooldown", value: "cooldown" },
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

Add these cases to the switch block in the execute function, before the `default` case:

```ts
                case "gambling-config-view": {
                    const config = await GuildGamblingConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    embed = new EmbedBuilder()
                        .setTitle(t(locale, "gambling_config.title"))
                        .addFields(
                            { name: t(locale, "gambling_config.enabled"), value: config.enabled ? "✅" : "❌", inline: true },
                            { name: t(locale, "gambling_config.min_bet"), value: String(config.minBet), inline: true },
                            { name: t(locale, "gambling_config.max_bet"), value: String(config.maxBet), inline: true },
                            { name: t(locale, "gambling_config.cooldown"), value: `${config.cooldown}s`, inline: true },
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "gambling-config-toggle": {
                    const config = await GuildGamblingConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const newEnabled = !config.enabled;
                    await GuildGamblingConfigModel.updateOne({ guildId }, { $set: { enabled: newEnabled } });
                    await redis.deleteKey(`gambling_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, newEnabled ? "gambling_config.toggled_on" : "gambling_config.toggled_off"))
                        .setColor(newEnabled ? 0x57f287 : 0xed4245);
                    break;
                }
                case "gambling-config-set": {
                    const setting = interaction.options.getString("setting", true);
                    const value = interaction.options.getInteger("value", true);
                    await GuildGamblingConfigModel.findOneAndUpdate(
                        { guildId },
                        { $set: { [setting]: value }, $setOnInsert: { guildId } },
                        { upsert: true }
                    );
                    await redis.deleteKey(`gambling_config:${guildId}`);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "gambling_config.updated"))
                        .setColor(0x57f287);
                    break;
                }
```

Note: need to add `import redis from "../../connector/redis";` if not already imported. Check the file first.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add gambling-config admin subcommands

/economy gambling-config-view — show min/max bet, cooldown, enabled
/economy gambling-config-toggle — enable/disable gambling
/economy gambling-config-set — set minBet/maxBet/cooldown values"
```

---

### Task 6: Update Steering Documentation

**Files:**
- Modify: `docs/steering/economy-system.md`

- [ ] **Step 1: Add gambling section**

Append after the "Passive Activity Rewards" section in `docs/steering/economy-system.md`:

```markdown
## Gambling Mini-Games

Coin-only betting games via `/gamble` command. Acts as a coin sink with house edge.

### Games

| Game | Command | House Edge | Mechanics |
|------|---------|-----------|-----------|
| Coinflip | `/gamble coinflip <bet>` | 0% | 50/50 heads/tails, win ×2 |
| Slots | `/gamble slots <bet>` | ~12% | Flat probability table, 7 outcomes (×0 to ×20) |
| Dice | `/gamble dice <bet> <mode>` | ~17% | 2d6, high(≥8)/low(≤6), 7 always loses, win ×2 |

### Configuration

Per-guild via `GuildGamblingConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle |
| `minBet` | `10` | Minimum coin bet |
| `maxBet` | `500` | Maximum coin bet |
| `cooldown` | `30` | Seconds between games per user |

Admin commands: `/economy gambling-config-view`, `gambling-config-toggle`, `gambling-config-set`

### Bet Flow

1. Validate config enabled + bet within min/max
2. Check Redis cooldown (`gamble_cd:{guildId}:{userId}`)
3. Atomic deduct via `CurrencyService.deduct()`
4. Play game via `GamblingService`
5. If win: `CurrencyService.addCoin(payout)`
6. Set Redis cooldown
7. Transaction type: `"gambling"` with game metadata
```

- [ ] **Step 2: Commit**

```bash
git add docs/steering/economy-system.md
git commit -m "docs: add gambling mini-games section to economy steering doc"
```

---

### Task 7: Final Build Verification

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Verify new files exist**

Run: `ls src/commands/slash/gamble.ts src/services/economy/gambling.service.ts src/models/guildGamblingConfig.model.ts`
Expected: All 3 files listed

- [ ] **Step 4: Verify transaction type consistency**

Run: `grep -n '"gambling"' src/models/transaction.model.ts src/commands/slash/gamble.ts`
Expected: Type appears in both files
