# Passive Economy Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coin/gem rewards for level-ups and voice time, hooking into the existing XP flow with per-guild admin configuration.

**Architecture:** Hook `rewardLevelUp()` and `tickVoiceCoinReward()` utility functions into `messageCreate.ts` and `voiceStateUpdate.ts` after XP is awarded and level-up is detected. A new `GuildEconomyRewardConfig` Mongoose model stores per-guild settings with Redis caching. Existing `CurrencyService.addCoin/addGem` handles all currency operations and transaction logging.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-09-passive-economy-rewards-design.md`

---

### Task 1: Extend Transaction Type

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add `"level_up"` and `"voice_reward"` to TransactionType**

In `src/models/transaction.model.ts`, add two new types to the union type and enum array:

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
    | "voice_reward";
```

And in the schema enum array, add the two new values:

```ts
        type: {
            type: String,
            enum: [
                "pray",
                "curse",
                "purchase",
                "exchange",
                "streak_bonus",
                "admin",
                "confession_vip",
                "confession_skip_cd",
                "confession_refund",
                "confession_reply",
                "level_up",
                "voice_reward",
            ],
            required: true,
        },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add level_up and voice_reward transaction types"
```

---

### Task 2: GuildEconomyRewardConfig Model

**Files:**
- Create: `src/models/guildEconomyRewardConfig.model.ts`

- [ ] **Step 1: Create the model**

Create `src/models/guildEconomyRewardConfig.model.ts`:

```ts
import { model, Schema, Document } from "mongoose";

export interface IGuildEconomyRewardConfig extends Document {
    guildId: string;
    enabled: boolean;
    levelUpCoinBase: number;
    levelUpCoinPerLevel: number;
    gemMilestones: Map<string, number>;
    voiceCoinInterval: number;
    voiceCoinReward: number;
}

const DEFAULT_GEM_MILESTONES = new Map([
    ["10", 1],
    ["25", 2],
    ["50", 3],
    ["75", 4],
    ["100", 5],
]);

const guildEconomyRewardConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        levelUpCoinBase: { type: Number, default: 50 },
        levelUpCoinPerLevel: { type: Number, default: 10 },
        gemMilestones: {
            type: Map,
            of: Number,
            default: () => new Map(DEFAULT_GEM_MILESTONES),
        },
        voiceCoinInterval: { type: Number, default: 30 },
        voiceCoinReward: { type: Number, default: 10 },
    },
    {
        timestamps: true,
        collection: "GuildEconomyRewardConfigs",
    }
);

const GuildEconomyRewardConfigModel = model<IGuildEconomyRewardConfig>(
    "GuildEconomyRewardConfig",
    guildEconomyRewardConfigSchema
);

export default GuildEconomyRewardConfigModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/guildEconomyRewardConfig.model.ts
git commit -m "feat(economy): add GuildEconomyRewardConfig model

Per-guild config for passive economy rewards: level-up coin/gem
amounts and voice time coin interval/reward. Defaults: 50 base
coin + 10 per level, gem at milestones 10/25/50/75/100, voice
10 coin per 30 minutes."
```

---

### Task 3: Activity Reward Utility Functions

**Files:**
- Create: `src/util/economy/activityReward.ts`

- [ ] **Step 1: Create the utility module**

Create `src/util/economy/activityReward.ts`:

```ts
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GuildEconomyRewardConfigModel, {
    IGuildEconomyRewardConfig,
} from "../../models/guildEconomyRewardConfig.model";
import { logger } from "../log/logger.mixed";

const CONFIG_CACHE_TTL = 300; // 5 minutes

export interface LevelUpRewardResult {
    coinReward: number;
    gemReward: number;
}

async function getRewardConfig(guildId: string): Promise<IGuildEconomyRewardConfig> {
    const cacheKey = `economy_reward_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildEconomyRewardConfig;

    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export async function invalidateRewardConfigCache(guildId: string): Promise<void> {
    await redis.deleteKey(`economy_reward_config:${guildId}`);
}

export async function rewardLevelUp(
    userId: string,
    guildId: string,
    newLevel: number
): Promise<LevelUpRewardResult> {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled) return { coinReward: 0, gemReward: 0 };

        const coinReward = config.levelUpCoinBase + newLevel * config.levelUpCoinPerLevel;
        await CurrencyService.addCoin(userId, guildId, coinReward, "level_up", {
            level: newLevel,
        });

        // Check gem milestone
        const milestones = config.gemMilestones instanceof Map
            ? config.gemMilestones
            : new Map(Object.entries(config.gemMilestones ?? {}));
        const gemReward = milestones.get(String(newLevel)) ?? 0;

        if (gemReward > 0) {
            await CurrencyService.addGem(userId, guildId, gemReward, "level_up", {
                level: newLevel,
            });
        }

        return { coinReward, gemReward };
    } catch (error) {
        logger.error(`[activityReward:levelUp] ${error instanceof Error ? error.message : "Unknown error"}`);
        return { coinReward: 0, gemReward: 0 };
    }
}

export async function tickVoiceCoinReward(userId: string, guildId: string): Promise<void> {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled || config.voiceCoinReward <= 0) return;

        const key = `voice_coin:${guildId}:${userId}`;
        const current = ((await redis.getJson(key)) as number) ?? 0;
        const count = current + 1;

        if (count >= config.voiceCoinInterval) {
            await CurrencyService.addCoin(userId, guildId, config.voiceCoinReward, "voice_reward", {
                minutes: config.voiceCoinInterval,
            });
            await redis.setJson(key, 0, 3600);
        } else {
            await redis.setJson(key, count, 3600);
        }
    } catch (error) {
        logger.error(`[activityReward:voiceCoin] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export async function cleanupVoiceCoinCounter(userId: string, guildId: string): Promise<void> {
    await redis.deleteKey(`voice_coin:${guildId}:${userId}`);
}
```

Note on `gemMilestones` handling: When loaded from Redis cache (JSON), the Map is deserialized as a plain object. The code handles both `Map` and plain object cases.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/economy/activityReward.ts
git commit -m "feat(economy): add activityReward utility for level-up and voice coin rewards

rewardLevelUp() calculates coin from formula + checks gem milestones.
tickVoiceCoinReward() tracks voice minutes via Redis counter and
awards coin when interval reached. Both use cached GuildEconomyRewardConfig."
```

---

### Task 4: Hook into messageCreate.ts

**Files:**
- Modify: `src/events/messageCreate.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top of `src/events/messageCreate.ts`:

```ts
import { rewardLevelUp } from "../util/economy/activityReward";
```

- [ ] **Step 2: Hook rewardLevelUp after level-up detection**

Replace the level-up block (lines 72-76):

```ts
            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
            }
```

With:

```ts
            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                await rewardLevelUp(message.author.id, message.guild.id, newLevel);
            }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/events/messageCreate.ts
git commit -m "feat(economy): hook level-up coin/gem reward into messageCreate

Awards coin (base + level * perLevel) and gem (at milestone levels)
when a user levels up via message XP."
```

---

### Task 5: Hook into voiceStateUpdate.ts

**Files:**
- Modify: `src/events/voiceStateUpdate.ts`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `src/events/voiceStateUpdate.ts`:

```ts
import { rewardLevelUp, tickVoiceCoinReward, cleanupVoiceCoinCounter } from "../util/economy/activityReward";
```

- [ ] **Step 2: Add tickVoiceCoinReward in the voice XP interval**

In the `setInterval` callback, after the XP sync lines (after line 213 `await syncSnapshots(...)`) and before the level-up check (line 215), add:

```ts
                // Voice coin reward tick
                await tickVoiceCoinReward(sUserId, sGuildId);
```

- [ ] **Step 3: Add rewardLevelUp after voice level-up detection**

Replace the voice level-up block (lines 215-218):

```ts
                const newLevel = levelFromXP(updated.xp);
                if (newLevel > updated.level) {
                    await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                }
```

With:

```ts
                const newLevel = levelFromXP(updated.xp);
                if (newLevel > updated.level) {
                    await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    await rewardLevelUp(sUserId, sGuildId, newLevel);
                }
```

- [ ] **Step 4: Add cleanupVoiceCoinCounter to stopVoiceSession**

Replace the `stopVoiceSession` function (line 50-52):

```ts
async function stopVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.removeFromSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
}
```

With:

```ts
async function stopVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.removeFromSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
    await cleanupVoiceCoinCounter(userId, guildId);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/events/voiceStateUpdate.ts
git commit -m "feat(economy): hook voice coin reward and level-up reward into voiceStateUpdate

tickVoiceCoinReward() called every 60s voice tick, awards coin
when counter reaches interval. rewardLevelUp() called on voice
level-ups. Redis counter cleaned up on voice session end."
```

---

### Task 6: Admin Command — reward-config

**Files:**
- Modify: `src/commands/slash/economy.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json` (and 13 other locale files)

- [ ] **Step 1: Add i18n keys to en.json**

Add these keys to `src/locales/en.json`:

```json
    "economy.reward_config.title": "Economy Reward Config",
    "economy.reward_config.enabled": "Passive Rewards",
    "economy.reward_config.level_base": "Level Up Base Coin",
    "economy.reward_config.level_per": "Coin per Level",
    "economy.reward_config.gem_milestones": "Gem Milestones",
    "economy.reward_config.voice_interval": "Voice Coin Interval (min)",
    "economy.reward_config.voice_reward": "Voice Coin Reward",
    "economy.reward_config.updated": "Reward config updated.",
    "economy.reward_config.toggled_on": "Passive rewards **enabled**.",
    "economy.reward_config.toggled_off": "Passive rewards **disabled**.",
    "economy.reward_config.milestone_set": "Gem milestone set: Level **{{level}}** → **{{gems}}** gem",
    "economy.reward_config.milestone_removed": "Gem milestone removed: Level **{{level}}**",
```

- [ ] **Step 2: Add i18n keys to vi.json**

Add these keys to `src/locales/vi.json`:

```json
    "economy.reward_config.title": "Cấu hình phần thưởng kinh tế",
    "economy.reward_config.enabled": "Phần thưởng thụ động",
    "economy.reward_config.level_base": "Coin cơ bản lên cấp",
    "economy.reward_config.level_per": "Coin mỗi cấp",
    "economy.reward_config.gem_milestones": "Mốc thưởng Gem",
    "economy.reward_config.voice_interval": "Chu kỳ coin voice (phút)",
    "economy.reward_config.voice_reward": "Coin thưởng voice",
    "economy.reward_config.updated": "Đã cập nhật cấu hình phần thưởng.",
    "economy.reward_config.toggled_on": "Phần thưởng thụ động đã **bật**.",
    "economy.reward_config.toggled_off": "Phần thưởng thụ động đã **tắt**.",
    "economy.reward_config.milestone_set": "Mốc gem đã đặt: Cấp **{{level}}** → **{{gems}}** gem",
    "economy.reward_config.milestone_removed": "Mốc gem đã xóa: Cấp **{{level}}**",
```

- [ ] **Step 3: Add same keys to the other 13 locale files**

Add the same English keys (from Step 1) to all other locale files: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`. Use the English text as placeholder — translations can be improved later.

- [ ] **Step 4: Add reward-config subcommands to economy.ts**

In `src/commands/slash/economy.ts`, add the following subcommands to the builder (after the existing `add-gem` subcommand, before the closing of the builder chain):

```ts
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-view")
                .setDescription("View passive reward config")
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-toggle")
                .setDescription("Enable/disable passive rewards")
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-set")
                .setDescription("Set a reward config value")
                .addStringOption((opt) =>
                    opt
                        .setName("setting")
                        .setDescription("Setting to change")
                        .setRequired(true)
                        .addChoices(
                            { name: "level-coin-base", value: "levelUpCoinBase" },
                            { name: "level-coin-per-level", value: "levelUpCoinPerLevel" },
                            { name: "voice-interval", value: "voiceCoinInterval" },
                            { name: "voice-reward", value: "voiceCoinReward" },
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
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-milestone")
                .setDescription("Set/remove a gem milestone (gems=0 removes)")
                .addIntegerOption((opt) =>
                    opt
                        .setName("level")
                        .setDescription("Level for the milestone")
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("gems")
                        .setDescription("Gem reward (0 to remove)")
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
```

- [ ] **Step 5: Add imports and handler cases**

Add to the imports at the top of `economy.ts`:

```ts
import GuildEconomyRewardConfigModel from "../../models/guildEconomyRewardConfig.model";
import { invalidateRewardConfigCache } from "../../util/economy/activityReward";
```

Add these cases to the `switch (subcommand)` block, before the `default` case:

```ts
                case "reward-config-view": {
                    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const milestones = config.gemMilestones instanceof Map
                        ? config.gemMilestones
                        : new Map(Object.entries(config.gemMilestones ?? {}));
                    const milestoneStr = [...milestones.entries()]
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([lvl, gems]) => `Lv.${lvl} → ${gems} 💎`)
                        .join("\n") || "None";

                    embed = new EmbedBuilder()
                        .setTitle(t(locale, "economy.reward_config.title"))
                        .addFields(
                            { name: t(locale, "economy.reward_config.enabled"), value: config.enabled ? "✅" : "❌", inline: true },
                            { name: t(locale, "economy.reward_config.level_base"), value: String(config.levelUpCoinBase), inline: true },
                            { name: t(locale, "economy.reward_config.level_per"), value: String(config.levelUpCoinPerLevel), inline: true },
                            { name: t(locale, "economy.reward_config.voice_interval"), value: `${config.voiceCoinInterval} min`, inline: true },
                            { name: t(locale, "economy.reward_config.voice_reward"), value: String(config.voiceCoinReward), inline: true },
                            { name: t(locale, "economy.reward_config.gem_milestones"), value: milestoneStr },
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "reward-config-toggle": {
                    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const newEnabled = !config.enabled;
                    await GuildEconomyRewardConfigModel.updateOne({ guildId }, { $set: { enabled: newEnabled } });
                    await invalidateRewardConfigCache(guildId);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, newEnabled ? "economy.reward_config.toggled_on" : "economy.reward_config.toggled_off"))
                        .setColor(newEnabled ? 0x57f287 : 0xed4245);
                    break;
                }
                case "reward-config-set": {
                    const setting = interaction.options.getString("setting", true);
                    const value = interaction.options.getInteger("value", true);
                    await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $set: { [setting]: value }, $setOnInsert: { guildId } },
                        { upsert: true }
                    );
                    await invalidateRewardConfigCache(guildId);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "economy.reward_config.updated"))
                        .setColor(0x57f287);
                    break;
                }
                case "reward-config-milestone": {
                    const level = interaction.options.getInteger("level", true);
                    const gems = interaction.options.getInteger("gems", true);
                    if (gems > 0) {
                        await GuildEconomyRewardConfigModel.findOneAndUpdate(
                            { guildId },
                            { $set: { [`gemMilestones.${level}`]: gems }, $setOnInsert: { guildId } },
                            { upsert: true }
                        );
                        embed = new EmbedBuilder()
                            .setDescription(t(locale, "economy.reward_config.milestone_set", { level: String(level), gems: String(gems) }))
                            .setColor(0x57f287);
                    } else {
                        await GuildEconomyRewardConfigModel.findOneAndUpdate(
                            { guildId },
                            { $unset: { [`gemMilestones.${level}`]: "" }, $setOnInsert: { guildId } },
                            { upsert: true }
                        );
                        embed = new EmbedBuilder()
                            .setDescription(t(locale, "economy.reward_config.milestone_removed", { level: String(level) }))
                            .setColor(0xed4245);
                    }
                    await invalidateRewardConfigCache(guildId);
                    break;
                }
```

Note: The existing `const target = interaction.options.getUser("user", true);` and `const amount = interaction.options.getInteger("amount", true);` will fail for the new subcommands that don't have these options. Move them inside each case that needs them. Replace the current lines 114-115:

```ts
            const subcommand = interaction.options.getSubcommand(true);
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
```

With:

```ts
            const subcommand = interaction.options.getSubcommand(true);
```

Then add `const target = interaction.options.getUser("user", true);` and `const amount = interaction.options.getInteger("amount", true);` at the start of each of the four existing cases (`set-coin`, `add-coin`, `set-gem`, `add-gem`) that use them.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/commands/slash/economy.ts src/locales/
git commit -m "feat(economy): add reward-config admin subcommands

/economy reward-config-view — show current passive reward settings
/economy reward-config-toggle — enable/disable passive rewards
/economy reward-config-set — set level coin or voice coin values
/economy reward-config-milestone — set/remove gem milestone levels

All 15 locale files updated with new i18n keys."
```

---

### Task 7: Update Steering Documentation

**Files:**
- Modify: `docs/steering/economy-system.md`

- [ ] **Step 1: Add passive rewards section to economy-system.md**

Append the following section to `docs/steering/economy-system.md`, before any existing "Out of Scope" or final section:

```markdown
## Passive Activity Rewards

Coin and gem rewards earned automatically through XP-tracked activity.

### Level Up Rewards

When a user levels up (via message or voice XP):
- **Coin**: `levelUpCoinBase + (level × levelUpCoinPerLevel)` — default: `50 + (level × 10)`
- **Gem**: Awarded at milestone levels only (default: Lv.10→1, Lv.25→2, Lv.50→3, Lv.75→4, Lv.100→5)
- Transaction type: `level_up`

### Voice Time Rewards

During active voice sessions (same eligibility as voice XP):
- Every `voiceCoinInterval` minutes (default: 30), user receives `voiceCoinReward` coins (default: 10)
- Tracked via Redis counter `voice_coin:{guildId}:{userId}`, cleaned up on session end
- Transaction type: `voice_reward`

### Configuration

Per-guild via `GuildEconomyRewardConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for passive rewards |
| `levelUpCoinBase` | `50` | Base coin on level up |
| `levelUpCoinPerLevel` | `10` | Additional coin per level |
| `gemMilestones` | `{10:1, 25:2, 50:3, 75:4, 100:5}` | Level → gem reward map |
| `voiceCoinInterval` | `30` | Minutes between voice coin awards |
| `voiceCoinReward` | `10` | Coins per voice interval |

Admin commands: `/economy reward-config-view`, `reward-config-toggle`, `reward-config-set`, `reward-config-milestone`

### Dependency on XP

Passive rewards hook into the XP flow. If `GuildXPConfig.enabled = false`, XP events don't fire and passive rewards are not awarded.
```

- [ ] **Step 2: Commit**

```bash
git add docs/steering/economy-system.md
git commit -m "docs: add passive activity rewards section to economy steering doc"
```

---

### Task 8: Final Build Verification

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify new files exist**

Run: `ls src/models/guildEconomyRewardConfig.model.ts src/util/economy/activityReward.ts`
Expected: Both files listed

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Verify transaction type consistency**

Run: `grep -n "level_up\|voice_reward" src/models/transaction.model.ts src/util/economy/activityReward.ts`
Expected: Both types appear in both files consistently
