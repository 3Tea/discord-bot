# Premium Subscription System

> Steering doc for AI assistants and contributors. Covers the premium tier system — tiers, benefits, integration points, caching, expiry, and admin commands.

## Overview

Two paid tiers (**Star** and **Galaxy**) on top of the default free tier. Premium status is stored on the `UserWallet` model and managed via `PremiumService`. Benefits are cross-cutting — they modify cooldowns, limits, drop rates, and cosmetics across many existing features.

## Data Model

Premium fields live on `UserWallet` (not a separate collection):

| Field | Type | Purpose |
|-------|------|---------|
| `premiumTier` | `"star" \| "galaxy" \| null` | Current tier, `null` = free |
| `premiumUntil` | `Date \| null` | Expiry timestamp, `null` = lifetime |
| `premiumSource` | `"auto" \| "manual" \| null` | How it was granted |
| `premiumGrantedBy` | `string \| null` | Admin userId who granted (manual only) |

Index: `{ premiumTier: 1, premiumUntil: 1 }` — used by expiry background job to find stale subscriptions.

## Tiers & Benefits

All benefit values defined in `src/services/premium/premium.config.ts` as `TIER_CONFIG`.

| Benefit | Free | Star | Galaxy |
|---------|------|------|--------|
| Manga free uses/day | 3 | 10 | Unlimited (`Infinity`) |
| Manga max pages | 35 | 70 | 100 |
| Work cooldown | 4h | 2h | 1h |
| Fish cooldown | 1h | 30m | 15m |
| Mine cooldown | 2h | 1h | 30m |
| Dungeon cooldown | 1h | 30m | 15m |
| Star drop multiplier | 1.0x | 1.5x | 2.0x |
| Confession skip-CD free | No | Yes | Yes |
| Confession VIP free | No | No | Yes |
| Daily bonus stars | 0 | 0 | +2 |
| Rank card badge | None | `"star"` | `"galaxy"` |
| Rank card theme | `"standard"` | `"standard"` | `"galaxy"` |

## Service API

`src/services/premium/premium.service.ts` — default export with these methods:

| Method | Returns | Purpose |
|--------|---------|---------|
| `getPremiumStatus(userId)` | `PremiumStatus` | Full status object (tier, isActive, until, source, grantedBy) |
| `getTier(userId)` | `PremiumTier \| null` | Just the tier enum |
| `getConfig(userId)` | `TierConfig` | Resolved benefit values — **most commands use this** |
| `activate(userId, tier, duration, source, grantedBy?)` | `{ action, until }` | Grant/extend/upgrade/downgrade |
| `revoke(userId, revokedBy, reason?)` | `boolean` | Remove premium, log transaction |

### Activation Logic

`activate()` detects the correct action automatically:

| Current state | New tier | Action | Expiry behavior |
|---------------|----------|--------|-----------------|
| Inactive | Any | `activate` | Fresh from now |
| Same tier active | Same | `extend` | Stacks on existing expiry |
| Star active | Galaxy | `upgrade` | Fresh from now |
| Galaxy active | Star | `downgrade` | Fresh from now |

Duration options: `"7d"`, `"30d"`, `"90d"`, `"365d"`, `"lifetime"` (sets `premiumUntil` to `null`).

## Redis Caching

| Key | Value | TTL |
|-----|-------|-----|
| `premium:{userId}` | `PremiumStatus` JSON | 300s (5min) |

- Cache populated on first `getPremiumStatus()` call
- Cache cleared on `activate()`, `revoke()`, and expiry
- Lazy expiry: if cached status shows expired on read, clears premium inline and logs `premium_expire` transaction

## Background Expiry Job

`src/services/premium/premiumExpiry.ts` — `startPremiumExpiry()` called from `src/bin/www.ts` on startup.

- **Initial delay**: 10 seconds (avoids startup race)
- **Interval**: 10 minutes
- **Query**: `{ premiumTier: { $ne: null }, premiumUntil: { $ne: null, $lt: now } }`
- **Actions**: Bulk clear premium fields → bulk insert `premium_expire` transactions → clear Redis cache → best-effort DM notification per user
- **DM notification**: Sends localized embed with tier name. Failures silently skipped (user may have DMs closed).

## Transaction Types

All premium state changes logged to `Transaction` model with `guildId: "global"`:

| Type | When |
|------|------|
| `premium_activate` | First activation |
| `premium_extend` | Same-tier duration extension |
| `premium_upgrade` | Star → Galaxy |
| `premium_downgrade` | Galaxy → Star |
| `premium_expire` | Automatic expiry (background job or lazy check) |
| `premium_revoke` | Admin revocation |

Metadata includes: `tier`, `duration`, `source`, `grantedBy`, `until`, `previousTier` (varies by type).

## Integration Points

### Manga (`src/util/manga/handler.ts`)
- `tierConfig.mangaFreeUses` — free daily uses before star charge gate kicks in
- `tierConfig.mangaMaxPages` — max pages per read session
- Galaxy (`Infinity`) bypasses the star charge entirely

### Cooldown Commands (`work.ts`, `fish.ts`, `mine.ts`, `dungeon.ts`)
- Each command reads `tierConfig.{command}CooldownMs` and uses it for the Redis cooldown TTL
- Pattern: `await redis.setJson(cdKey, 1, tierConfig.fishCooldownMs / 1000)`

### Star Drops (`src/util/economy/starDrop.ts`)
- Base drop chance multiplied by `tierConfig.starDropMultiplier`
- Used in: work, fish, mine, dungeon, confession reply

### Daily Claim (`src/services/economy/wallet.service.ts`)
- Galaxy users get `tierConfig.dailyBonusStars` extra stars on `/daily`

### Confession (`src/commands/slash/confession.ts`)
- `tierConfig.confessionSkipCdFree` — Star+ skip cooldown cost
- `tierConfig.confessionVipFree` — Galaxy skip VIP cost

### Rank Card (`src/commands/slash/rank.ts`, canvas utils)
- `tierConfig.badge` — badge icon on rank card
- `tierConfig.rankCardTheme` — Galaxy gets exclusive theme

## Commands (`/premium`)

| Subcommand | Access | Description |
|------------|--------|-------------|
| `status` | Public (ephemeral) | View your own tier, expiry, and active benefits |
| `compare` | Public (ephemeral) | Side-by-side Free vs Star vs Galaxy table |
| `grant` | `DEV_USER_ID` only | Grant/extend/upgrade premium to a user |
| `revoke` | `DEV_USER_ID` only | Revoke premium with optional reason |
| `lookup` | `DEV_USER_ID` only | Inspect any user's premium status |

Admin commands check `interaction.user.id === DEV_USER_ID` (not guild permissions).

## Adding a New Premium Benefit

1. Add the field to `TierConfig` interface in `src/services/premium/premium.config.ts`
2. Add values for all three tiers (`free`, `star`, `galaxy`) in `TIER_CONFIG`
3. In the consuming command/service, call `PremiumService.getConfig(userId)` and read the new field
4. Add i18n keys if the benefit appears in `/premium compare` or `/premium status`

## i18n Keys

All premium user-facing strings use the `premium.*` namespace:

| Pattern | Usage |
|---------|-------|
| `premium.status.*` | `/premium status` embed |
| `premium.compare.*` | `/premium compare` labels |
| `premium.grant.*` | Admin grant responses |
| `premium.revoke.*` | Admin revoke responses |
| `premium.lookup.*` | Admin lookup embed |
| `premium.expire.*` | DM notification on expiry |
| `premium.no_permission` | Non-admin attempting admin subcommand |
