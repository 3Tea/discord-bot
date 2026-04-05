# Economy System — Pray/Curse + Shop (Phase 1)

## Overview

Hệ thống economy cho bot 3AT, bắt đầu với pray/curse mechanic (lấy cảm hứng từ OWO bot) làm nền tảng cho economy rộng hơn (gambling, battle, inventory ở các phase sau). Phase 1 bao gồm: pray/curse commands, dual currency, streak system, và basic shop.

## Architecture: Service-Layer

Tách thành 3 layers rõ ràng:
- **Models** — Mongoose schemas cho data persistence
- **Services** — Business logic, không phụ thuộc Discord.js
- **Commands** — Thin wrappers: parse input → gọi service → format embed → reply

### File Structure

```
src/
  services/economy/
    currency.service.ts
    pray.service.ts
    shop.service.ts
  models/
    userEconomy.model.ts
    shopItem.model.ts
    transaction.model.ts
  commands/slash/
    pray.ts
    curse.ts
    shop.ts
    balance.ts
    economy.ts          # admin commands
```

## Data Models

### UserEconomy (`userEconomy.model.ts`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| userId | string | required | Discord user ID |
| guildId | string | required | Discord guild ID |
| coin | number | 0 | Currency thường |
| gem | number | 0 | Premium currency |
| lastPray | Date \| null | null | Lần pray cuối |
| lastCurse | Date \| null | null | Lần curse cuối |
| prayStreak | number | 0 | Số ngày pray liên tiếp |
| lastStreakDate | Date \| null | null | Ngày cuối tính streak |

- Compound unique index: `{ userId, guildId }`
- Timestamps enabled (createdAt, updatedAt)
- Economy là per-guild, consistent với XP system

### ShopItem (`shopItem.model.ts`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| guildId | string | required | Mỗi server có shop riêng |
| itemId | string | required | Unique identifier |
| name | string | required | Tên hiển thị |
| description | string | required | Mô tả item |
| type | enum | required | `"role"` \| `"cosmetic"` \| `"currency_exchange"` |
| price | number | required | Giá |
| currencyType | enum | required | `"coin"` \| `"gem"` |
| roleId | string \| undefined | — | Nếu type là role |
| stock | number \| null | null | null = unlimited |
| enabled | boolean | true | Có hiển thị trong shop không |

- Compound unique index: `{ guildId, itemId }`

### Transaction (`transaction.model.ts`)

| Field | Type | Description |
|-------|------|-------------|
| userId | string | Người thực hiện |
| guildId | string | Server |
| type | enum | `"pray"` \| `"curse"` \| `"purchase"` \| `"exchange"` \| `"streak_bonus"` |
| coinDelta | number | Thay đổi coin (+ hoặc -) |
| gemDelta | number | Thay đổi gem (+ hoặc -) |
| metadata | object | Flexible data (targetId, itemId, etc.) |
| createdAt | Date | Auto timestamp |

- Index: `{ userId, guildId, createdAt }` cho query history
- Dùng cho audit trail, không cho real-time logic

## Pray/Curse Mechanics

### `/pray [target?]`

| Scenario | Người pray nhận | Target nhận | Gem chance |
|----------|----------------|-------------|------------|
| Self-pray (no target) | 50–150 coin | — | Không |
| Pray cho @user | 100–200 coin | 80–150 coin | 5% drop 1 gem cho người pray |

- Cooldown: 1 lần/ngày, reset lúc 00:00 UTC
- Không thể pray cho bot
- Response: Embed với random flavor text

### `/curse [target?]`

| Scenario | Người curse nhận | Target nhận | Gem chance |
|----------|-----------------|-------------|------------|
| Self-curse (no target) | 20–80 coin | — | Không |
| Curse @user | 40–100 coin | 30–70 coin | Không |

- Cooldown: 1 lần/ngày, reset lúc 00:00 UTC (riêng biệt với pray)
- Curse KHÔNG trừ coin của ai — chỉ là pray phiên bản "ác" với reward thấp hơn
- Curse KHÔNG tính vào streak
- Response: Embed với dark flavor text

### Streak System

Pray liên tiếp mỗi ngày tăng streak. Miss 1 ngày → reset về 0.

| Milestone | Bonus Coin | Bonus Gem |
|-----------|-----------|-----------|
| 3 ngày | +50 | — |
| 7 ngày | +150 | 1 |
| 14 ngày | +300 | 2 |
| 30 ngày | +500 | 5 |

- Chỉ pray tính streak (curse không tính)
- Milestone bonus cộng thêm vào reward pray bình thường
- Streak logic: so sánh `lastStreakDate` với ngày hôm nay (UTC). Nếu là ngày liền kề → streak++. Nếu cách >1 ngày → reset về 1.

## Shop & Currency Exchange

### `/shop view`
- Paginated embed, 5 items/page
- Hiển thị: name, description, price, currency type, stock remaining

### `/shop buy <item_id>`
- Check: item tồn tại, enabled, còn stock, user đủ balance
- Deduct currency → apply effect → log transaction
- **Role items:** Bot auto-assign role. Nếu user đã có role → báo lỗi.
- **Currency exchange:** Đổi coin → gem theo tỷ giá admin set. Hiển thị như item trong shop.
- **Cosmetic:** Phase 1 chỉ define type, chưa implement effect. Mua → lưu vào transaction nhưng chưa áp dụng visual.

### `/shop add` (Admin only)
- Interactive command để thêm item: name, description, type, price, currencyType, roleId (nếu role), stock

### `/shop remove <item_id>` (Admin only)
- Soft delete: set `enabled = false` (giữ transaction history intact, có thể re-enable sau)

### `/balance [@user?]`
- Hiển thị: coin, gem, pray streak hiện tại, ngày pray cuối
- Có thể xem balance người khác

## Admin Commands

### `/economy` (ADMINISTRATOR permission)

| Subcommand | Description |
|------------|-------------|
| `set-coin @user <amount>` | Set coin |
| `add-coin @user <amount>` | Thêm/trừ coin |
| `set-gem @user <amount>` | Set gem |
| `add-gem @user <amount>` | Thêm/trừ gem |

- Tất cả admin actions log vào Transaction model
- Permission check: `ADMINISTRATOR` flag

## Service Layer

### CurrencyService (`currency.service.ts`)

```
getBalance(userId, guildId) → { coin, gem, prayStreak, lastPray, lastCurse }
addCoin(userId, guildId, amount, reason) → updated balance
addGem(userId, guildId, amount, reason) → updated balance
deduct(userId, guildId, coinAmount?, gemAmount?) → updated balance | throw InsufficientFunds
exchange(userId, guildId, gemAmount) → updated balance | throw InsufficientFunds
```

- Mọi operation đều tạo Transaction record
- `deduct` throw error nếu không đủ balance (atomic check + update)
- `getBalance` auto-create UserEconomy record nếu chưa tồn tại (upsert pattern)

### PrayService (`pray.service.ts`)

```
pray(userId, guildId, targetId?) → PrayResult { rewards, streakInfo, milestoneHit? }
curse(userId, guildId, targetId?) → CurseResult { rewards }
```

Flow cho `pray()`:
1. Check cooldown — đã pray hôm nay chưa (so sánh lastPray với 00:00 UTC hôm nay)
2. Tính reward — random trong range, self vs target
3. Update streak — check liên tiếp, check milestone
4. Roll gem chance — 5% nếu pray cho người khác
5. Gọi CurrencyService.addCoin / addGem
6. Update lastPray, prayStreak, lastStreakDate
7. Return result object

### ShopService (`shop.service.ts`)

```
getItems(guildId, page) → { items, totalPages }
buyItem(userId, guildId, itemId) → PurchaseResult | throw Error
addItem(guildId, itemData) → ShopItem
removeItem(guildId, itemId) → void
```

- `buyItem` cần handle: check balance → deduct → apply effect, phải atomic (nếu apply effect fail thì rollback deduct)
- Role items: sử dụng Discord.js `guild.members.cache.get(userId).roles.add(roleId)`

## Cooldown Implementation

- Dùng `lastPray` / `lastCurse` trong MongoDB (persistent, survive restart)
- Check: `lastPray` có cùng ngày UTC với hiện tại không
- Không dùng Redis cho cooldown này vì daily reset đơn giản hơn TTL-based

## Future Phases (Out of Scope)

- Phase 2: Gambling (coinflip, slots, blackjack)
- Phase 3: Battle/PvP system
- Phase 4: Inventory, collectibles, trading
- Phase 5: Event system, seasonal rewards
- Cosmetic effects (rank card customization) — type defined in phase 1, effect implemented later
