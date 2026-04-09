# Social Interactions Design

## Context

The economy now has passive rewards (Part 1), gambling (Part 2), and work/fish commands (Part 3). All earning/spending flows are user-to-system. There is no user-to-user coin transfer, creating an isolated economy where users don't interact economically. Social interactions add PvP engagement and coin flow between users.

**Goal:** Add `/gift` and `/rob` commands — user-to-user coin transfers with configurable limits, protections, and rob as a net coin sink.

**Scope:** Part 4 of 4 economy expansions. This spec completes the economy feature set.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Commands | `/gift` + `/rob` separate | Different complexity, natural command names |
| Gift mechanic | Direct transfer, max limit, no cooldown | Simple, wholesome, max prevents alt abuse |
| Gift tax | No tax | Gift is social feature, rob is already a coin sink |
| Rob mechanic | 40% success, %-based steal/penalty | High stakes PvP, net coin sink |
| Rob protections | Min balance + immunity after robbed | Prevents bullying new users and gang robbing |
| No `/trade` | Gift covers simple transfers | Trade needs button state management, low value-add |

## 1. `/gift` Command

`/gift <user> <amount>`

**Options:**
- `user` (User, required) — recipient
- `amount` (Integer, required, minValue 1) — coin to give

**Flow:**
1. Validate: target not bot, not self, amount <= `config.giftMaxAmount`
2. `CurrencyService.deduct(giverId, guildId, amount, 0, "gift", metadata)` — atomic
3. `CurrencyService.addCoin(receiverId, guildId, amount, "gift", metadata)` — pay
4. Reply embed

**Defaults:** `giftMaxAmount = 1000`

**No cooldown** — max amount limit is sufficient protection against abuse.

**Embed:**
```
🎁 Gift
**Alice** gifted **100 coin** to **Bob**
Alice: 500 → 400 coin
Bob: 200 → 300 coin
```
Color: `0x57f287`

**Validation errors:**
- Target is bot → error embed
- Target is self → error embed
- Amount > config.giftMaxAmount → error embed with max
- InsufficientFundsError → error embed with balance

**Transaction type:** `"gift"` — logged on both deduct (giver) and addCoin (receiver). Metadata: `{ targetId: string, amount: number }` on giver, `{ fromId: string, amount: number }` on receiver.

## 2. `/rob` Command

`/rob <user>`

**Options:**
- `user` (User, required) — target to rob

**Flow:**
1. Validate: target not bot, not self
2. Check protections:
   - Robber cooldown: `redis.ttlKey(\`rob_cd:${guildId}:${userId}\`)` → if > 0, show remaining time
   - Target balance < `config.robMinBalance` (default 100) → "Target is too poor to rob"
   - Target immunity: `redis.ttlKey(\`rob_immunity:${guildId}:${targetId}\`)` → if > 0, show remaining time
3. Roll: `Math.random() < config.robSuccessRate` (default 0.4)
4. **Success:**
   - `stealPct = randomInRange(config.robStealMinPct, config.robStealMaxPct)` (default 10-30)
   - `stealAmount = Math.floor(targetBalance.coin * stealPct / 100)`
   - Cap: `stealAmount = Math.min(stealAmount, targetBalance.coin - config.robMinBalance)` — never drain below protection
   - `CurrencyService.deduct(targetId, stealAmount, 0, "rob")` — take from target
   - `CurrencyService.addCoin(robberId, stealAmount, "rob")` — give to robber
   - Set target immunity: `redis.setJson(\`rob_immunity:${guildId}:${targetId}\`, 1, config.robImmunityDuration)`
5. **Fail:**
   - `penaltyPct = randomInRange(config.robPenaltyMinPct, config.robPenaltyMaxPct)` (default 10-20)
   - `penaltyAmount = Math.floor(robberBalance.coin * penaltyPct / 100)`
   - If `penaltyAmount > 0`: `CurrencyService.deduct(robberId, penaltyAmount, 0, "rob_penalty")` — fine (coin destroyed)
   - If robber has 0 coin: skip penalty deduct, still fail
6. Set robber cooldown: `redis.setJson(\`rob_cd:${guildId}:${userId}\`, 1, config.robCooldown)`
7. Reply embed

**Economics at defaults:**
- Average steal per attempt: ~20% × 40% = 8% of target balance transferred
- Average penalty per attempt: ~15% × 60% = 9% of robber balance destroyed
- **Net: robber loses coin on average → rob is a coin sink**

**Embeds:**

Success:
```
💰 Rob — Success!
**Alice** robbed **150 coin** from **Bob**!
```
Color: `0x57f287`

Fail:
```
🚔 Rob — Caught!
**Alice** tried to rob **Bob** but got caught!
Fined **80 coin**
```
Color: `0xed4245`

**Cooldowns:**
- Robber: `rob_cd:{guildId}:{userId}`, TTL = `config.robCooldown` (default 21600s = 6h)
- Target immunity: `rob_immunity:{guildId}:{targetId}`, TTL = `config.robImmunityDuration` (default 7200s = 2h)

**Transaction types:**
- Success (robber): `"rob"`, coinDelta: +stealAmount, metadata: `{ targetId, stealPct, stealAmount }`
- Success (target): `"rob"`, coinDelta: -stealAmount, metadata: `{ robberId, stealPct, stealAmount }`
- Fail: `"rob_penalty"`, coinDelta: -penaltyAmount, metadata: `{ targetId, penaltyPct, penaltyAmount }`

## 3. SocialService

**File:** `src/services/economy/social.service.ts`

```typescript
interface RobResult {
    success: boolean;
    amount: number;        // stolen or penalty amount
    percentage: number;    // steal% or penalty%
}

function rollRob(
    robberBalance: number,
    targetBalance: number,
    config: { robSuccessRate, robStealMinPct, robStealMaxPct, robPenaltyMinPct, robPenaltyMaxPct, robMinBalance }
): RobResult

function randomInRange(min: number, max: number): number
```

Pure logic — no DB/Discord/Redis. Command files handle all I/O.

## 4. Configuration

### GuildSocialConfig Model

**File:** `src/models/guildSocialConfig.model.ts`

```typescript
interface IGuildSocialConfig extends Document {
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
```

**Defaults:**

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String, required, unique | — |
| `enabled` | Boolean | `true` |
| `giftMaxAmount` | Number | `1000` |
| `robCooldown` | Number | `21600` (6h) |
| `robSuccessRate` | Number | `0.4` (40%) |
| `robStealMinPct` | Number | `10` |
| `robStealMaxPct` | Number | `30` |
| `robPenaltyMinPct` | Number | `10` |
| `robPenaltyMaxPct` | Number | `20` |
| `robMinBalance` | Number | `100` |
| `robImmunityDuration` | Number | `7200` (2h) |

Collection: `"GuildSocialConfigs"`

**Caching:** Redis `social_config:{guildId}` with 5-minute TTL.

### Admin Commands

Extend `/economy`:
- `/economy social-config-view` — show all config fields
- `/economy social-config-toggle` — enable/disable gift + rob
- `/economy social-config-set <setting> <value>` — choices: giftMaxAmount, robCooldown, robMinBalance, robImmunityDuration (integer settings)

Note: percentage settings (robSuccessRate, robStealMinPct, etc.) are not exposed via simple integer command due to float/percentage complexity. Admin can modify directly in DB if needed. Most admins only need to tweak cooldown, min balance, and gift max.

## 5. Transaction Types

Add `"gift"`, `"rob"`, `"rob_penalty"` to `TransactionType` union and schema enum.

## 6. i18n

New keys needed (all 15 locale files):

```
// Gift
"gift.title": "Gift"
"gift.success": "**{{from}}** gifted **{{amount}} coin** to **{{to}}**"
"gift.from_balance": "{{from}}: {{before}} → {{after}} coin"
"gift.to_balance": "{{to}}: {{before}} → {{after}} coin"
"gift.max_amount": "Maximum gift is **{{max}}** coin."
"gift.self_error": "Cannot gift yourself."
"gift.bot_error": "Cannot gift a bot."
"gift.insufficient": "Not enough coin. Balance: **{{balance}}**"
"gift.disabled": "Social commands are disabled in this server."

// Rob
"rob.title.success": "Rob — Success!"
"rob.title.fail": "Rob — Caught!"
"rob.success": "**{{robber}}** robbed **{{amount}} coin** from **{{target}}**!"
"rob.fail": "**{{robber}}** tried to rob **{{target}}** but got caught!\nFined **{{penalty}} coin**"
"rob.cooldown": "You can rob again in **{{time}}**."
"rob.target_poor": "**{{target}}** doesn't have enough coin to rob."
"rob.target_immune": "**{{target}}** was recently robbed. Try again in **{{time}}**."
"rob.self_error": "Cannot rob yourself."
"rob.bot_error": "Cannot rob a bot."

// Admin config
"social_config.title": "Social Config"
"social_config.enabled": "Social Commands"
"social_config.gift_max": "Gift Max Amount"
"social_config.rob_cooldown": "Rob Cooldown"
"social_config.rob_success_rate": "Rob Success Rate"
"social_config.rob_steal_range": "Rob Steal Range"
"social_config.rob_penalty_range": "Rob Penalty Range"
"social_config.rob_min_balance": "Rob Min Balance"
"social_config.rob_immunity": "Rob Immunity"
"social_config.updated": "Social config updated."
"social_config.toggled_on": "Social commands **enabled**."
"social_config.toggled_off": "Social commands **disabled**."
```

EN + VI fully translated. 13 other locales with English placeholder.

## 7. Files Changed Summary

| Action | File |
|--------|------|
| **New** | `src/commands/slash/gift.ts` |
| **New** | `src/commands/slash/rob.ts` |
| **New** | `src/services/economy/social.service.ts` |
| **New** | `src/models/guildSocialConfig.model.ts` |
| **Modified** | `src/models/transaction.model.ts` — add `"gift"`, `"rob"`, `"rob_penalty"` types |
| **Modified** | `src/commands/slash/economy.ts` — add social-config subcommands |
| **Modified** | `src/locales/*.json` (15 files) — add gift, rob, config i18n keys |

## Out of Scope

- `/trade` (button-based accept/deny interaction — add later if needed)
- `/heist` (multi-user group robbery — complex coordination)
- Rob leaderboard / most wanted list
- Gift history / transaction viewer
- Admin-configurable rob success rate via command (use DB directly)
- Notifications to target when robbed (target sees result only if online and reading channel)
