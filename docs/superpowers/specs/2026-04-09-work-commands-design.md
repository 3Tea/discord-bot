# Work & Task Commands Design

## Context

The economy now has passive XP rewards (Part 1) and gambling (Part 2). Users still lack active earning methods between pray/curse daily cycles. Work commands add cooldown-based earning — short active interactions throughout the day that provide steady coin income.

**Goal:** Add `/work` and `/fish` commands — cooldown-based coin earning with admin configurable rates. `/work` is a simple random reward, `/fish` adds variety with rarity tiers.

**Scope:** Part 3 of 4 economy expansions. This spec covers only work/task commands.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Commands | `/work` + `/fish` separate | Natural command names, shared service for DRY |
| Work mechanic | Random coin range + flavor text | Simple, follows pray/curse pattern |
| Fish mechanic | 4 rarity tiers, instant coin | Instant reward, no inventory needed |
| Cooldowns | Admin configurable | Follow existing config pattern |
| Fish rewards scaling | Multiplier instead of per-tier config | 1 number vs 8, simpler for admin |
| No `/daily` | Already have `/pray` for daily pattern | Avoid overlap |

## 1. `/work` Command

`/work` — no options.

**Flow:** check cooldown → random coin in `[workMinReward, workMaxReward]` → random flavor text → addCoin → set cooldown → reply embed.

**Defaults:** 80-200 coin reward, 4 hour cooldown (14400 seconds).

**Flavor texts** (i18n keys, 10 options — randomly selected):
```
"work.texts.0": "worked a shift at the coffee shop..."
"work.texts.1": "delivered packages across town..."
"work.texts.2": "fixed bugs in production code..."
"work.texts.3": "taught a Discord bot to behave..."
"work.texts.4": "organized files in the server room..."
"work.texts.5": "cleaned up the guild hall..."
"work.texts.6": "repaired the town bridge..."
"work.texts.7": "guarded the castle gates..."
"work.texts.8": "translated ancient scrolls..."
"work.texts.9": "painted murals in the marketplace..."
```

**Embed:**
```
💼 Work
**username** taught a Discord bot to behave...
+150 coin
```
Color: `0x57f287` (green)

**Cooldown response:**
```
⏰ You can work again in 2h 15m
```
Color: `0xed4245` (red)

**Cooldown tracking:** Redis key `work_cd:{guildId}:{userId}` with TTL = `config.workCooldown`.

**Transaction type:** `"work"`, metadata: `{ reward: number }`

## 2. `/fish` Command

`/fish` — no options.

**Flow:** check cooldown → roll rarity → pick random fish from rarity pool → random coin in range × multiplier → addCoin → set cooldown → reply embed.

**Rarity table:**

| Rarity | Emoji | Probability | Coin Range | Fish Pool |
|--------|-------|------------|------------|-----------|
| Common | 🐟 | 55% | 10-30 | Sardine, Anchovy, Carp, Mackerel, Herring |
| Uncommon | 🐠 | 28% | 40-80 | Salmon, Tuna, Bass, Trout, Catfish |
| Rare | 🐡 | 13% | 100-200 | Pufferfish, Swordfish, Eel, Octopus, Lobster |
| Legendary | 🦈 | 4% | 300-600 | Shark, Whale, Golden Koi, Kraken, Leviathan |

**Implementation:** flat probability table (same pattern as slots):
```typescript
const FISH_TABLE = [
    { threshold: 0.55, rarity: "common",    emoji: "🐟", minCoin: 10,  maxCoin: 30 },
    { threshold: 0.83, rarity: "uncommon",  emoji: "🐠", minCoin: 40,  maxCoin: 80 },
    { threshold: 0.96, rarity: "rare",      emoji: "🐡", minCoin: 100, maxCoin: 200 },
    { threshold: 1.00, rarity: "legendary", emoji: "🦈", minCoin: 300, maxCoin: 600 },
];
```

Fish names are i18n keys per rarity (5 per tier = 20 total fish names).

**Coin calculation:** `Math.floor(randomInRange(minCoin, maxCoin) * config.fishMinMultiplier)` — multiplier defaults to 1.0, admin can scale up/down.

Note: using `fishMinMultiplier` as a single multiplier (renamed from spec discussion — it's just one multiplier field called `fishRewardMultiplier` for clarity).

**Expected value at defaults:** 0.55×20 + 0.28×60 + 0.13×150 + 0.04×450 ≈ **65 coin/hour**

**Embed:**
```
🎣 Fishing
You caught a 🐡 **Pufferfish**! (Rare)
+150 coin
```
Color: varies by rarity — common `0x95a5a6`, uncommon `0x3498db`, rare `0x9b59b6`, legendary `0xf1c40f`

**Cooldown:** Redis key `fish_cd:{guildId}:{userId}` with TTL = `config.fishCooldown`. Default 1 hour (3600 seconds).

**Transaction type:** `"fish"`, metadata: `{ fish: string, rarity: string, reward: number }`

## 3. WorkService

**File:** `src/services/economy/work.service.ts`

Shared logic for both commands:

```typescript
function randomInRange(min: number, max: number): number
function formatCooldown(seconds: number): string  // "2h 15m" or "45m" or "30s"
function rollFish(): { name: string, rarity: string, emoji: string, minCoin: number, maxCoin: number }
```

`randomInRange` and `formatCooldown` are generic helpers. `rollFish` uses the flat probability table.

Cooldown checking and setting is done directly in the command files using `redis.ttlKey()` and `redis.setJson()` — same pattern as gambling. No need to abstract into the service.

## 4. Configuration

### GuildWorkConfig Model

**File:** `src/models/guildWorkConfig.model.ts`

```typescript
interface IGuildWorkConfig extends Document {
    guildId: string;
    enabled: boolean;
    workCooldown: number;
    workMinReward: number;
    workMaxReward: number;
    fishCooldown: number;
    fishRewardMultiplier: number;
}
```

**Defaults:**

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String, required, unique | — |
| `enabled` | Boolean | `true` |
| `workCooldown` | Number | `14400` (4 hours) |
| `workMinReward` | Number | `80` |
| `workMaxReward` | Number | `200` |
| `fishCooldown` | Number | `3600` (1 hour) |
| `fishRewardMultiplier` | Number | `1.0` |

Collection: `"GuildWorkConfigs"`

**Caching:** Redis `work_config:{guildId}` with 5-minute TTL. Invalidate on admin config change.

### Admin Commands

Extend `/economy` with:
- `/economy work-config-view` — show all config fields
- `/economy work-config-toggle` — enable/disable work + fish
- `/economy work-config-set <setting> <value>` — choices: workCooldown, workMinReward, workMaxReward, fishCooldown, fishRewardMultiplier

## 5. Transaction Types

Add `"work"` and `"fish"` to `TransactionType` union and schema enum.

**Work metadata:** `{ reward: number }`
**Fish metadata:** `{ fish: string, rarity: string, reward: number }`

## 6. i18n

New keys needed (all 15 locale files):

```
// Work command
"work.title": "Work"
"work.flavor": "**{{username}}** {{text}}"
"work.reward": "+{{amount}} coin"
"work.cooldown": "You can work again in **{{time}}**."
"work.disabled": "Work commands are disabled in this server."
"work.texts.0" through "work.texts.9": 10 flavor texts

// Fish command
"fish.title": "Fishing"
"fish.catch": "You caught a {{emoji}} **{{fish}}**! ({{rarity}})"
"fish.reward": "+{{amount}} coin"
"fish.cooldown": "You can fish again in **{{time}}**."
"fish.rarity.common": "Common"
"fish.rarity.uncommon": "Uncommon"
"fish.rarity.rare": "Rare"
"fish.rarity.legendary": "Legendary"

// Fish names (5 per rarity = 20 total)
"fish.common.0": "Sardine"
"fish.common.1": "Anchovy"
"fish.common.2": "Carp"
"fish.common.3": "Mackerel"
"fish.common.4": "Herring"
"fish.uncommon.0": "Salmon"
"fish.uncommon.1": "Tuna"
"fish.uncommon.2": "Bass"
"fish.uncommon.3": "Trout"
"fish.uncommon.4": "Catfish"
"fish.rare.0": "Pufferfish"
"fish.rare.1": "Swordfish"
"fish.rare.2": "Eel"
"fish.rare.3": "Octopus"
"fish.rare.4": "Lobster"
"fish.legendary.0": "Shark"
"fish.legendary.1": "Whale"
"fish.legendary.2": "Golden Koi"
"fish.legendary.3": "Kraken"
"fish.legendary.4": "Leviathan"

// Admin config
"work_config.title": "Work & Fish Config"
"work_config.enabled": "Work Commands"
"work_config.work_cooldown": "Work Cooldown"
"work_config.work_min": "Work Min Reward"
"work_config.work_max": "Work Max Reward"
"work_config.fish_cooldown": "Fish Cooldown"
"work_config.fish_multiplier": "Fish Reward Multiplier"
"work_config.updated": "Work config updated."
"work_config.toggled_on": "Work commands **enabled**."
"work_config.toggled_off": "Work commands **disabled**."
```

EN + VI fully translated. 13 other locales with English placeholder.

## 7. Files Changed Summary

| Action | File |
|--------|------|
| **New** | `src/commands/slash/work.ts` |
| **New** | `src/commands/slash/fish.ts` |
| **New** | `src/services/economy/work.service.ts` |
| **New** | `src/models/guildWorkConfig.model.ts` |
| **Modified** | `src/models/transaction.model.ts` — add `"work"`, `"fish"` types |
| **Modified** | `src/commands/slash/economy.ts` — add work-config subcommands |
| **Modified** | `src/locales/*.json` (15 files) — add work, fish, config i18n keys |

## Out of Scope

- `/daily` command (overlaps with `/pray`)
- `/mine`, `/hunt` (same mechanic as `/fish` — add later as theme variants)
- Fish inventory / selling system
- Collection tracker / achievements
- Fish rarity display in `/balance`
- Work/fish leaderboard
