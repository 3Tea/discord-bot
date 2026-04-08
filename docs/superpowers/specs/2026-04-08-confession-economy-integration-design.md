# Confession Economy Integration — Sub-project 1

**Date:** 2026-04-08
**Status:** Approved
**Scope:** VIP Confession + Skip Cooldown (pay-per-use, fixed pricing)

## Summary

Integrate the economy system (coin/gem) into the confession feature. Two premium options added as optional boolean params on `/confession submit`:
- **VIP Confession** — pay 5 gem for a visually distinct gold embed
- **Skip Cooldown** — pay 50 coin to bypass the active cooldown

Both are pay-per-use with fixed pricing. No admin configuration needed. Options can be combined in a single submission.

## Command Interface

### `/confession submit` — Updated Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `text` | String | Yes | — | Confession content (max 3,500 chars) |
| `image` | Attachment | No | — | Optional image (existing) |
| `vip` | Boolean | No | false | VIP embed — costs 5 gem |
| `skip_cooldown` | Boolean | No | false | Skip active cooldown — costs 50 coin |

### Pricing (Fixed, System-Wide)

| Feature | Currency | Cost |
|---------|----------|------|
| VIP Confession | Gem | 5 |
| Skip Cooldown | Coin | 50 |

Constants defined in `src/services/confession/constants.ts`:
```typescript
export const CONFESSION_VIP_COST_GEM = 5;
export const CONFESSION_SKIP_CD_COST_COIN = 50;
```

## Submission Flow (Updated)

```
User runs /confession submit text:... [vip:true] [skip_cooldown:true]
│
├─ Validate content + image (unchanged)
├─ Check guild config enabled (unchanged)
│
├─ Check cooldown (Redis)
│  ├─ On cooldown AND skip_cooldown:false → reject "cooldown" (unchanged)
│  ├─ On cooldown AND skip_cooldown:true → deduct 50 coin
│  │  ├─ Insufficient coin → reject "insufficient_coin"
│  │  └─ Success → proceed (cooldown bypassed)
│  └─ No cooldown → skip_cooldown ignored (no charge)
│
├─ If vip:true → deduct 5 gem
│  ├─ Insufficient gem → reject "insufficient_gem" + refund coin if deducted above
│  └─ Success → proceed
│
├─ Reserve confession number (unchanged)
│
├─ Build embed
│  ├─ vip:true → VIP embed (gold, sparkle title, VIP footer)
│  └─ vip:false → Standard embed (purple, unchanged)
│
├─ Post to channel (instant) or create review record (review mode)
│  ├─ Discord API failure → refund all deducted coin/gem
│  └─ Success → set cooldown, respond to user
│
└─ Log transactions
```

### Key Behavior

- **Skip cooldown only charges when cooldown is active.** If the user is not on cooldown, `skip_cooldown: true` is silently ignored — no coin deducted.
- **Cooldown is always set after a successful submission**, even when skip_cooldown was used. Skip cooldown only bypasses the current cooldown, it doesn't disable cooldown for future submissions.
- **Deduction order:** coin (skip_cooldown) first, then gem (VIP). If gem deduction fails, coin is refunded.
- **On Discord API failure:** all deducted currency is refunded.

## VIP Embed Design

### Standard Confession (unchanged)

```
Color: #9B59B6 (purple)
Title: Confession #42
Description: [confession text]
Image: [if attached]
```

### VIP Confession

```
Color: #F1C40F (gold)
Title: ✨ Confession #42
Description: [confession text]
Image: [if attached]
Footer: VIP Confession
```

The VIP embed uses the existing `--warning` color from the design system. Difference is visible but not excessive.

### Review Mode

- Review embed (shown to moderators) also reflects VIP status — shows "VIP" badge in the review embed so moderators know.
- When approved, the public embed uses the VIP styling if `isVip: true`.
- Resolved embed (after approve/reject) unchanged.

## Data Model Changes

### Confession Model — Add `isVip` Field

```typescript
// Add to confession.model.ts schema
isVip: { type: Boolean, default: false }
```

No other model changes. `isVip` is stored on the confession document to ensure:
1. Review flow builds the correct embed type when approving
2. Future features (e.g., confession of the week) can filter by VIP status

No changes to `GuildConfessionConfig` — pricing is system-wide, not per-guild.

## Transaction Logging

Every premium confession action is logged via the existing Transaction model:

| Action | Transaction Type | coinDelta | gemDelta | Metadata |
|--------|-----------------|-----------|----------|----------|
| Skip cooldown | `confession_skip_cd` | -50 | 0 | `{ confessionNumber, guildId }` |
| VIP confession | `confession_vip` | 0 | -5 | `{ confessionNumber, guildId }` |
| Refund (on failure) | `confession_refund` | +amount | +amount | `{ reason, confessionNumber }` |

## i18n Keys (New)

Add to all 15 locale files:

| Key | EN | VI |
|-----|----|----|
| `confession.insufficient_coin` | You need at least {{cost}} coins to skip cooldown. Your balance: {{balance}} coins. | Bạn cần ít nhất {{cost}} coin để bỏ qua cooldown. Số dư: {{balance}} coin. |
| `confession.insufficient_gem` | You need at least {{cost}} gems to send a VIP confession. Your balance: {{balance}} gems. | Bạn cần ít nhất {{cost}} gem để gửi confession VIP. Số dư: {{balance}} gem. |
| `confession.vip_footer` | VIP Confession | VIP Confession |
| `confession.skip_cd_charged` | Cooldown skipped (-{{cost}} coins) | Đã bỏ qua cooldown (-{{cost}} coin) |
| `confession.vip_charged` | VIP confession (-{{cost}} gems) | Confession VIP (-{{cost}} gem) |

## Error Handling & Rollback

### Deduction Failure

If `deduct()` throws `InsufficientFundsError`:
- Respond with ephemeral error showing current balance and required amount
- If coin was already deducted (skip_cooldown succeeded but VIP gem deduction fails), refund coin immediately via `addCoin()` with `type: "confession_refund"`

### Discord API Failure

If sending the confession message fails (channel deleted, permissions changed, etc.):
- Refund any deducted coin and gem via `addCoin()` / `addGem()` with `type: "confession_refund"`
- Respond with existing "send_failed" error

### Partial Failure in Review Mode

If confession record is created but review message fails to send:
- Currency is NOT refunded (confession exists in DB, can be retried by admin)
- Same behavior as current implementation

## Files Changed

| File | Change |
|------|--------|
| `src/commands/slash/confession.ts` | Add `vip` and `skip_cooldown` options, update submit handler |
| `src/services/confession/confession.service.ts` | Add VIP embed builder, update submit logic with economy checks |
| `src/services/confession/constants.ts` | Add `CONFESSION_VIP_COST_GEM`, `CONFESSION_SKIP_CD_COST_COIN` |
| `src/models/confession.model.ts` | Add `isVip: Boolean` field |
| `src/buttons/confessionApprove.button.ts` | Use VIP embed when approving VIP confessions |
| `src/locales/*.json` (15 files) | Add 5 new i18n keys |

## Not Changed

- `GuildConfessionConfig` model — no per-guild pricing
- `/confession setup` command — no new config options
- `confessionReject.button.ts` — reject flow unchanged (no public embed)
- Shop system — not involved (direct currency deduction, not shop items)
- Economy models — no schema changes
