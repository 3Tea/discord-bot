# Star Guide Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive Star Currency guide on the landing site and cross-reference it from existing Manga and Economy guides.

**Architecture:** Content collection markdown files (`guides/{en,vi}/star.md`) following existing guide patterns. Minor edits to `guides.ts` metadata and two existing guides (manga, economy) to add cross-references.

**Tech Stack:** Astro content collections (Markdown + YAML frontmatter), TypeScript metadata

**Spec:** `docs/superpowers/specs/2026-04-13-star-guide-landing-page-design.md`

---

### Task 1: Register star guide metadata

**Files:**
- Modify: `landing/src/data/guides.ts:11` (add entry after `economy`)

- [ ] **Step 1: Add star entry to guideMeta**

In `landing/src/data/guides.ts`, add after the `economy` line (line 9):

```ts
  star: { slug: "star", label: "Star Currency", color: "#F39C12", bg: "rgba(243,156,18,0.15)" },
```

The full file should read:

```ts
export interface GuideMeta {
  slug: string;
  label: string;
  color: string;
  bg: string;
}

export const guideMeta: Record<string, GuideMeta> = {
  economy: { slug: "economy", label: "Economy", color: "#F1C40F", bg: "rgba(241,196,15,0.15)" },
  star: { slug: "star", label: "Star Currency", color: "#F39C12", bg: "rgba(243,156,18,0.15)" },
  xp: { slug: "xp", label: "XP & Leveling", color: "#9B59B6", bg: "rgba(155,89,182,0.15)" },
  voice: { slug: "voice", label: "Voice Channels", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  confessions: { slug: "confessions", label: "Confessions", color: "#E67E22", bg: "rgba(230,126,34,0.15)" },
  moderation: { slug: "moderation", label: "Moderation", color: "#C0392B", bg: "rgba(192,57,43,0.15)" },
  manga: { slug: "manga", label: "Manga & NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { slug: "utility", label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { slug: "info", label: "Info & Help", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
  settings: { slug: "settings", label: "Settings", color: "#7289DA", bg: "rgba(114,137,218,0.15)" },
  mine: { slug: "mine", label: "Mining", color: "#95A5A6", bg: "rgba(149,165,166,0.15)" },
  dungeon: { slug: "dungeon", label: "Dungeon", color: "#E91E63", bg: "rgba(233,30,99,0.15)" },
};
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/data/guides.ts
git commit -m "feat(landing): register star guide metadata in guides.ts"
```

---

### Task 2: Create EN star guide

**Files:**
- Create: `landing/src/content/guides/en/star.md`

- [ ] **Step 1: Create the EN guide file**

Create `landing/src/content/guides/en/star.md` with this content:

```markdown
---
title: Star Currency
description: Everything about stars — how to earn, spend, and manage your global currency.
icon: "⭐"
order: 2
relatedCommands: ["wallet", "pray", "curse", "work", "fish", "mine", "dungeon", "nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---

## Overview

**Star** ⭐ is 3AT's **global currency** — your balance is the same across every server you're in. Unlike coins and gems (which are per-server), stars cannot be given or taken by server admins, and cannot be traded between users.

Stars are earned through daily activity and spent on premium features like manga commands and the global shop.

## Earning Stars

### Daily Claim

Use `/wallet daily` once per day to receive **1–3 stars** (random). This is the most reliable way to build your star balance over time.

Claiming on **consecutive UTC days** builds a streak with milestone bonuses:

| Streak | Bonus Stars | Total That Day |
|--------|-------------|----------------|
| 3 days | +2 | 3–5 |
| 7 days | +5 | 6–8 |
| 14 days | +10 | 11–13 |
| 30 days | +20 | 21–23 |

> **Warning:** Missing a single day resets your streak to zero. Set a daily reminder!

### Star Drops

Every time you use certain commands, there's a small chance to earn **1 bonus star**. The drop is random — no cooldown, just luck.

| Command | Drop Rate | Condition |
|---------|-----------|-----------|
| `/pray` | 5% | After any pray action |
| `/curse` | 5% | After any curse action |
| `/work` | 4% | On successful work |
| `/mine` | 4% | On successful dig (not on collapse) |
| `/fish` | 3% | On successful catch |
| `/dungeon` | 3% | After winning a combat encounter |

> **Tip:** The more activities you do each day, the more chances you have to get a star drop. Pray, curse, work, fish, mine, and dungeon all stack independently.

### Achievement Milestones

One-time star rewards for reaching specific goals. Once claimed, they don't repeat — but they add up to **176 stars** total.

#### XP Milestones

| Milestone | Stars |
|-----------|-------|
| Reach level 10 | 5 |
| Reach level 25 | 15 |
| Reach level 50 | 30 |
| Reach level 100 | 50 |

#### Pray Streak Milestones

| Milestone | Stars |
|-----------|-------|
| 7-day pray streak | 3 |
| 14-day pray streak | 8 |
| 30-day pray streak | 20 |

#### Multi-Server Milestones

| Milestone | Stars |
|-----------|-------|
| Active in 3 servers | 5 |
| Active in 5 servers | 10 |
| Active in 10 servers | 20 |

#### Leaderboard

| Milestone | Stars |
|-----------|-------|
| Reach top 3 on any leaderboard | 10 |

Use `/wallet view` to see which milestones you've already claimed and which are still available.

## Spending Stars

### Manga Commands

All manga commands (`/nhentai`, `/3hentai`, `/asmhentai`, `/hentaifox`, `/nhentai-lite`, `/pururin`) use the **star charge system**:

- **3 free uses per day** — resets at UTC midnight
- After free uses are gone, each command costs **1 star**
- All 6 manga sources **share the same daily counter** — using `/nhentai` counts toward the same 3 free uses as `/3hentai`
- If the command fails (API error, timeout), your star or free use is **automatically refunded**

> **Tip:** Spread your 3 free uses across different sources to explore variety, then spend stars on your favorites.

For more details on manga commands, see the [Manga Guide](/en/guide/manga).

### Global Shop

Use `/global-shop buy` to purchase exclusive items with stars. Each item has its own star price, and some have limited stock. Check the shop regularly for new items.

## Managing Your Wallet

| Command | What It Does |
|---------|-------------|
| `/wallet view` | See your star balance, daily streak, and milestone progress |
| `/wallet daily` | Claim your daily star reward |
| `/wallet history` | View your global transaction history (star income and spending) |

## Tips & Strategy

1. **Never miss `/wallet daily`** — the streak bonuses are massive. A 30-day streak gives +20 bonus stars on top of your 1–3 base reward.
2. **Do all daily activities** — pray, curse, work, fish, mine, and dungeon each have independent star drop chances. Doing all six gives you up to 6 chances per day.
3. **Track your milestones** — use `/wallet view` to see which achievement milestones you haven't claimed yet. Some (like multi-server) just require joining more servers with 3AT.
4. **Use free manga first** — you get 3 free manga uses per day. Don't spend stars until those are gone.
5. **Stars are permanent** — no one can take your stars away. They're yours across every server, forever.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/en/star.md
git commit -m "feat(landing): add EN star currency guide"
```

---

### Task 3: Create VI star guide

**Files:**
- Create: `landing/src/content/guides/vi/star.md`

- [ ] **Step 1: Create the VI guide file**

Create `landing/src/content/guides/vi/star.md` with this content:

```markdown
---
title: Tiền Tệ Star
description: Tất cả về star — cách kiếm, cách tiêu, và quản lý tiền tệ toàn cầu của bạn.
icon: "⭐"
order: 2
relatedCommands: ["wallet", "pray", "curse", "work", "fish", "mine", "dungeon", "nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---

## Tổng Quan

**Star** ⭐ là **tiền tệ toàn cầu** của 3AT — số dư của bạn giống nhau trên mọi server. Khác với coin và gem (theo từng server), star không thể bị admin thêm hay xóa, và không thể chuyển cho người dùng khác.

Star được kiếm qua hoạt động hàng ngày và dùng để sử dụng các tính năng cao cấp như lệnh manga và shop toàn cầu.

## Kiếm Star

### Nhận Hàng Ngày

Dùng `/wallet daily` mỗi ngày để nhận **1–3 star** (ngẫu nhiên). Đây là cách ổn định nhất để tích lũy star.

Nhận vào **các ngày UTC liên tiếp** sẽ xây dựng streak với phần thưởng bonus:

| Streak | Star Bonus | Tổng Ngày Đó |
|--------|------------|---------------|
| 3 ngày | +2 | 3–5 |
| 7 ngày | +5 | 6–8 |
| 14 ngày | +10 | 11–13 |
| 30 ngày | +20 | 21–23 |

> **Lưu ý:** Bỏ lỡ một ngày sẽ reset streak về 0. Hãy đặt nhắc nhở hàng ngày!

### Star Rơi

Mỗi khi bạn dùng một số lệnh nhất định, có cơ hội nhỏ nhận được **1 star bonus**. Hoàn toàn ngẫu nhiên — không có thời gian chờ, chỉ là may mắn.

| Lệnh | Tỉ Lệ Rơi | Điều Kiện |
|------|-----------|-----------|
| `/pray` | 5% | Sau mỗi lần cầu nguyện |
| `/curse` | 5% | Sau mỗi lần nguyền rủa |
| `/work` | 4% | Khi làm việc thành công |
| `/mine` | 4% | Khi đào thành công (không tính sập hầm) |
| `/fish` | 3% | Khi câu cá thành công |
| `/dungeon` | 3% | Sau khi thắng chiến đấu |

> **Mẹo:** Càng nhiều hoạt động bạn làm mỗi ngày, càng nhiều cơ hội nhận star rơi. Pray, curse, work, fish, mine và dungeon đều tính độc lập.

### Mốc Thành Tích

Phần thưởng star một lần khi đạt các mục tiêu cụ thể. Sau khi nhận rồi sẽ không lặp lại — nhưng tổng cộng lên đến **176 star**.

#### Mốc XP

| Mốc | Star |
|------|------|
| Đạt level 10 | 5 |
| Đạt level 25 | 15 |
| Đạt level 50 | 30 |
| Đạt level 100 | 50 |

#### Mốc Streak Cầu Nguyện

| Mốc | Star |
|------|------|
| Streak pray 7 ngày | 3 |
| Streak pray 14 ngày | 8 |
| Streak pray 30 ngày | 20 |

#### Mốc Đa Server

| Mốc | Star |
|------|------|
| Hoạt động trong 3 server | 5 |
| Hoạt động trong 5 server | 10 |
| Hoạt động trong 10 server | 20 |

#### Bảng Xếp Hạng

| Mốc | Star |
|------|------|
| Lọt top 3 trên bảng xếp hạng bất kỳ | 10 |

Dùng `/wallet view` để xem những mốc nào bạn đã nhận và mốc nào còn có thể nhận.

## Tiêu Star

### Lệnh Manga

Tất cả lệnh manga (`/nhentai`, `/3hentai`, `/asmhentai`, `/hentaifox`, `/nhentai-lite`, `/pururin`) sử dụng **hệ thống tính phí star**:

- **3 lượt miễn phí mỗi ngày** — reset lúc nửa đêm UTC
- Sau khi hết lượt miễn phí, mỗi lệnh tốn **1 star**
- Cả 6 nguồn manga **dùng chung bộ đếm** — dùng `/nhentai` tính cùng 3 lượt miễn phí với `/3hentai`
- Nếu lệnh lỗi (API error, timeout), star hoặc lượt miễn phí sẽ được **hoàn tự động**

> **Mẹo:** Chia 3 lượt miễn phí cho các nguồn khác nhau để khám phá, rồi dùng star cho nguồn yêu thích.

Để biết thêm chi tiết về lệnh manga, xem [Hướng dẫn Manga](/vi/guide/manga).

### Shop Toàn Cầu

Dùng `/global-shop buy` để mua vật phẩm độc quyền bằng star. Mỗi vật phẩm có giá star riêng, và một số có số lượng giới hạn. Kiểm tra shop thường xuyên để tìm vật phẩm mới.

## Quản Lý Ví

| Lệnh | Chức Năng |
|------|-----------|
| `/wallet view` | Xem số dư star, streak hàng ngày và tiến độ mốc thành tích |
| `/wallet daily` | Nhận phần thưởng star hàng ngày |
| `/wallet history` | Xem lịch sử giao dịch toàn cầu (thu nhập và chi tiêu star) |

## Mẹo & Chiến Lược

1. **Đừng bao giờ bỏ lỡ `/wallet daily`** — bonus streak rất lớn. Streak 30 ngày cho +20 star bonus ngoài 1–3 star cơ bản.
2. **Làm tất cả hoạt động hàng ngày** — pray, curse, work, fish, mine và dungeon đều có cơ hội rơi star độc lập. Làm đủ sáu hoạt động cho bạn tới 6 cơ hội mỗi ngày.
3. **Theo dõi mốc thành tích** — dùng `/wallet view` để xem những mốc nào chưa nhận. Một số (như đa server) chỉ cần tham gia thêm server có 3AT.
4. **Dùng manga miễn phí trước** — bạn có 3 lượt miễn phí mỗi ngày. Đừng tiêu star khi chưa hết lượt.
5. **Star là vĩnh viễn** — không ai có thể lấy star của bạn. Star thuộc về bạn trên mọi server, mãi mãi.
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/content/guides/vi/star.md
git commit -m "feat(landing): add VI star currency guide"
```

---

### Task 4: Update manga guides with star cost section

**Files:**
- Modify: `landing/src/content/guides/en/manga.md` (insert after line 39, before line 41 "## NSFW Safety")
- Modify: `landing/src/content/guides/vi/manga.md` (insert after line 39, before line 41 "## An Toàn NSFW")

- [ ] **Step 1: Add star cost section to EN manga guide**

In `landing/src/content/guides/en/manga.md`, insert the following **before** the `## NSFW Safety` line (line 41):

```markdown
## Star Cost

Manga commands use the **star charge system**:

- **3 free uses per day** — resets at UTC midnight
- After free uses are gone, each command costs **1 star** ⭐
- All 6 manga sources **share the same daily counter** — using `/nhentai` counts toward the same 3 free uses as `/3hentai`
- If the command fails (API error, timeout), your star or free use is **automatically refunded**

Use `/wallet view` to check your star balance. See the [Star Guide](/en/guide/star) for all the ways to earn stars.

```

- [ ] **Step 2: Add star cost section to VI manga guide**

In `landing/src/content/guides/vi/manga.md`, insert the following **before** the `## An Toàn NSFW` line (line 41):

```markdown
## Chi Phí Star

Các lệnh manga sử dụng **hệ thống tính phí star**:

- **3 lượt miễn phí mỗi ngày** — reset lúc nửa đêm UTC
- Sau khi hết lượt miễn phí, mỗi lệnh tốn **1 star** ⭐
- Cả 6 nguồn manga **dùng chung bộ đếm** — dùng `/nhentai` tính cùng 3 lượt miễn phí với `/3hentai`
- Nếu lệnh lỗi (API error, timeout), star hoặc lượt miễn phí sẽ được **hoàn tự động**

Dùng `/wallet view` để xem số dư star. Xem [Hướng dẫn Star](/vi/guide/star) để biết tất cả cách kiếm star.

```

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/manga.md landing/src/content/guides/vi/manga.md
git commit -m "feat(landing): add star cost section to manga guides"
```

---

### Task 5: Simplify star section in economy guides

**Files:**
- Modify: `landing/src/content/guides/en/economy.md:101-127` (replace "Global Wallet & Star Currency" section)
- Modify: `landing/src/content/guides/vi/economy.md:101-127` (replace equivalent section)

- [ ] **Step 1: Replace star section in EN economy guide**

In `landing/src/content/guides/en/economy.md`, replace lines 101–127 (the entire "## Global Wallet & Star Currency" section including subsections) with:

```markdown
## Global Wallet & Star Currency

Beyond coins and gems, there's a third currency: **Star** ⭐ — a **global** currency that works across all servers. Stars cannot be modified by admins or traded between users.

Earn stars through daily claims, activity drops, and achievement milestones. Spend them on manga commands and the global shop.

For the full breakdown, see the [Star Guide](/en/guide/star).
```

- [ ] **Step 2: Replace star section in VI economy guide**

In `landing/src/content/guides/vi/economy.md`, replace lines 101–127 (the entire "## Ví Toàn Cầu & Tiền Tệ Star" section including subsections) with:

```markdown
## Ví Toàn Cầu & Tiền Tệ Star

Ngoài coin và gem, còn có loại tiền thứ ba: **Star** ⭐ — tiền tệ **toàn cầu** hoạt động trên tất cả server. Star không thể bị admin chỉnh sửa hay chuyển cho người dùng khác.

Kiếm star qua nhận hàng ngày, rơi ngẫu nhiên từ hoạt động, và mốc thành tích. Tiêu star cho lệnh manga và shop toàn cầu.

Để biết chi tiết đầy đủ, xem [Hướng dẫn Star](/vi/guide/star).
```

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/economy.md landing/src/content/guides/vi/economy.md
git commit -m "feat(landing): simplify star section in economy guides, link to star guide"
```

---

### Task 6: Verify build

- [ ] **Step 1: Run Astro build to verify no errors**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npm run build
```

Expected: Build succeeds, new guide pages generated at `/en/guide/star` and `/vi/guide/star`.

- [ ] **Step 2: Spot check — verify star guide appears in guide index**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing && npm run dev
```

Open browser: `http://localhost:4321/guide` — verify star guide card appears. Click through to `/en/guide/star` and `/vi/guide/star`. Check manga guide has new "Star Cost" section. Check economy guide has shortened star section with link.

- [ ] **Step 3: Stop dev server and commit if any fixes needed**
