# Passive Economy Rewards Design

## Context

The economy system currently has only 2 ways to earn currency: `/pray` (50-200 coin/day + 5% gem chance + streak milestones) and `/curse` (20-100 coin/day, no gems). Users active in voice and chat gain XP but receive zero economic reward. The XP and economy systems are completely independent.

**Goal:** Add passive coin/gem rewards that hook into the existing XP flow — rewarding activity users already do (leveling up, spending time in voice) without requiring new commands. Coin rewards are per-guild, configurable by admins, and designed to be extensible for a future global currency layer.

**Scope:** This spec covers only passive activity rewards (part 1 of 4 planned economy expansions: passive rewards, mini-games, work commands, social interactions).

**Future context:** A cross-server economy is planned — global wallet with a separate currency + exchange system between guild and global. This spec does not implement it but avoids design decisions that would block it. The `CurrencyService` interface remains unchanged; future global rewards would call a parallel `GlobalCurrencyService`.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Reward triggers | Level up + voice time | High impact, low abuse risk. No message rewards (spam incentive) |
| Gem source | Level up milestones only | Keep gems rare and valuable |
| Hook strategy | Direct hook into XP flow | YAGNI — simple, uses existing anti-spam/eligibility |
| Config | Separate model from XP config | Different concerns, independent enable/disable |
| Voice tracking | Redis counter per session | Lightweight, auto-expires with voice session |
| Anti-abuse | Reuse XP eligibility checks | Consistent behavior, no new complexity |

## 1. Reward Triggers

### 1.1 Level Up Rewards

Triggered in `messageCreate.ts` and `voiceStateUpdate.ts` after level-up detection (when `newLevel > updated.level`).

**Coin formula:**
```
coinReward = config.levelUpCoinBase + (newLevel * config.levelUpCoinPerLevel)
```

Defaults: `levelUpCoinBase = 50`, `levelUpCoinPerLevel = 10`

**Example rewards at defaults:**

| Level | Coin | Gem |
|-------|------|-----|
| 1 | 60 | — |
| 5 | 100 | — |
| 10 | 150 | 1 |
| 15 | 200 | — |
| 25 | 300 | 2 |
| 50 | 550 | 3 |
| 75 | 800 | 4 |
| 100 | 1050 | 5 |

**Gem milestones** (configurable, stored as Map):

```
Default: { 10: 1, 25: 2, 50: 3, 75: 4, 100: 5 }
```

Gem is awarded only when `newLevel` is an exact key in the milestones map.

**Implementation:**
1. After existing level-up detection (`newLevel > updated.level`), load `GuildEconomyRewardConfig`
2. If `enabled === false`, skip
3. Calculate coin reward from formula
4. Call `CurrencyService.addCoin(userId, guildId, coinReward, "level_up", { level: newLevel })`
5. Check if `newLevel` is in `gemMilestones` map
6. If yes, call `CurrencyService.addGem(userId, guildId, gemAmount, "level_up", { level: newLevel })`

### 1.2 Voice Time Rewards

Triggered inside the existing 60-second voice XP tick interval in `voiceStateUpdate.ts`.

**Mechanism:**
- Each voice XP tick increments a Redis counter: `voice_coin:{guildId}:{userId}`
- When counter reaches `config.voiceCoinInterval` (default: 30 ticks = 30 minutes), award coin and reset counter to 0
- Counter key has no explicit TTL — it is deleted when the voice session ends (in `stopVoiceSession()`)

**Defaults:** `voiceCoinInterval = 30` (minutes), `voiceCoinReward = 10` (coins per interval)

**Earning rate at defaults:** 10 coin / 30 min = ~20 coin/hour (conservative vs. pray's 50-200 coin/day)

**Implementation:**
1. In the voice XP tick loop, after XP is awarded:
2. Load `GuildEconomyRewardConfig` for the guild
3. If `enabled === false`, skip
4. Increment Redis key `voice_coin:{guildId}:{userId}` (INCR command)
5. If value >= `config.voiceCoinInterval`:
   - Call `CurrencyService.addCoin(userId, guildId, config.voiceCoinReward, "voice_reward", { minutes: config.voiceCoinInterval })`
   - Reset Redis key to 0 (SET to 0)
6. On `stopVoiceSession()`, delete the Redis key (cleanup)

### 1.3 What Is NOT Rewarded

- **Messages** — no coin per message. XP anti-spam exists but adding coin incentive would increase spam motivation beyond what current anti-spam handles.
- **Reactions** — too small to matter, easy to farm with reaction bots.

## 2. Configuration Model

### GuildEconomyRewardConfig

New Mongoose model following `GuildXPConfig` pattern:

```typescript
interface IGuildEconomyRewardConfig extends Document {
  guildId: string;
  enabled: boolean;

  // Level up
  levelUpCoinBase: number;
  levelUpCoinPerLevel: number;
  gemMilestones: Map<string, number>;  // string keys for Mongoose Map compatibility

  // Voice
  voiceCoinInterval: number;
  voiceCoinReward: number;
}
```

**Schema defaults:**

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String, required, unique | — |
| `enabled` | Boolean | `true` |
| `levelUpCoinBase` | Number | `50` |
| `levelUpCoinPerLevel` | Number | `10` |
| `gemMilestones` | Map<String, Number> | `{ "10": 1, "25": 2, "50": 3, "75": 4, "100": 5 }` |
| `voiceCoinInterval` | Number | `30` |
| `voiceCoinReward` | Number | `10` |

**File:** `src/models/guildEconomyRewardConfig.model.ts`

**Caching:** Use Redis cache with 5-minute TTL (`economy_reward_config:{guildId}`) to avoid DB lookups on every voice tick. Invalidate on admin config change.

### Admin Command

Extend `/economy` with new subcommand group `reward-config`:

- `/economy reward-config view` — show current config
- `/economy reward-config toggle` — enable/disable passive rewards
- `/economy reward-config level-coin-base <amount>` — set base coin for level up
- `/economy reward-config level-coin-per-level <amount>` — set per-level coin multiplier
- `/economy reward-config gem-milestone <level> <gems>` — set/update a gem milestone (gems=0 removes it)
- `/economy reward-config voice-interval <minutes>` — set voice coin interval
- `/economy reward-config voice-reward <amount>` — set voice coin amount

All subcommands require `Administrator` permission (same as existing `/economy` subcommands).

## 3. Hook Points in Existing Code

### messageCreate.ts

After the existing level-up detection block (~line 72-76):

```
// Existing code:
const newLevel = levelFromXP(updated.xp);
if (newLevel > updated.level) {
  await MemberXP.updateOne({ ... }, { $set: { level: newLevel } });
}

// New code (after level update):
if (newLevel > updated.level) {
  await rewardLevelUp(updated.userId, message.guildId, newLevel);
}
```

`rewardLevelUp()` is a utility function in `src/util/economy/activityReward.ts` that encapsulates the config lookup, coin calculation, gem milestone check, and CurrencyService calls.

### voiceStateUpdate.ts

Inside the 60-second voice XP tick loop (~line 193-208), after XP is awarded:

```
// Existing code:
const updated = await MemberXP.findOneAndUpdate(...);
// ... sync, level check

// New code (after XP award):
await tickVoiceCoinReward(userId, guildId);

// And after level-up detection:
if (newLevel > updated.level) {
  await rewardLevelUp(userId, guildId, newLevel);
}
```

`tickVoiceCoinReward()` is a utility function in `src/util/economy/activityReward.ts` that handles the Redis counter logic.

### stopVoiceSession()

Add cleanup of `voice_coin:{guildId}:{userId}` Redis key when voice session ends.

## 4. New Utility Module

**File:** `src/util/economy/activityReward.ts`

Two exported functions:

### `rewardLevelUp(userId, guildId, newLevel)`

1. Load config (from cache or DB)
2. If `!config.enabled`, return
3. Calculate `coinReward = config.levelUpCoinBase + (newLevel * config.levelUpCoinPerLevel)`
4. `await CurrencyService.addCoin(userId, guildId, coinReward, "level_up", { level: newLevel })`
5. Check `config.gemMilestones.get(String(newLevel))`
6. If gem amount > 0, `await CurrencyService.addGem(userId, guildId, gemAmount, "level_up", { level: newLevel })`
7. Return `{ coinReward, gemReward: gemAmount || 0 }` (for optional use in level-up announcements)

### `tickVoiceCoinReward(userId, guildId)`

1. Load config (from cache or DB)
2. If `!config.enabled`, return
3. `const count = await redis.incr(\`voice_coin:${guildId}:${userId}\`)`
4. If `count >= config.voiceCoinInterval`:
   - `await CurrencyService.addCoin(userId, guildId, config.voiceCoinReward, "voice_reward", { minutes: config.voiceCoinInterval })`
   - `await redis.set(\`voice_coin:${guildId}:${userId}\`, 0)`
5. Return

## 5. Transaction Types

Extend the `type` field in Transaction model to include:

- `"level_up"` — metadata: `{ level: number, coinAmount: number, gemAmount?: number }`
- `"voice_reward"` — metadata: `{ minutes: number, coinAmount: number }`

Current types remain unchanged: `"pray"`, `"curse"`, `"purchase"`, `"exchange"`, `"streak_bonus"`, `"admin"`, `"confession_vip"`, `"confession_skip_cd"`, `"confession_refund"`, `"confession_reply"`.

## 6. Anti-Abuse

### Voice AFK Farming

No new anti-abuse logic. Reuse existing voice XP eligibility:
- ≥2 non-bot members in channel
- Not deafened (self or server)
- Channel not in `GuildXPConfig.blacklistedChannels`

If a server has AFK farming issues, admin can:
- Increase `voiceCoinInterval` (e.g., 60 minutes instead of 30)
- Decrease `voiceCoinReward` (e.g., 5 instead of 10)
- Set `enabled: false` to disable completely

### Level Up Exploit

Not possible — level up fires once per level (newLevel > cached level, cached level updated immediately). XP is monotonically increasing, so the same level cannot be reached twice.

### XP Disabled Interaction

If `GuildXPConfig.enabled = false`, XP events don't fire, so coin rewards don't fire either. This is expected behavior — passive coin rewards are coupled to XP activity.

## 7. i18n

All user-facing strings via `t(locale, key)`:

New keys needed (in all 15 locale files):

```
"economy.reward.level_up": "Level up! +{{coin}} coin{{gemText}}"
"economy.reward.level_up.gem": " +{{gem}} gem"
"economy.reward.voice": "+{{coin}} coin ({{minutes}} min voice)"
"economy.reward_config.title": "Economy Reward Config"
"economy.reward_config.enabled": "Passive Rewards"
"economy.reward_config.level_base": "Level Up Base Coin"
"economy.reward_config.level_per": "Coin per Level"
"economy.reward_config.gem_milestones": "Gem Milestones"
"economy.reward_config.voice_interval": "Voice Coin Interval (min)"
"economy.reward_config.voice_reward": "Voice Coin Reward"
"economy.reward_config.updated": "Reward config updated"
"economy.reward_config.toggled_on": "Passive rewards enabled"
"economy.reward_config.toggled_off": "Passive rewards disabled"
```

## 8. Files Changed Summary

| Action | File |
|--------|------|
| **New** | `src/models/guildEconomyRewardConfig.model.ts` |
| **New** | `src/util/economy/activityReward.ts` |
| **Modified** | `src/events/messageCreate.ts` — add `rewardLevelUp()` call after level-up |
| **Modified** | `src/events/voiceStateUpdate.ts` — add `tickVoiceCoinReward()` in tick loop + `rewardLevelUp()` after level-up + Redis cleanup in `stopVoiceSession()` |
| **Modified** | `src/commands/slash/economy.ts` — add `reward-config` subcommand group |
| **Modified** | `src/models/transaction.model.ts` — extend type enum with `"level_up"`, `"voice_reward"` |
| **Modified** | `src/locales/*.json` (15 files) — add new i18n keys |
| **Unchanged** | `src/services/economy/currency.service.ts` — existing `addCoin/addGem` used as-is |
| **Unchanged** | `src/models/userEconomy.model.ts` — no schema changes |
| **Unchanged** | `src/models/memberXP.model.ts` — no schema changes |
| **Unchanged** | `src/models/guildXPConfig.model.ts` — no schema changes |

## Out of Scope

- Message coin rewards (spam risk)
- Reaction coin rewards (too small, easy to farm)
- Global/cross-server currency (separate future spec)
- Mini-games, work commands, social interactions (separate future specs)
- Level-up announcement system (could be added later, `rewardLevelUp()` returns amounts for it)
- Economy leaderboard (existing coin index supports it, but no command yet)
- Voice coin reward for reaction XP events
