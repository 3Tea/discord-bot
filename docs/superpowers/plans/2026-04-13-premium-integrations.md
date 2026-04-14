# Premium Integrations — Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire premium tier benefits into manga, cooldowns, star drops, confession, and wallet daily — making the premium subscription actually useful.

**Architecture:** Each integration imports `PremiumService.getConfig(userId)` to get the user's tier config, then uses the config values instead of hardcoded constants. Each integration is independent.

**Tech Stack:** TypeScript, Mongoose, ioredis, Discord.js v14

**Spec:** `docs/superpowers/specs/2026-04-13-premium-system-design.md`
**Depends on:** Plan 1 (Premium Core) — completed

---

## File Structure

| Action | File | Integration |
|--------|------|-------------|
| Modify | `src/util/manga/handler.ts` | Manga free uses + max pages |
| Modify | `src/commands/slash/mine.ts` | Mine cooldown |
| Modify | `src/commands/slash/dungeon.ts` | Dungeon cooldown |
| Modify | `src/commands/slash/work.ts` | Work cooldown |
| Modify | `src/commands/slash/fish.ts` | Fish cooldown |
| Modify | `src/util/economy/starDrop.ts` | Star drop rate multiplier |
| Modify | `src/commands/slash/confession.ts` | Skip CD free + VIP free |
| Modify | `src/services/economy/wallet.service.ts` | Daily bonus stars |

---

### Task 1: Manga handler — premium free uses + max pages

**Files:**
- Modify: `src/util/manga/handler.ts`

- [ ] **Step 1: Import PremiumService**

Add to imports at top of `src/util/manga/handler.ts`:

```typescript
import PremiumService from "../../services/premium/premium.service";
import { getTierConfig } from "../../services/premium/premium.config";
```

- [ ] **Step 2: Replace constants with tier-aware logic in applyStarCharge**

Replace the `applyStarCharge` function (lines 41-53) with:

```typescript
async function applyStarCharge(userId: string, sourceName: string): Promise<boolean> {
    const config = await PremiumService.getConfig(userId);
    const freeLimit = config.mangaFreeUses;

    // Galaxy unlimited — never charge
    if (!Number.isFinite(freeLimit)) return false;

    const freeKey = `manga_free:${userId}`;
    const usedToday = (await redis.getJson(freeKey)) as number | null;

    if (usedToday !== null && usedToday >= freeLimit) {
        await WalletService.deductStar(userId, STAR_COST, "command_charge", { command: sourceName });
        return true;
    }

    const newCount = (usedToday ?? 0) + 1;
    await redis.setJson(freeKey, newCount, secondsUntilUTCMidnight());
    return false;
}
```

- [ ] **Step 3: Replace MAX_READ_PAGES with tier-aware logic in buildResultRow**

Replace the `buildResultRow` function (lines 68-100) with:

```typescript
function buildResultRow(
    result: { total: number; id: string | number; image: string[] },
    source: MangaSource,
    locale: SupportedLocale,
    maxPages: number
): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (result.total <= maxPages) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.MANGA_READ)
                .setLabel(t(locale, "manga.read"))
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.MANGA_READ)
                .setLabel(t(locale, "manga.premium_only"))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setURL(`${source.urlBase}${result.id}`)
            .setLabel(t(locale, "manga.read_online"))
            .setStyle(ButtonStyle.Link)
    );

    return row;
}
```

- [ ] **Step 4: Update execute function to pass maxPages**

In the `execute` function inside `mangaCommand`, after the star charge gate and before the API call, get the tier config:

```typescript
const tierConfig = await PremiumService.getConfig(interaction.user.id);
```

Then update the two places that use `MAX_READ_PAGES`:

1. Replace `buildResultRow(result, source, locale)` with `buildResultRow(result, source, locale, tierConfig.mangaMaxPages)`
2. Replace the cache condition `if (result.total < MAX_READ_PAGES)` with `if (result.total <= tierConfig.mangaMaxPages)`

- [ ] **Step 5: Remove unused constants**

Remove `const FREE_DAILY_USES = 3;` (line 27) — now read from tier config.
Keep `const MAX_READ_PAGES = 50;` removed or replaced — no longer needed.
Keep `const STAR_COST = 1;` — still used for the deduct amount.

- [ ] **Step 6: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(premium): integrate manga handler with tier-based free uses and page limits"
```

---

### Task 2: Mine cooldown — premium tier override

**Files:**
- Modify: `src/commands/slash/mine.ts`

- [ ] **Step 1: Import PremiumService and replace hardcoded cooldown**

Add import:
```typescript
import PremiumService from "../../services/premium/premium.service";
```

Replace the constant `const MINE_COOLDOWN = 7200;` (line 12) with nothing (remove it).

- [ ] **Step 2: Get tier config and use it for cooldown**

After the line `const userId = interaction.user.id;`, add:

```typescript
const tierConfig = await PremiumService.getConfig(userId);
```

Replace the cooldown set line `await redis.setJson(cdKey, 1, MINE_COOLDOWN);` (line 42) with:

```typescript
await redis.setJson(cdKey, 1, tierConfig.mineCooldownMs / 1000);
```

Note: Redis TTL is in seconds, tier config is in milliseconds — divide by 1000.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/mine.ts
git commit -m "feat(premium): integrate mine cooldown with premium tier"
```

---

### Task 3: Dungeon cooldown — premium tier override

**Files:**
- Modify: `src/commands/slash/dungeon.ts`

- [ ] **Step 1: Import PremiumService**

Add import:
```typescript
import PremiumService from "../../services/premium/premium.service";
```

- [ ] **Step 2: Replace hardcoded cooldown**

Find `const DUNGEON_COOLDOWN = 3600;` and remove it.

In the execute function, after getting `userId`, add:
```typescript
const tierConfig = await PremiumService.getConfig(userId);
```

Replace all occurrences of `DUNGEON_COOLDOWN` in the cooldown set (`redis.setJson(cdKey, 1, DUNGEON_COOLDOWN)`) with:
```typescript
tierConfig.dungeonCooldownMs / 1000
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/dungeon.ts
git commit -m "feat(premium): integrate dungeon cooldown with premium tier"
```

---

### Task 4: Work + Fish cooldowns — premium tier override

**Files:**
- Modify: `src/commands/slash/work.ts`
- Modify: `src/commands/slash/fish.ts`

Work and Fish already read cooldown from guild config (`config.workCooldown`, `config.fishCooldown`). Premium should use the **minimum** of guild config and tier config (premium is always equal or faster).

- [ ] **Step 1: Integrate work.ts**

Add import:
```typescript
import PremiumService from "../../services/premium/premium.service";
```

After the line `const config = await getWorkConfig(guildId);`, add:
```typescript
const tierConfig = await PremiumService.getConfig(userId);
```

Replace the cooldown set line `await redis.setJson(cdKey, 1, config.workCooldown);` with:
```typescript
const effectiveCooldown = Math.min(config.workCooldown, tierConfig.workCooldownMs / 1000);
await redis.setJson(cdKey, 1, effectiveCooldown);
```

- [ ] **Step 2: Integrate fish.ts**

Same pattern. Add import, get tierConfig, replace cooldown set:

```typescript
const effectiveCooldown = Math.min(config.fishCooldown, tierConfig.fishCooldownMs / 1000);
await redis.setJson(cdKey, 1, effectiveCooldown);
```

Read `src/commands/slash/fish.ts` first to find the exact guild config variable name and cooldown set line.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/work.ts src/commands/slash/fish.ts
git commit -m "feat(premium): integrate work and fish cooldowns with premium tier"
```

---

### Task 5: Star drop rate multiplier

**Files:**
- Modify: `src/util/economy/starDrop.ts`

- [ ] **Step 1: Add premium multiplier to tryStarDrop**

Replace the entire file with:

```typescript
import WalletService from "../../services/economy/wallet.service";
import PremiumService from "../../services/premium/premium.service";
import log from "../log/logger.mixed";

/**
 * Rolls for a star drop with premium multiplier.
 * @param userId - The user to potentially award
 * @param rate - Base drop probability (0.0 to 1.0)
 * @param source - Command name for transaction metadata
 * @returns true if a star was awarded
 */
export async function tryStarDrop(userId: string, rate: number, source: string): Promise<boolean> {
    const config = await PremiumService.getConfig(userId);
    const effectiveRate = Math.min(rate * config.starDropMultiplier, 1.0);

    if (Math.random() >= effectiveRate) return false;

    try {
        await WalletService.addStar(userId, 1, "star_drop", { source });
        return true;
    } catch (error) {
        log(`[star_drop] Failed for ${userId}: ${error instanceof Error ? error.message : "Unknown"}`, "error");
        return false;
    }
}
```

Key change: `rate * config.starDropMultiplier` with a cap at 1.0.

- [ ] **Step 2: Commit**

```bash
git add src/util/economy/starDrop.ts
git commit -m "feat(premium): apply star drop rate multiplier from premium tier"
```

---

### Task 6: Confession — skip cooldown + VIP free for premium

**Files:**
- Modify: `src/commands/slash/confession.ts`

This is the most complex integration because confession has two premium-affected features:
1. **Skip cooldown**: Currently costs `CONFESSION_SKIP_CD_COST_COIN` (50 coin). Premium Star/Galaxy: free.
2. **VIP embed**: Currently costs `CONFESSION_VIP_COST_GEM` (5 gem). Premium Galaxy: free.

- [ ] **Step 1: Import PremiumService**

Add import:
```typescript
import PremiumService from "../../services/premium/premium.service";
```

- [ ] **Step 2: Modify skip cooldown logic**

Find the section that deducts coins for skip cooldown (around line 571-590). Before the deduction, check premium:

```typescript
const tierConfig = await PremiumService.getConfig(userId);

if (skipCooldown && isOnCooldown) {
    if (!tierConfig.confessionSkipCdFree) {
        // Charge coins as before
        await CurrencyService.deduct(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, 0, "confession_skip_cd", { action: "skip_cooldown" });
    }
    // Skip the cooldown regardless (premium or paid)
}
```

Read the file carefully to find the exact location and adapt the pattern.

- [ ] **Step 3: Modify VIP embed logic**

Find the section that deducts gems for VIP (around line 594-619). Before the deduction, check premium:

```typescript
if (isVip) {
    if (!tierConfig.confessionVipFree) {
        // Charge gems as before
        await CurrencyService.deduct(userId, guildId, 0, CONFESSION_VIP_COST_GEM, "confession_vip", { action: "vip_confession" });
    }
    // Apply VIP styling regardless
}
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(premium): free confession skip-cd and VIP for premium tiers"
```

---

### Task 7: Wallet daily — bonus stars for Galaxy tier

**Files:**
- Modify: `src/services/economy/wallet.service.ts`

- [ ] **Step 1: Import tier config**

Add import:
```typescript
import { getTierConfig } from "../premium/premium.config";
```

- [ ] **Step 2: Add bonus stars in claimDaily**

In the `claimDaily` function, after `const baseReward = Math.floor(Math.random() * 3) + 1;` (around line 187), add premium bonus:

```typescript
// Premium daily bonus
const wallet = await UserWalletModel.findOne({ userId }).lean();
const premiumBonus = getTierConfig(wallet?.premiumTier ?? null).dailyBonusStars;
```

Then update `const totalReward = baseReward + streakBonus;` to:

```typescript
const totalReward = baseReward + streakBonus + premiumBonus;
```

Also update the `DailyClaimResult` interface to include `premiumBonus`:

```typescript
export interface DailyClaimResult {
    baseReward: number;
    streakBonus: number;
    premiumBonus: number;
    streak: number;
    milestoneHit: { days: number; bonus: number } | null;
}
```

And return it:
```typescript
return { baseReward, streakBonus, premiumBonus, streak: newStreak, milestoneHit };
```

- [ ] **Step 3: Update wallet command to show premium bonus**

Read `src/commands/slash/wallet.ts` to find where `DailyClaimResult` is displayed. Add a line showing `premiumBonus` if > 0. Example: `⭐ Premium bonus: +2`.

- [ ] **Step 4: Commit**

```bash
git add src/services/economy/wallet.service.ts src/commands/slash/wallet.ts
git commit -m "feat(premium): add daily bonus stars for Galaxy tier"
```

---

### Task 8: Verify build

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Test manually (if dev environment available)**

Test with a premium user (granted via `/premium grant`):
- Manga: verify 10 free uses (Star) or unlimited (Galaxy)
- Manga: verify 70-page limit (Star) or 100-page (Galaxy)
- Mine: verify 1h cooldown (Star) or 30m (Galaxy)
- Star drops: verify increased rates
- Confession: verify free skip cooldown
- `/wallet daily`: verify +2 bonus for Galaxy
