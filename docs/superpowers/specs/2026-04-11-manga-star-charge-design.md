# Manga Command Star Charge

**Date:** 2026-04-11
**Status:** Approved

## Problem

Manga commands use an external API (jandapress) with hosting costs. Users should contribute stars from their global wallet to use manga commands beyond a daily free quota.

## Requirements

- Manga commands only (nhentai, 3hentai, asmhentai, hentaifox, nhentai-lite, pururin, hentai2read, simply-hentai)
- 3 free uses per day per user, reset at UTC midnight
- After free uses: charge 1 star per command from global wallet
- If command errors after charging: refund the star
- If no star and no free uses: block with ephemeral error message

## Design

### Execution Flow

```
User runs manga command (e.g. /nhentai random)
  1. Check NSFW channel (existing)
  2. Check free uses via Redis key manga_free:{userId}
     a. Counter < 3 → increment counter, set charged = false, continue
     b. Counter >= 3 → call deductStar(userId, 1, "command_charge", { command })
        - Success → set charged = true, continue
        - InsufficientStarError → reply ephemeral error, return
  3. deferReply (existing)
  4. Call API + render embed (existing)
  5. On catch error:
     - If charged === true → addStar(userId, 1, "command_refund", { command })
     - Show error message (existing)
```

### Redis Key

- **Key:** `manga_free:{userId}`
- **Value:** integer count of uses today (1, 2, 3)
- **TTL:** seconds remaining until next UTC midnight (auto-reset)

TTL calculation: `Math.floor((endOfUTCDay - now) / 1000)` where `endOfUTCDay` is today 23:59:59.999 UTC.

### Transaction Types

Add to `TransactionType` in `src/models/transaction.model.ts`:
- `"command_charge"` — star deducted for manga command use
- `"command_refund"` — star refunded due to command error

### i18n Keys

| Key | EN | Purpose |
|-----|----|---------|
| `manga.no_stars` | "You've used all 3 free uses today and don't have enough stars. Use `/wallet daily` to claim stars." | Ephemeral error when blocked |

### Files Changed

| File | Change |
|------|--------|
| `src/util/manga/handler.ts` | Add charge/refund logic in execute(), before deferReply |
| `src/models/transaction.model.ts` | Add `command_charge`, `command_refund` to TransactionType |
| `src/locales/*.json` (15 files) | Add `manga.no_stars` key |

### Refund Rules

- Only refund when `charged === true` (star was actually deducted)
- Free uses are NOT refunded on error (counter stays incremented)
- Refund logged as `command_refund` transaction with command name in metadata

### Edge Cases

- **User has no wallet yet:** `deductStar` will fail with InsufficientStarError (0 stars) — handled by the block flow
- **Redis down:** Fallback cache (NodeCache) handles the free use counter with same interface
- **Concurrent requests:** Redis increment is atomic; worst case user gets 1 extra free use in race condition — acceptable
