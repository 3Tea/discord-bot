# Premium System — Design Spec

## Goal

Add a two-tier premium subscription system (Star + Galaxy) that enhances manga reading, reduces command cooldowns, boosts star drop rates, and provides cosmetic perks. Premium is per-user global (cross-server), activated via auto payment (monthly) or manual admin grant (flexible duration).

## Tiers & Benefits

| Benefit | Free | Star | Galaxy |
|---------|------|------|--------|
| Manga free daily uses | 3/day | 10/day | Unlimited |
| Manga max pages per doujinshi | 35 pages | 70 pages | 100 pages |
| Work cooldown | 4h | 2h | 1h |
| Fish cooldown | 1h | 30m | 15m |
| Mine cooldown | 2h | 1h | 30m |
| Dungeon cooldown | 1h | 30m | 15m |
| Star drop rate bonus | Base | +50% | +100% (double) |
| Confession skip cooldown | 50 coin | Free | Free |
| Confession VIP embed | 5 gem | 5 gem | Free |
| `/wallet daily` bonus stars | 0 | 0 | +2 |
| Rank card badge | None | Star badge | Galaxy badge |
| Rank card theme | Standard | Standard | Exclusive Galaxy |

### Design Principles

- **Free users can access every feature** — premium is "more, faster, prettier", never a hard lock on functionality.
- **Manga is the killer feature** — page limits and daily uses are the primary conversion drivers.
- **Cooldown reduction** rewards active users — play more = earn more.
- **Cosmetics** (badge, rank card theme) create social proof and visibility in servers.

## Pricing

Pricing is a business decision — to be defined before implementation. The system stores price as configuration, not hardcoded.

| Tier | Monthly (auto) | Manual (admin) |
|------|----------------|----------------|
| Star | TBD | Any duration: 7d, 30d, 90d, 365d, lifetime |
| Galaxy | TBD | Any duration: 7d, 30d, 90d, 365d, lifetime |

## Activation Sources

### Auto: Payment Gateway

- Monthly subscription cycle (30 days).
- Payment gateway integration (Stripe, PayPal, or similar) — specifics TBD.
- On successful payment: activate premium for 30 days from payment date.
- On payment failure/cancellation: premium expires at end of current period, no immediate revocation.
- Webhook endpoint receives payment events and updates premium status.

### Manual: Admin Grant

- Admin command: `/premium grant user:@user tier:star|galaxy duration:7d|30d|90d|365d|lifetime`
- Admin command: `/premium revoke user:@user` — immediately removes premium.
- Covers: bank transfers, promotions, giveaways, compensation, external payment processors.
- Requires `DEV_USER_ID` check (bot owner only, not server admin — since premium is global).
- Transaction logged with admin ID and reason.

### Duration Stacking

When granting premium to a user who already has active premium:
- **Same tier**: Extend `premiumUntil` by the new duration (additive).
- **Upgrade** (Star → Galaxy): Switch tier immediately, remaining Star days are forfeited.
- **Downgrade** (Galaxy → Star): Takes effect after current Galaxy period expires.
- **Lifetime**: Sets `premiumUntil` to `null` (interpreted as never expires).

## Data Model

### UserWallet Model (extend existing)

Add fields to `userWallet.model.ts`:

```typescript
premiumTier: "star" | "galaxy" | null    // Current tier, null = free
premiumUntil: Date | null                // Expiry date, null = lifetime (when premiumTier is set)
premiumSource: "auto" | "manual" | null  // How it was activated
premiumGrantedBy: string | null          // Admin userId (manual only)
```

### Transaction Types (add to existing)

```typescript
"premium_activate"    // Premium activated (auto or manual)
"premium_expire"      // Premium expired (cron detected)
"premium_revoke"      // Admin manually revoked
"premium_upgrade"     // Tier upgraded (Star → Galaxy)
"premium_downgrade"   // Tier downgraded (Galaxy → Star)
"premium_extend"      // Duration extended (same tier)
```

### Redis Caching

```
premium:{userId} → { tier: "star"|"galaxy"|null, until: ISO8601|null }
TTL: 5 minutes (short TTL ensures expiry is detected promptly)
```

On every premium check:
1. Check Redis cache first.
2. Cache miss → read from MongoDB, populate cache.
3. On premium change (activate/revoke/expire) → delete Redis key (next check repopulates).

## Premium Check Architecture

### Helper Function

```typescript
// src/services/premium/premium.service.ts

interface PremiumStatus {
  tier: "star" | "galaxy" | null;
  isActive: boolean;
  until: Date | null;
}

async function getPremiumStatus(userId: string): Promise<PremiumStatus>
async function isPremium(userId: string): Promise<boolean>
async function getTier(userId: string): Promise<"star" | "galaxy" | null>
```

### Tier Config

Centralized config object mapping tier → benefits, so commands don't hardcode tier checks:

```typescript
// src/services/premium/premium.config.ts

interface TierConfig {
  mangaFreeUses: number;      // 3 | 10 | Infinity
  mangaMaxPages: number;      // 35 | 70 | 100
  workCooldownMs: number;     // 4h | 2h | 1h
  fishCooldownMs: number;     // 1h | 30m | 15m
  mineCooldownMs: number;     // 2h | 1h | 30m
  dungeonCooldownMs: number;  // 1h | 30m | 15m
  starDropMultiplier: number; // 1.0 | 1.5 | 2.0
  confessionSkipCdFree: boolean;
  confessionVipFree: boolean;
  dailyBonusStars: number;    // 0 | 0 | 2
  badge: string | null;       // null | "star" | "galaxy"
  rankCardTheme: string;      // "standard" | "standard" | "galaxy"
}

const TIER_CONFIG: Record<"free" | "star" | "galaxy", TierConfig>
```

Commands read from `TIER_CONFIG[tier]` instead of checking tier strings directly. Adding a new benefit = add one field to config + one line in the consuming command.

### Integration Points

Each command that checks premium follows this pattern:

```typescript
const { tier } = await getPremiumStatus(userId);
const config = TIER_CONFIG[tier ?? "free"];
// Use config.mangaMaxPages, config.workCooldownMs, etc.
```

## Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/premium status` | View current tier, expiry date, benefits summary |
| `/premium compare` | Side-by-side comparison of Free vs Star vs Galaxy benefits |

### Admin Commands (bot owner only)

| Command | Description |
|---------|-------------|
| `/premium grant user tier duration reason` | Activate/extend premium for a user |
| `/premium revoke user reason` | Immediately remove premium |
| `/premium lookup user` | Check a user's premium status and history |

## Expiry Handling

### Cron Job

A periodic check (every 10 minutes, similar to `guildStatsAggregator`) scans for expired premium:

```
Find all UserWallet where:
  premiumTier != null
  AND premiumUntil != null
  AND premiumUntil < now()
```

For each expired user:
1. Set `premiumTier = null`, `premiumUntil = null`, `premiumSource = null`.
2. Log `premium_expire` transaction.
3. Delete Redis cache key.

### Grace Period

No grace period — premium expires exactly at `premiumUntil`. Auto-payment users get their next payment processed before expiry (payment gateway handles this).

## Affected Commands (Integration)

### Manga Handler (`src/util/manga/handler.ts`)

- Replace `FREE_DAILY_USES = 3` with `config.mangaFreeUses`.
- Replace `MAX_READ_PAGES = 50` with `config.mangaMaxPages`.
- Current `applyStarCharge` logic stays the same, just reads limits from tier config.

### Cooldown Commands

Each command currently hardcodes cooldown duration. Replace with tier config:

| Command | Current Hardcoded | Change To |
|---------|-------------------|-----------|
| `/work` | `4 * 60 * 60 * 1000` | `config.workCooldownMs` |
| `/fish` | `60 * 60 * 1000` | `config.fishCooldownMs` |
| `/mine` | `2 * 60 * 60 * 1000` | `config.mineCooldownMs` |
| `/dungeon` | `60 * 60 * 1000` | `config.dungeonCooldownMs` |

### Star Drops (`src/util/economy/starDrop.ts`)

Multiply base drop rate by `config.starDropMultiplier`:

```typescript
const effectiveRate = baseRate * config.starDropMultiplier;
const dropped = Math.random() < effectiveRate;
```

### Confession (`src/commands/slash/confession.ts`)

- Skip cooldown: if `config.confessionSkipCdFree`, bypass the 50 coin charge.
- VIP embed: if `config.confessionVipFree`, bypass the 5 gem charge.

### Wallet Daily (`src/services/economy/wallet.service.ts`)

- Add `config.dailyBonusStars` to the base reward.

### Rank Card (`src/util/xp/canvasRankCard.ts`)

- Render premium badge based on `config.badge`.
- Apply Galaxy theme when `config.rankCardTheme === "galaxy"`.

## i18n

New translation keys needed (all 15 locale files):

```
premium.status.title
premium.status.tier
premium.status.expires
premium.status.lifetime
premium.status.free
premium.compare.title
premium.tier.free
premium.tier.star
premium.tier.galaxy
premium.grant.success
premium.grant.extended
premium.revoke.success
premium.lookup.title
premium.expire.notice           // DM to user when premium expires
premium.manga.page_limit        // "Upgrade to read more pages"
premium.badge.star
premium.badge.galaxy
```

## Landing Site

Add a new guide `landing/src/content/guides/{en,vi}/premium.md` explaining:
- What premium is
- Benefits comparison table
- How to purchase
- How to check status

Register in `landing/src/data/guides.ts`.

## Out of Scope

- **Payment gateway integration**: Webhook endpoint and payment flow are separate specs. This spec covers the premium system itself — how status is stored, checked, and used.
- **Auto-renewal logic**: Handled by payment gateway webhooks calling the same activate API.
- **Referral/affiliate system**: Not part of this spec.
- **Server-level premium**: This spec is user-level only. Server premium would be a separate system.
- **Premium gifting between users**: Not in initial version.
