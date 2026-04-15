# Codebase Review Fixes — Design Spec

**Date**: 2026-04-15
**Approach**: Fix-in-place (Approach A) — patch each file individually, step-by-step from Critical → Low
**Scope**: 57 issues across 5 review domains (security, Discord interactions, economy, i18n, code quality)

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| Critical | 10 | Race conditions, switch fall-through, 3-second violations, `require()`, `any` types |
| High | 15 | Missing guards, logging accuracy, indexes, error handling, i18n gaps |
| Medium | 18 | Non-atomic ops, schema validators, duplicated code, hardcoded strings |
| Low | 14 | Convention cleanup, orphaned keys, cosmetic |

---

## Critical Fixes (C1–C10)

### C1. `handleConfig` switch fall-through — active data corruption

**File**: `src/commands/slash/economy.ts:107-378`
**Problem**: Missing `return` in `reward-view`, `gambling-view`, `work-view`, `social-view` cases causes fall-through into toggle cases, silently mutating config on every view.
**Fix**: Add `return` statement at the end of each case block's EmbedBuilder construction.

### C2. Pray/curse cooldown race condition

**File**: `src/services/economy/pray.service.ts:59-133`
**Problem**: Read-then-write pattern on `lastPray` — concurrent invocations both pass the cooldown check.
**Fix**: Replace the separate read (line 60) + cooldown check (line 66) + later write (line 124) with a single atomic operation that **claims the cooldown slot and returns the previous state** in one step:
```typescript
const startOfToday = new Date(); startOfToday.setUTCHours(0,0,0,0);
const eco = await UserEconomyModel.findOneAndUpdate(
    { userId, guildId, $or: [{ lastPray: null }, { lastPray: { $lt: startOfToday } }] },
    { $set: { lastPray: new Date() }, $setOnInsert: { userId, guildId } },
    { upsert: true, new: false } // returns pre-update doc for streak calculation
);
if (!eco) throw new Error("PRAY_COOLDOWN"); // filter didn't match = already prayed today
```
The returned pre-update document provides `prayStreak`, `lastStreakDate` for streak calculation. The remaining reward logic and the streak update (`prayStreak`, `lastStreakDate`) happen in a second write. This is safe because the cooldown claim is the atomicity-critical step. Same pattern for `curse()` with `lastCurse`.

### C3. Shop stock race condition

**File**: `src/services/economy/shop.service.ts:37-85`
**Problem**: Stock check at line 43 is TOCTOU; stock decrement at line 81 has no `$gte` guard.
**Fix**: Reorder operations — atomically decrement stock **first** using `findOneAndUpdate({ stock: { $gte: 1 } })`, then deduct currency. On currency failure, refund stock.

### C4. Rob stale balance

**File**: `src/commands/slash/rob.ts:90-134`
**Problem**: Target balance read at line 90 is stale by the time `deduct()` runs at line 124.
**Fix**: The `CurrencyService.deduct()` already uses `$gte` guard. Wrap the deduct in try/catch for `InsufficientFundsError` and treat it as a failed rob. The `robMinBalance` pre-filter is acceptable as a soft check.

### C5. Mine collapse / dungeon negative balance

**Files**: `src/services/economy/mine.service.ts:124-127`, `src/commands/slash/dungeon.ts:300-304`, `src/services/economy/dungeon.service.ts:246-252`
**Problem**: `$inc: { coin: -penalty }` with no `$gte` guard — balance can go negative under concurrency.
**Fix**: Replace with pipeline update using `$max` clamping:
```typescript
[{ $set: { coin: { $max: [{ $subtract: ["$coin", penalty] }, 0] }, mineDepth: checkpoint } }]
```

### C6. Moderation 3-second violation

**File**: `src/commands/slash/moderation.ts:228-461`
**Problem**: Chains `resolveLocale()` → `guild.members.fetch()` → `guild.members.fetchMe()` → moderation action before first reply.
**Fix**: Add `await interaction.deferReply({ flags: MessageFlags.Ephemeral })` at top of `execute()`. Change all `Reply.embed()` to `Reply.embedEdit()`.

### C7. Voice command missing try/catch

**File**: `src/commands/slash/voice.ts:127-357`
**Problem**: No error handling — any failure propagates to global handler in inconsistent state.
**Fix**: Wrap the switch block in try/catch. Check `interaction.replied || interaction.deferred` before choosing reply method. Use `t(locale, "common.error")`.

### C8. Loaders use `require()`

**Files**: `src/loaders/commands.ts:14`, `events.ts:11`, `buttons.ts:13`, `selectMenus.ts:13`
**Problem**: Violates CLAUDE.md "No `require()`" rule.
**Fix**: Replace `require(filePath)` with `await import(filePath)`. Make each loader function `async`. Update callers in `src/client.ts` to `await`.

### C9. Redis `any` types

**File**: `src/connector/redis/index.ts:69,85`
**Problem**: Most-used utility uses `any` for value/return types.
**Fix**:
- `setJson(key: string, value: unknown, time?: number): Promise<string | null>`
- `getJson<T = unknown>(key: string): Promise<T | null>`

### C10. Missing `cmd.*.desc` i18n keys

**Files**: All 15 locale files in `src/locales/`
**Problem**: `cmd.fish.desc`, `cmd.work.desc`, `cmd.gamble.desc`, `cmd.gift.desc`, `cmd.rob.desc` missing — non-EN users see raw key strings.
**Fix**: Add all 5 keys with native translations to all 15 locale files.

---

## High Fixes (H1–H15)

### H1. Dungeon trap/combat `$gte` guard

**Files**: `src/services/economy/dungeon.service.ts:246-252`, `src/commands/slash/dungeon.ts:300-304`
**Fix**: Same pipeline `$max` clamping as C5.

### H2. `setCoin`/`setGem` delta logging inaccuracy

**File**: `src/services/economy/currency.service.ts:123-145`
**Problem**: Reads balance, computes delta, writes — concurrent changes make logged delta wrong.
**Fix**: Use `findOneAndUpdate` with `{ new: false }` to get previous value, compute delta from actual previous.

### H3. Daily claim logs `baseReward` not `totalReward`

**File**: `src/services/economy/wallet.service.ts:202-218`
**Problem**: `premiumBonus` never logged. Audit trail doesn't sum to balance.
**Fix**: Log single transaction with `totalReward`. Include breakdown in metadata `{ base, streakBonus, premiumBonus }`. Remove separate streak bonus log.

### H4. Admin `set-coin`/`set-gem` min value

**File**: `src/commands/slash/economy.ts`
**Fix**: Add `.setMinValue(0)` to `set-coin` and `set-gem` integer options. `add-coin`/`add-gem` stay bidirectional (intentional).

### H5. `guild.model.ts` missing unique index

**File**: `src/models/guild.model.ts`
**Fix**: Add `guildSchema.index({ guildID: 1 }, { unique: true })`. Change `guildID` from `default: null` to `required: true`.

### H6. `any` types in guild/user model hooks

**Files**: `src/models/guild.model.ts:45,55,61`, `src/models/user.model.ts:54,64,70`
**Fix**: Replace `any` with `CallbackError`, `IGuild`/`IUser`, `(err?: CallbackError) => void`, `Record<string, unknown>`.

### H7. Avatar `null` URL crash

**File**: `src/commands/slash/avatar.ts:23-37`
**Fix**: Add null check on `avatarURL()`. Add `resolveLocale()` and `avatar.no_avatar` i18n key (all 15 locales).

### H8. Manga handler async ops before `deferReply()`

**File**: `src/util/manga/handler.ts:154-178`
**Fix**: Move `deferReply()` right after the star charge gate (line 172), before `PremiumService.getConfig()`. NSFW + star charge errors stay ephemeral.

### H9. Manga reader no `deferUpdate`

**File**: `src/util/manga/reader.ts:8-48`
**Fix**: Add `await interaction.deferUpdate()` first. Wrap thread ops in try/catch. Change `interaction.update()` to `interaction.editReply()`.

### H10. Wallet `guildId!` assertion in DMs

**File**: `src/commands/slash/wallet.ts:110,136`
**Fix**: Guard `QuestService.trackProgress` with `if (interaction.guildId)`.

### H11. 143 English placeholders in non-EN locales

**Files**: 13 non-EN locale files
**Fix**: Add native translations for `help.category.*` (7 keys), `info.guilds`, `info.users`, `info.uptime` (11 keys total).

### H12. Missing description localization on `/economy config` and `/gamble`

**Files**: `src/commands/slash/economy.ts:1175-1279`, `src/commands/slash/gamble.ts:41-64`
**Fix**: Add `cmd.economy.config.*` and `cmd.gamble.*` keys to all 15 locales. Add `.setDescriptionLocalizations()` calls.

### H13. Reserved `{{count}}` interpolation key

**Files**: 15 locale files + source files
**Fix**: Rename `{{count}}` to `{{total}}` in all 15 affected keys across all 15 locale files. Update corresponding `t()` calls.

### H14. Voice command accumulated latency

**File**: `src/commands/slash/voice.ts:133-179`
**Fix**: For the `"name"` subcommand (calls `voiceChannel.setName()` before reply), add `await interaction.deferReply({ flags: MessageFlags.Ephemeral })` before the Discord API mutation, then use `editReply`.

### H15. `selectMenus.ts` re-reads buttons directory

**File**: `src/loaders/selectMenus.ts`
**Fix**: Accept already-loaded handlers from button loader. Update `client.ts` to pass handlers.

---

## Medium Fixes (M1–M18)

### M1. Non-atomic `exchange()`

**File**: `src/services/economy/currency.service.ts:147-152`
**Fix**: Wrap `addGem` in try/catch. On failure, refund coins via `addCoin`.

### M2. Global shop idempotency key cleanup

**File**: `src/services/economy/globalShop.service.ts:144-145`
**Fix**: Add `await redis.deleteKey(idemKey); await redis.deleteKey(cdKey);` before `throw new Error("OUT_OF_STOCK")`.

### M3. Schema `min: 0` on coin/gem

**File**: `src/models/userEconomy.model.ts:22-23`
**Fix**: Add `min: 0` to `coin` and `gem` fields. Defense-in-depth for `save()` operations.

### M4. Manga star charge TOCTOU

**File**: `src/util/manga/handler.ts:40-57`
**Fix**: Add `incrKey(key, ttl?)` method to `RedisService` using Redis `INCR` + `EXPIRE`. Replace read-then-increment with atomic `INCR`.

### M5. Bulk tax stale pre-balances

**File**: `src/services/economy/economyBulk.service.ts:77-98`
**Fix**: No code change. Add comment documenting approximate deltas in bulk operations.

### M6. `trans.ts` leaks error details

**File**: `src/commands/slash/trans.ts:38-45`
**Fix**: Replace `error.message` with `t(locale, "trans.error")`. Add `resolveLocale()` and i18n key.

### M7. MongoDB connection string in logs

**File**: `src/connector/mongo/index.ts:16-18`
**Fix**: Mask credentials: `DB_URL.replace(/:\/\/[^@]+@/, "://*****@")`.

### M8. Regex injection length limit

**File**: `src/services/economy/economyAdmin.service.ts:491`
**Fix**: Add `if (shortId.length > 24) throw new Error("INVALID_ID")`.

### M9. Unbounded `guild.members.fetch()`

**File**: `src/commands/slash/economy.ts:974`
**Fix**: Add `// WARNING:` comment about OOM risk if `GuildMembers` intent is ever enabled.

### M10. Duplicated utility functions

**New files**: `src/util/math/random.ts`, `src/util/date/utc.ts`, `src/util/math/prime.ts`, `src/util/date/format.ts`
**Fix**: Extract shared functions, update all 11 import sites. No logic changes.

### M11. Hardcoded English in global error handlers

**Files**: `src/events/interactionCreate.ts:50-58`, `interactionCreateButton.ts:27-33`, `interactionCreateSelectMenu.ts:22-32`
**Fix**: `resolveLocale(interaction).catch(() => "en" as const)` then `t(locale, "common.error")`.

### M12. Settings notification view 3-second risk

**File**: `src/commands/slash/settings.ts`
**Fix**: Add `deferReply({ flags: MessageFlags.Ephemeral })` before notification config DB queries.

### M13. Confession `refundAll` try/catch

**File**: `src/commands/slash/confession.ts:713-725`
**Fix**: Wrap refund ops in try/catch — log but don't re-throw.

### M14. Config model field validation

**Files**: `src/models/guildGamblingConfig.model.ts`, `src/models/guildWorkConfig.model.ts`
**Fix**: Add `min`/`max` to numeric fields (`robSuccessRate: min: 0, max: 1`, `minBet: min: 0`, etc.).

### M15. Fragile error string-matching

**Fix**: No change this pass. Backlog for typed error classes migration.

### M16. `economyAdmin.service.ts` cognitive complexity

**File**: `src/services/economy/economyAdmin.service.ts:298-374`
**Fix**: Extract `buildSnapshotData()` and `pruneOldSnapshots()` helper functions from `resetEconomy()`.

### M17. Redis monitor gated by NODE_ENV

**File**: `src/connector/redis/index.ts:231`
**Fix**: `new RedisService({ monitor: process.env.NODE_ENV === "development" })`.

### M18. Graceful shutdown

**File**: `src/bin/www.ts:34-45`
**Fix**: Add `mongoose.disconnect()`, `redis.client.quit()`, `client.destroy()` to `shutdown()`.

---

## Low Fixes (L1–L14)

### L1. `reverseTransaction` negative balance

**File**: `src/services/economy/economyAdmin.service.ts:507-511`
**Fix**: Use pipeline `$max` clamp on coin reversal.

### L2. Rollback logs absolute values

**Fix**: No code change. Add comment documenting by-design behavior.

### L3. Gift stale display

**Fix**: No code change. Accept cosmetic inaccuracy. Add comment.

### L4. `process.env` in commands

**Files**: `src/util/config/index.ts`, `src/commands/slash/help.ts`, `info.ts`, `src/bot.ts`, `src/loaders/deploy.ts`
**Fix**: Add `URL_HOMEPAGE`, `URL_DISCUSSIONS`, `DISCORD_TOKEN` to config module. Update all import sites.

### L5. Inconsistent ID naming (`guildID` vs `guildId`)

**Fix**: No migration. Add code comments in `guild.model.ts` and `user.model.ts` explaining legacy naming.

### L6. `ephemeral: true` → `flags: MessageFlags.Ephemeral`

**Files**: All dungeon button files, manga handler
**Fix**: Replace legacy shorthand with `flags: MessageFlags.Ephemeral`.

### L7. Voice modal replies not ephemeral

**File**: `src/events/interactionCreateModal.ts:46,63`
**Fix**: Add `flags: MessageFlags.Ephemeral`.

### L8. Hardcoded English in voice limit modal

**File**: `src/buttons/voiceLimit.button.ts:17-22`
**Fix**: Add `voice.modal.limit_title` and `voice.modal.limit_label` i18n keys. Pass locale.

### L9. Orphaned locale keys

**Files**: All 15 locale files
**Fix**: Remove 5 orphaned keys: `gambling_config.cooldown`, `work_config.work_cooldown`, `work_config.fish_cooldown`, `social_config.rob_cooldown`, `social_config.rob_immunity`.

### L10. `Math.random()` for economy

**Fix**: No code change. Add comment in gambling service.

### L11. `bot.ts` side-effect one-liner

**Files**: `src/bot.ts`, `src/bin/www.ts`
**Fix**: Export `login()` function. Call from `www.ts`.

### L12. Deploy on every startup

**Files**: `src/loaders/deploy.ts`, `src/client.ts`
**Fix**: Serialize commands JSON → hash. Compare to stored `.deploy-hash` file. Skip API call if unchanged.

### L13. Confession redundant index

**File**: `src/models/confession.model.ts:68`
**Fix**: Remove inline `index: true` on `status` (compound index covers it).

### L14. Error responses not always ephemeral

**File**: `src/events/interactionCreate.ts:55-57`
**Fix**: Use `followUp({ flags: MessageFlags.Ephemeral })` instead of `editReply` when original defer was public.

---

## Files Changed Summary

| Category | Files Modified | Files Created |
|----------|---------------|---------------|
| Commands | ~15 (economy, moderation, voice, avatar, rob, wallet, help, info, confession, gamble, gift, settings, trans, dungeon, commandlog) | 0 |
| Services | ~10 (pray, shop, currency, wallet, globalShop, mine, dungeon, economyAdmin, economyBulk, economyLog) | 0 |
| Models | ~6 (guild, user, userEconomy, confession, guildGamblingConfig, guildWorkConfig) | 0 |
| Events | ~5 (interactionCreate, interactionCreateButton, interactionCreateSelectMenu, interactionCreateModal, voiceStateUpdate) | 0 |
| Loaders | 4 (commands, events, buttons, selectMenus) | 0 |
| Connectors | 2 (redis, mongo) | 0 |
| Utilities | ~4 (manga/handler, manga/reader, config/index, bot) | 4 (math/random, math/prime, date/utc, date/format) |
| Locales | 15 (all locale files) | 0 |
| Core | 2 (client, www) | 0 |

**Total**: ~63 files modified, 4 files created

## Execution Strategy

Fix step-by-step from Critical (C1-C10) → High (H1-H15) → Medium (M1-M18) → Low (L1-L14). Each severity tier as a separate commit. No test framework exists, so verification is via `npm run build` (TypeScript compilation) after each tier.
