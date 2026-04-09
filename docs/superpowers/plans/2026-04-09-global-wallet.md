# Global Wallet System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bot-controlled global wallet system with a new "star" currency, daily claim with streaks, one-time milestone rewards, and `/wallet` command — completely separate from the per-guild coin/gem economy.

**Architecture:** New `UserWallet` model (userId-only, no guildId) with `WalletService` following `CurrencyService` patterns. Global transactions logged to existing `Transaction` model with `guildId: "global"` and new `global_*` transaction types. Milestone hooks added to existing level-up and pray-streak code paths.

**Tech Stack:** TypeScript, Mongoose 8, Discord.js v14, i18next

**Spec:** `docs/superpowers/specs/2026-04-09-global-wallet-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/models/userWallet.model.ts` | UserWallet schema + IUserWallet interface |
| Create | `src/services/economy/wallet.service.ts` | WalletService: addStar, deductStar, claimDaily, milestones |
| Create | `src/commands/slash/wallet.ts` | `/wallet`, `/wallet daily`, `/wallet history` |
| Modify | `src/models/transaction.model.ts` | Add `global_*` transaction types to enum |
| Modify | `src/events/messageCreate.ts` | Hook level-up milestone check |
| Modify | `src/services/economy/pray.service.ts` | Hook pray-streak milestone check |
| Modify | `src/commands/slash/leaderboard.ts` | Hook top-3 milestone check |
| Modify | `src/locales/en.json` | English wallet translations |
| Modify | `src/locales/vi.json` | Vietnamese wallet translations |
| Modify | `src/locales/id.json` | Indonesian wallet translations |
| Modify | `src/locales/es.json` | Spanish wallet translations |
| Modify | `src/locales/ja.json` | Japanese wallet translations |
| Modify | `src/locales/zh.json` | Chinese wallet translations |
| Modify | `src/locales/ko.json` | Korean wallet translations |
| Modify | `src/locales/pt-BR.json` | Portuguese (Brazil) wallet translations |
| Modify | `src/locales/fr.json` | French wallet translations |
| Modify | `src/locales/de.json` | German wallet translations |
| Modify | `src/locales/ru.json` | Russian wallet translations |
| Modify | `src/locales/tr.json` | Turkish wallet translations |
| Modify | `src/locales/it.json` | Italian wallet translations |
| Modify | `src/locales/pl.json` | Polish wallet translations |
| Modify | `src/locales/nl.json` | Dutch wallet translations |

---

### Task 1: Extend Transaction Model

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add global transaction types to TransactionType**

Open `src/models/transaction.model.ts`. Add 4 new types to the `TransactionType` union:

```typescript
export type TransactionType =
    | "pray"
    | "curse"
    | "purchase"
    | "exchange"
    | "streak_bonus"
    | "admin"
    | "confession_vip"
    | "confession_skip_cd"
    | "confession_refund"
    | "confession_reply"
    | "level_up"
    | "voice_reward"
    | "gambling"
    | "work"
    | "fish"
    | "gift"
    | "rob"
    | "rob_penalty"
    | "global_daily"
    | "global_streak_bonus"
    | "global_milestone"
    | "global_spend";
```

Also update the `enum` array in the schema definition to include the same 4 new values.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add global_* transaction types for wallet system"
```

---

### Task 2: UserWallet Model

**Files:**
- Create: `src/models/userWallet.model.ts`

- [ ] **Step 1: Create the UserWallet model**

Create `src/models/userWallet.model.ts`:

```typescript
import { Document, model, Schema } from "mongoose";

export interface IUserWallet extends Document {
    userId: string;
    star: number;
    lastDaily: Date | null;
    dailyStreak: number;
    lastStreakDate: Date | null;
    claimedMilestones: string[];
}

const userWalletSchema = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        star: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        dailyStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
        claimedMilestones: { type: [String], default: [] },
    },
    { timestamps: true, collection: "UserWallets" }
);

userWalletSchema.index({ userId: 1 }, { unique: true });
userWalletSchema.index({ star: -1 });

export default model<IUserWallet>("UserWallet", userWalletSchema);
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/userWallet.model.ts
git commit -m "feat(economy): add UserWallet model for global star currency"
```

---

### Task 3: WalletService — Core Operations

**Files:**
- Create: `src/services/economy/wallet.service.ts`

- [ ] **Step 1: Create WalletService with core methods**

Create `src/services/economy/wallet.service.ts`:

```typescript
import UserWalletModel, { IUserWallet } from "../../models/userWallet.model";
import TransactionModel, { TransactionType } from "../../models/transaction.model";

const GLOBAL_GUILD_ID = "global";

export class InsufficientStarError extends Error {
    constructor(
        public readonly available: number,
        public readonly required: number
    ) {
        super(`Insufficient star: have ${available}, need ${required}`);
        this.name = "InsufficientStarError";
    }
}

export interface WalletBalance {
    star: number;
    dailyStreak: number;
    lastDaily: Date | null;
    claimedMilestones: string[];
}

async function logTransaction(
    userId: string,
    type: TransactionType,
    starDelta: number,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await TransactionModel.create({
        userId,
        guildId: GLOBAL_GUILD_ID,
        type,
        coinDelta: starDelta,
        gemDelta: 0,
        metadata,
    });
}

async function getOrCreate(userId: string): Promise<IUserWallet> {
    const wallet = await UserWalletModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, star: 0, dailyStreak: 0, claimedMilestones: [] } },
        { upsert: true, new: true }
    );
    return wallet;
}

async function getBalance(userId: string): Promise<WalletBalance> {
    const wallet = await getOrCreate(userId);
    return {
        star: wallet.star,
        dailyStreak: wallet.dailyStreak,
        lastDaily: wallet.lastDaily,
        claimedMilestones: wallet.claimedMilestones,
    };
}

async function addStar(
    userId: string,
    amount: number,
    reason: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<IUserWallet> {
    const wallet = await UserWalletModel.findOneAndUpdate(
        { userId },
        {
            $inc: { star: amount },
            $setOnInsert: { userId, dailyStreak: 0, claimedMilestones: [] },
        },
        { upsert: true, new: true }
    );
    await logTransaction(userId, reason, amount, metadata);
    return wallet;
}

async function deductStar(
    userId: string,
    amount: number,
    reason: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<IUserWallet> {
    const wallet = await UserWalletModel.findOneAndUpdate(
        { userId, star: { $gte: amount } },
        { $inc: { star: -amount } },
        { new: true }
    );
    if (!wallet) {
        const current = await getOrCreate(userId);
        throw new InsufficientStarError(current.star, amount);
    }
    await logTransaction(userId, reason, -amount, metadata);
    return wallet;
}

export default { getBalance, addStar, deductStar, getOrCreate };
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/wallet.service.ts
git commit -m "feat(economy): add WalletService core (getBalance, addStar, deductStar)"
```

---

### Task 4: WalletService — Daily Claim

**Files:**
- Modify: `src/services/economy/wallet.service.ts`

- [ ] **Step 1: Add daily claim logic to WalletService**

Add these functions to `src/services/economy/wallet.service.ts`, above the `export default`:

```typescript
function isSameUTCDay(d1: Date, d2: Date): boolean {
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
}

function isConsecutiveUTCDay(prev: Date, now: Date): boolean {
    const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
    const nowDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = nowDay.getTime() - prevDay.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}

const DAILY_STREAK_MILESTONES = [
    { days: 3, bonus: 2 },
    { days: 7, bonus: 5 },
    { days: 14, bonus: 10 },
    { days: 30, bonus: 20 },
] as const;

export interface DailyClaimResult {
    baseReward: number;
    streakBonus: number;
    streak: number;
    milestoneHit: { days: number; bonus: number } | null;
}

async function claimDaily(userId: string): Promise<DailyClaimResult> {
    const wallet = await getOrCreate(userId);

    // Check cooldown
    if (wallet.lastDaily && isSameUTCDay(wallet.lastDaily, new Date())) {
        throw new Error("DAILY_COOLDOWN");
    }

    const now = new Date();

    // Calculate streak
    let newStreak = 1;
    if (wallet.lastStreakDate && isConsecutiveUTCDay(wallet.lastStreakDate, now)) {
        newStreak = wallet.dailyStreak + 1;
    }

    // Base reward: uniform random 1-3
    const baseReward = Math.floor(Math.random() * 3) + 1;

    // Check streak milestone
    let milestoneHit: DailyClaimResult["milestoneHit"] = null;
    let streakBonus = 0;
    for (const milestone of DAILY_STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonus: milestone.bonus };
            streakBonus = milestone.bonus;
            break;
        }
    }

    const totalReward = baseReward + streakBonus;

    // Update wallet state
    await UserWalletModel.updateOne(
        { userId },
        {
            $inc: { star: totalReward },
            $set: {
                lastDaily: now,
                dailyStreak: newStreak,
                lastStreakDate: now,
            },
        }
    );

    // Log transactions
    await logTransaction(userId, "global_daily", baseReward, { streak: newStreak });
    if (streakBonus > 0) {
        await logTransaction(userId, "global_streak_bonus", streakBonus, {
            days: milestoneHit!.days,
        });
    }

    return { baseReward, streakBonus, streak: newStreak, milestoneHit };
}
```

Update the default export:

```typescript
export default { getBalance, addStar, deductStar, getOrCreate, claimDaily };
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/wallet.service.ts
git commit -m "feat(economy): add WalletService daily claim with streak milestones"
```

---

### Task 5: WalletService — Milestone Awards

**Files:**
- Modify: `src/services/economy/wallet.service.ts`

- [ ] **Step 1: Add milestone definitions and check function**

Add to `src/services/economy/wallet.service.ts`, above the `export default`:

```typescript
const MILESTONES: Record<string, number> = {
    level_10: 5,
    level_25: 15,
    level_50: 30,
    level_100: 50,
    pray_streak_7: 3,
    pray_streak_14: 8,
    pray_streak_30: 20,
    leaderboard_top3: 10,
    multi_server_3: 5,
    multi_server_5: 10,
    multi_server_10: 20,
};

async function checkAndAwardMilestone(
    userId: string,
    milestoneKey: string
): Promise<{ awarded: boolean; star: number }> {
    const starAmount = MILESTONES[milestoneKey];
    if (!starAmount) return { awarded: false, star: 0 };

    // Atomic: only add milestone if not already claimed
    const result = await UserWalletModel.findOneAndUpdate(
        { userId, claimedMilestones: { $ne: milestoneKey } },
        {
            $inc: { star: starAmount },
            $addToSet: { claimedMilestones: milestoneKey },
            $setOnInsert: { userId, dailyStreak: 0 },
        },
        { upsert: true, new: true }
    );

    // Check if milestone was actually added (not already claimed)
    if (result.claimedMilestones.includes(milestoneKey)) {
        // Could have been already present — check if we just added it
        // by verifying the star amount increased. Simpler: just check
        // if the update matched.
        await logTransaction(userId, "global_milestone", starAmount, {
            milestone: milestoneKey,
        });
        return { awarded: true, star: starAmount };
    }

    return { awarded: false, star: 0 };
}
```

Wait — the atomic approach above has a subtle issue: `findOneAndUpdate` with `$ne` + upsert can cause duplicate key errors if the wallet doesn't exist yet AND the milestone is unclaimed. A safer approach:

```typescript
async function checkAndAwardMilestone(
    userId: string,
    milestoneKey: string
): Promise<{ awarded: boolean; star: number }> {
    const starAmount = MILESTONES[milestoneKey];
    if (!starAmount) return { awarded: false, star: 0 };

    // Ensure wallet exists first
    await getOrCreate(userId);

    // Atomic: only update if milestone not already claimed
    const result = await UserWalletModel.findOneAndUpdate(
        { userId, claimedMilestones: { $ne: milestoneKey } },
        {
            $inc: { star: starAmount },
            $addToSet: { claimedMilestones: milestoneKey },
        },
        { new: true }
    );

    if (!result) {
        // Milestone already claimed
        return { awarded: false, star: 0 };
    }

    await logTransaction(userId, "global_milestone", starAmount, {
        milestone: milestoneKey,
    });
    return { awarded: true, star: starAmount };
}
```

Use this second version. It calls `getOrCreate` first to ensure the document exists, then does an atomic `$ne` check without upsert.

Update the default export:

```typescript
export default { getBalance, addStar, deductStar, getOrCreate, claimDaily, checkAndAwardMilestone };
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/wallet.service.ts
git commit -m "feat(economy): add WalletService milestone check and award"
```

---

### Task 6: i18n — Add Translation Keys

**Files:**
- Modify: all 15 locale files in `src/locales/`

- [ ] **Step 1: Add English translations**

Add to `src/locales/en.json`:

```json
"cmd.wallet.desc": "View your global wallet and claim daily star",
"cmd.wallet.daily.desc": "Claim your daily star reward",
"cmd.wallet.history.desc": "View your global transaction history",
"cmd.wallet.history.page.desc": "Page number",

"wallet.title": "Global Wallet of {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Daily Streak",
"wallet.daily_streak_value": "**{{count}}** days",
"wallet.last_daily": "Last Daily",
"wallet.milestones_claimed": "Milestones",
"wallet.milestones_value": "**{{count}}** / **{{total}}** claimed",

"wallet.daily.success": "**{{username}}** claimed their daily star!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Streak: **{{streak}}** days",
"wallet.daily.milestone": "Streak milestone **{{days}} days**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "You already claimed today. Come back tomorrow!",

"wallet.history.title": "Global Wallet History of {{username}}",
"wallet.history.empty": "No transactions yet.",
"wallet.history.page": "Page {{page}} / {{total}}",

"wallet.milestone.awarded": "Milestone unlocked: **{{milestone}}**! +**{{star}}** star",

"wallet.error.insufficient": "Not enough star! You have **{{available}}**, need **{{required}}**."
```

- [ ] **Step 2: Add Vietnamese translations**

Add to `src/locales/vi.json`:

```json
"cmd.wallet.desc": "Xem ví toàn cầu và nhận star hàng ngày",
"cmd.wallet.daily.desc": "Nhận star hàng ngày",
"cmd.wallet.history.desc": "Xem lịch sử giao dịch toàn cầu",
"cmd.wallet.history.page.desc": "Số trang",

"wallet.title": "Ví Toàn Cầu của {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Chuỗi Ngày",
"wallet.daily_streak_value": "**{{count}}** ngày",
"wallet.last_daily": "Nhận Lần Cuối",
"wallet.milestones_claimed": "Thành Tựu",
"wallet.milestones_value": "**{{count}}** / **{{total}}** đã đạt",

"wallet.daily.success": "**{{username}}** đã nhận star hàng ngày!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Chuỗi: **{{streak}}** ngày",
"wallet.daily.milestone": "Cột mốc **{{days}} ngày**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Bạn đã nhận hôm nay rồi. Quay lại ngày mai nhé!",

"wallet.history.title": "Lịch Sử Ví của {{username}}",
"wallet.history.empty": "Chưa có giao dịch nào.",
"wallet.history.page": "Trang {{page}} / {{total}}",

"wallet.milestone.awarded": "Mở khóa thành tựu: **{{milestone}}**! +**{{star}}** star",

"wallet.error.insufficient": "Không đủ star! Bạn có **{{available}}**, cần **{{required}}**."
```

- [ ] **Step 3: Add translations for remaining 13 locales**

Add the same key structure to `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

Each locale should translate the values appropriately. Keys stay identical. Use English as fallback if unsure about a translation — i18next falls back to `en` for missing keys.

**Indonesian (`id.json`):**
```json
"cmd.wallet.desc": "Lihat dompet global dan klaim star harian",
"cmd.wallet.daily.desc": "Klaim hadiah star harian",
"cmd.wallet.history.desc": "Lihat riwayat transaksi global",
"cmd.wallet.history.page.desc": "Nomor halaman",
"wallet.title": "Dompet Global {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Streak Harian",
"wallet.daily_streak_value": "**{{count}}** hari",
"wallet.last_daily": "Klaim Terakhir",
"wallet.milestones_claimed": "Pencapaian",
"wallet.milestones_value": "**{{count}}** / **{{total}}** tercapai",
"wallet.daily.success": "**{{username}}** mengklaim star harian!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Streak: **{{streak}}** hari",
"wallet.daily.milestone": "Milestone **{{days}} hari**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Kamu sudah klaim hari ini. Kembali besok!",
"wallet.history.title": "Riwayat Dompet Global {{username}}",
"wallet.history.empty": "Belum ada transaksi.",
"wallet.history.page": "Halaman {{page}} / {{total}}",
"wallet.milestone.awarded": "Pencapaian terbuka: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Star tidak cukup! Kamu punya **{{available}}**, butuh **{{required}}**."
```

**Spanish (`es.json`):**
```json
"cmd.wallet.desc": "Ver tu billetera global y reclamar star diario",
"cmd.wallet.daily.desc": "Reclamar tu star diario",
"cmd.wallet.history.desc": "Ver historial de transacciones globales",
"cmd.wallet.history.page.desc": "Número de página",
"wallet.title": "Billetera Global de {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Racha Diaria",
"wallet.daily_streak_value": "**{{count}}** días",
"wallet.last_daily": "Último Reclamo",
"wallet.milestones_claimed": "Logros",
"wallet.milestones_value": "**{{count}}** / **{{total}}** completados",
"wallet.daily.success": "**{{username}}** reclamó su star diario!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Racha: **{{streak}}** días",
"wallet.daily.milestone": "¡Hito **{{days}} días**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "¡Ya reclamaste hoy! Vuelve mañana.",
"wallet.history.title": "Historial de Billetera de {{username}}",
"wallet.history.empty": "Sin transacciones aún.",
"wallet.history.page": "Página {{page}} / {{total}}",
"wallet.milestone.awarded": "¡Logro desbloqueado: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "¡Star insuficiente! Tienes **{{available}}**, necesitas **{{required}}**."
```

**Japanese (`ja.json`):**
```json
"cmd.wallet.desc": "グローバルウォレットを表示し、デイリースターを受け取る",
"cmd.wallet.daily.desc": "デイリースター報酬を受け取る",
"cmd.wallet.history.desc": "グローバル取引履歴を表示",
"cmd.wallet.history.page.desc": "ページ番号",
"wallet.title": "{{username}}のグローバルウォレット",
"wallet.star": "スター",
"wallet.daily_streak": "連続日数",
"wallet.daily_streak_value": "**{{count}}**日",
"wallet.last_daily": "最終受取",
"wallet.milestones_claimed": "実績",
"wallet.milestones_value": "**{{count}}** / **{{total}}** 達成",
"wallet.daily.success": "**{{username}}**がデイリースターを受け取りました！",
"wallet.daily.reward": "> +**{{star}}** スター",
"wallet.daily.streak": "連続: **{{streak}}**日",
"wallet.daily.milestone": "マイルストーン**{{days}}日**達成！ボーナス: +**{{bonus}}** スター",
"wallet.daily.cooldown": "今日はもう受け取りました。明日また来てください！",
"wallet.history.title": "{{username}}のウォレット履歴",
"wallet.history.empty": "取引履歴がありません。",
"wallet.history.page": "ページ {{page}} / {{total}}",
"wallet.milestone.awarded": "実績解除: **{{milestone}}**! +**{{star}}** スター",
"wallet.error.insufficient": "スターが足りません！所持: **{{available}}**、必要: **{{required}}**"
```

**Chinese (`zh.json`):**
```json
"cmd.wallet.desc": "查看全局钱包并领取每日星星",
"cmd.wallet.daily.desc": "领取每日星星奖励",
"cmd.wallet.history.desc": "查看全局交易历史",
"cmd.wallet.history.page.desc": "页码",
"wallet.title": "{{username}}的全局钱包",
"wallet.star": "星星",
"wallet.daily_streak": "连续天数",
"wallet.daily_streak_value": "**{{count}}**天",
"wallet.last_daily": "上次领取",
"wallet.milestones_claimed": "成就",
"wallet.milestones_value": "**{{count}}** / **{{total}}** 已达成",
"wallet.daily.success": "**{{username}}**领取了每日星星！",
"wallet.daily.reward": "> +**{{star}}** 星星",
"wallet.daily.streak": "连续: **{{streak}}**天",
"wallet.daily.milestone": "里程碑**{{days}}天**！奖励: +**{{bonus}}** 星星",
"wallet.daily.cooldown": "今天已经领取过了，明天再来吧！",
"wallet.history.title": "{{username}}的钱包历史",
"wallet.history.empty": "暂无交易记录。",
"wallet.history.page": "第 {{page}} / {{total}} 页",
"wallet.milestone.awarded": "成就解锁: **{{milestone}}**! +**{{star}}** 星星",
"wallet.error.insufficient": "星星不足！拥有 **{{available}}**，需要 **{{required}}**。"
```

**Korean (`ko.json`):**
```json
"cmd.wallet.desc": "글로벌 지갑 보기 및 일일 스타 수령",
"cmd.wallet.daily.desc": "일일 스타 보상 수령",
"cmd.wallet.history.desc": "글로벌 거래 내역 보기",
"cmd.wallet.history.page.desc": "페이지 번호",
"wallet.title": "{{username}}의 글로벌 지갑",
"wallet.star": "스타",
"wallet.daily_streak": "연속 일수",
"wallet.daily_streak_value": "**{{count}}**일",
"wallet.last_daily": "마지막 수령",
"wallet.milestones_claimed": "업적",
"wallet.milestones_value": "**{{count}}** / **{{total}}** 달성",
"wallet.daily.success": "**{{username}}**이(가) 일일 스타를 수령했습니다!",
"wallet.daily.reward": "> +**{{star}}** 스타",
"wallet.daily.streak": "연속: **{{streak}}**일",
"wallet.daily.milestone": "마일스톤 **{{days}}일** 달성! 보너스: +**{{bonus}}** 스타",
"wallet.daily.cooldown": "오늘은 이미 수령했습니다. 내일 다시 오세요!",
"wallet.history.title": "{{username}}의 지갑 내역",
"wallet.history.empty": "거래 내역이 없습니다.",
"wallet.history.page": "페이지 {{page}} / {{total}}",
"wallet.milestone.awarded": "업적 달성: **{{milestone}}**! +**{{star}}** 스타",
"wallet.error.insufficient": "스타가 부족합니다! 보유: **{{available}}**, 필요: **{{required}}**"
```

**Portuguese Brazil (`pt-BR.json`):**
```json
"cmd.wallet.desc": "Ver sua carteira global e reivindicar star diário",
"cmd.wallet.daily.desc": "Reivindicar sua star diária",
"cmd.wallet.history.desc": "Ver histórico de transações globais",
"cmd.wallet.history.page.desc": "Número da página",
"wallet.title": "Carteira Global de {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Sequência Diária",
"wallet.daily_streak_value": "**{{count}}** dias",
"wallet.last_daily": "Última Reivindicação",
"wallet.milestones_claimed": "Conquistas",
"wallet.milestones_value": "**{{count}}** / **{{total}}** completadas",
"wallet.daily.success": "**{{username}}** reivindicou sua star diária!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Sequência: **{{streak}}** dias",
"wallet.daily.milestone": "Marco **{{days}} dias**! Bônus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Você já reivindicou hoje. Volte amanhã!",
"wallet.history.title": "Histórico da Carteira de {{username}}",
"wallet.history.empty": "Nenhuma transação ainda.",
"wallet.history.page": "Página {{page}} / {{total}}",
"wallet.milestone.awarded": "Conquista desbloqueada: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Star insuficiente! Você tem **{{available}}**, precisa de **{{required}}**."
```

**French (`fr.json`):**
```json
"cmd.wallet.desc": "Voir votre portefeuille global et réclamer les stars quotidiennes",
"cmd.wallet.daily.desc": "Réclamer votre star quotidienne",
"cmd.wallet.history.desc": "Voir l'historique des transactions globales",
"cmd.wallet.history.page.desc": "Numéro de page",
"wallet.title": "Portefeuille Global de {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Série Quotidienne",
"wallet.daily_streak_value": "**{{count}}** jours",
"wallet.last_daily": "Dernier Réclamé",
"wallet.milestones_claimed": "Réalisations",
"wallet.milestones_value": "**{{count}}** / **{{total}}** complétées",
"wallet.daily.success": "**{{username}}** a réclamé sa star quotidienne !",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Série : **{{streak}}** jours",
"wallet.daily.milestone": "Jalon **{{days}} jours** ! Bonus : +**{{bonus}}** star",
"wallet.daily.cooldown": "Vous avez déjà réclamé aujourd'hui. Revenez demain !",
"wallet.history.title": "Historique du Portefeuille de {{username}}",
"wallet.history.empty": "Aucune transaction pour le moment.",
"wallet.history.page": "Page {{page}} / {{total}}",
"wallet.milestone.awarded": "Réalisation débloquée : **{{milestone}}** ! +**{{star}}** star",
"wallet.error.insufficient": "Pas assez de star ! Vous avez **{{available}}**, il faut **{{required}}**."
```

**German (`de.json`):**
```json
"cmd.wallet.desc": "Globale Geldbörse anzeigen und täglichen Star beanspruchen",
"cmd.wallet.daily.desc": "Tägliche Star-Belohnung beanspruchen",
"cmd.wallet.history.desc": "Globalen Transaktionsverlauf anzeigen",
"cmd.wallet.history.page.desc": "Seitennummer",
"wallet.title": "Globale Geldbörse von {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Tägliche Serie",
"wallet.daily_streak_value": "**{{count}}** Tage",
"wallet.last_daily": "Zuletzt Beansprucht",
"wallet.milestones_claimed": "Erfolge",
"wallet.milestones_value": "**{{count}}** / **{{total}}** erreicht",
"wallet.daily.success": "**{{username}}** hat den täglichen Star beansprucht!",
"wallet.daily.reward": "> +**{{star}}** Star",
"wallet.daily.streak": "Serie: **{{streak}}** Tage",
"wallet.daily.milestone": "Meilenstein **{{days}} Tage**! Bonus: +**{{bonus}}** Star",
"wallet.daily.cooldown": "Du hast heute schon beansprucht. Komm morgen wieder!",
"wallet.history.title": "Geldbörsen-Verlauf von {{username}}",
"wallet.history.empty": "Noch keine Transaktionen.",
"wallet.history.page": "Seite {{page}} / {{total}}",
"wallet.milestone.awarded": "Erfolg freigeschaltet: **{{milestone}}**! +**{{star}}** Star",
"wallet.error.insufficient": "Nicht genug Star! Du hast **{{available}}**, brauchst **{{required}}**."
```

**Russian (`ru.json`):**
```json
"cmd.wallet.desc": "Посмотреть глобальный кошелёк и получить ежедневную звезду",
"cmd.wallet.daily.desc": "Получить ежедневную награду",
"cmd.wallet.history.desc": "Посмотреть историю глобальных транзакций",
"cmd.wallet.history.page.desc": "Номер страницы",
"wallet.title": "Глобальный Кошелёк {{username}}",
"wallet.star": "Звезда",
"wallet.daily_streak": "Серия Дней",
"wallet.daily_streak_value": "**{{count}}** дней",
"wallet.last_daily": "Последнее Получение",
"wallet.milestones_claimed": "Достижения",
"wallet.milestones_value": "**{{count}}** / **{{total}}** получено",
"wallet.daily.success": "**{{username}}** получил(а) ежедневную звезду!",
"wallet.daily.reward": "> +**{{star}}** звезда",
"wallet.daily.streak": "Серия: **{{streak}}** дней",
"wallet.daily.milestone": "Веха **{{days}} дней**! Бонус: +**{{bonus}}** звезда",
"wallet.daily.cooldown": "Вы уже получили сегодня. Возвращайтесь завтра!",
"wallet.history.title": "История Кошелька {{username}}",
"wallet.history.empty": "Транзакций пока нет.",
"wallet.history.page": "Страница {{page}} / {{total}}",
"wallet.milestone.awarded": "Достижение разблокировано: **{{milestone}}**! +**{{star}}** звезда",
"wallet.error.insufficient": "Недостаточно звёзд! У вас **{{available}}**, нужно **{{required}}**."
```

**Turkish (`tr.json`):**
```json
"cmd.wallet.desc": "Global cüzdanını görüntüle ve günlük star topla",
"cmd.wallet.daily.desc": "Günlük star ödülünü topla",
"cmd.wallet.history.desc": "Global işlem geçmişini görüntüle",
"cmd.wallet.history.page.desc": "Sayfa numarası",
"wallet.title": "{{username}} Global Cüzdanı",
"wallet.star": "Star",
"wallet.daily_streak": "Günlük Seri",
"wallet.daily_streak_value": "**{{count}}** gün",
"wallet.last_daily": "Son Toplama",
"wallet.milestones_claimed": "Başarılar",
"wallet.milestones_value": "**{{count}}** / **{{total}}** tamamlandı",
"wallet.daily.success": "**{{username}}** günlük star'ını topladı!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Seri: **{{streak}}** gün",
"wallet.daily.milestone": "Kilometre taşı **{{days}} gün**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Bugün zaten topladın. Yarın tekrar gel!",
"wallet.history.title": "{{username}} Cüzdan Geçmişi",
"wallet.history.empty": "Henüz işlem yok.",
"wallet.history.page": "Sayfa {{page}} / {{total}}",
"wallet.milestone.awarded": "Başarı açıldı: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Yeterli star yok! **{{available}}** var, **{{required}}** gerekli."
```

**Italian (`it.json`):**
```json
"cmd.wallet.desc": "Visualizza il portafoglio globale e riscuoti star giornaliere",
"cmd.wallet.daily.desc": "Riscuoti la tua star giornaliera",
"cmd.wallet.history.desc": "Visualizza la cronologia delle transazioni globali",
"cmd.wallet.history.page.desc": "Numero di pagina",
"wallet.title": "Portafoglio Globale di {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Serie Giornaliera",
"wallet.daily_streak_value": "**{{count}}** giorni",
"wallet.last_daily": "Ultimo Riscosso",
"wallet.milestones_claimed": "Traguardi",
"wallet.milestones_value": "**{{count}}** / **{{total}}** completati",
"wallet.daily.success": "**{{username}}** ha riscosso la star giornaliera!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Serie: **{{streak}}** giorni",
"wallet.daily.milestone": "Traguardo **{{days}} giorni**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Hai già riscosso oggi. Torna domani!",
"wallet.history.title": "Cronologia Portafoglio di {{username}}",
"wallet.history.empty": "Nessuna transazione ancora.",
"wallet.history.page": "Pagina {{page}} / {{total}}",
"wallet.milestone.awarded": "Traguardo sbloccato: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Star insufficienti! Hai **{{available}}**, servono **{{required}}**."
```

**Polish (`pl.json`):**
```json
"cmd.wallet.desc": "Zobacz globalny portfel i odbierz dzienną gwiazdę",
"cmd.wallet.daily.desc": "Odbierz dzienną nagrodę star",
"cmd.wallet.history.desc": "Zobacz globalną historię transakcji",
"cmd.wallet.history.page.desc": "Numer strony",
"wallet.title": "Globalny Portfel {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Dzienna Seria",
"wallet.daily_streak_value": "**{{count}}** dni",
"wallet.last_daily": "Ostatni Odbiór",
"wallet.milestones_claimed": "Osiągnięcia",
"wallet.milestones_value": "**{{count}}** / **{{total}}** zdobytych",
"wallet.daily.success": "**{{username}}** odebrał(a) dzienną gwiazdę!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Seria: **{{streak}}** dni",
"wallet.daily.milestone": "Kamień milowy **{{days}} dni**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Już odebrałeś dzisiaj. Wróć jutro!",
"wallet.history.title": "Historia Portfela {{username}}",
"wallet.history.empty": "Brak transakcji.",
"wallet.history.page": "Strona {{page}} / {{total}}",
"wallet.milestone.awarded": "Osiągnięcie odblokowane: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Za mało star! Masz **{{available}}**, potrzebujesz **{{required}}**."
```

**Dutch (`nl.json`):**
```json
"cmd.wallet.desc": "Bekijk je globale portemonnee en claim dagelijkse star",
"cmd.wallet.daily.desc": "Claim je dagelijkse star beloning",
"cmd.wallet.history.desc": "Bekijk globale transactiegeschiedenis",
"cmd.wallet.history.page.desc": "Paginanummer",
"wallet.title": "Globale Portemonnee van {{username}}",
"wallet.star": "Star",
"wallet.daily_streak": "Dagelijkse Reeks",
"wallet.daily_streak_value": "**{{count}}** dagen",
"wallet.last_daily": "Laatst Geclaimd",
"wallet.milestones_claimed": "Prestaties",
"wallet.milestones_value": "**{{count}}** / **{{total}}** behaald",
"wallet.daily.success": "**{{username}}** heeft de dagelijkse star geclaimd!",
"wallet.daily.reward": "> +**{{star}}** star",
"wallet.daily.streak": "Reeks: **{{streak}}** dagen",
"wallet.daily.milestone": "Mijlpaal **{{days}} dagen**! Bonus: +**{{bonus}}** star",
"wallet.daily.cooldown": "Je hebt vandaag al geclaimd. Kom morgen terug!",
"wallet.history.title": "Portemonnee Geschiedenis van {{username}}",
"wallet.history.empty": "Nog geen transacties.",
"wallet.history.page": "Pagina {{page}} / {{total}}",
"wallet.milestone.awarded": "Prestatie ontgrendeld: **{{milestone}}**! +**{{star}}** star",
"wallet.error.insufficient": "Niet genoeg star! Je hebt **{{available}}**, nodig **{{required}}**."
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(i18n): add wallet translation keys for all 15 locales"
```

---

### Task 7: `/wallet` Command — Balance View + Daily + History

**Files:**
- Create: `src/commands/slash/wallet.ts`

- [ ] **Step 1: Create the wallet command with 3 subcommands**

Create `src/commands/slash/wallet.ts`:

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/t";
import WalletService, { DailyClaimResult } from "../../services/economy/wallet.service";
import TransactionModel from "../../models/transaction.model";

const GLOBAL_GUILD_ID = "global";
const HISTORY_PAGE_SIZE = 10;
const TOTAL_MILESTONES = 11;

export default {
    data: new SlashCommandBuilder()
        .setName("wallet")
        .setDescription("View your global wallet and claim daily star")
        .setDescriptionLocalizations(descriptionLocales("cmd.wallet.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View your global wallet balance")
                .setDescriptionLocalizations(descriptionLocales("cmd.wallet.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("daily")
                .setDescription("Claim your daily star reward")
                .setDescriptionLocalizations(descriptionLocales("cmd.wallet.daily.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("history")
                .setDescription("View your global transaction history")
                .setDescriptionLocalizations(descriptionLocales("cmd.wallet.history.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("page")
                        .setDescription("Page number")
                        .setDescriptionLocalizations(descriptionLocales("cmd.wallet.history.page.desc"))
                        .setMinValue(1)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case "view":
                return handleView(interaction);
            case "daily":
                return handleDaily(interaction);
            case "history":
                return handleHistory(interaction);
        }
    },
};

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const balance = await WalletService.getBalance(userId);

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(t(locale, "wallet.title", { username: interaction.user.username }))
            .addFields(
                {
                    name: t(locale, "wallet.star"),
                    value: `**${balance.star.toLocaleString()}**`,
                    inline: true,
                },
                {
                    name: t(locale, "wallet.daily_streak"),
                    value: t(locale, "wallet.daily_streak_value", { count: String(balance.dailyStreak) }),
                    inline: true,
                },
                {
                    name: t(locale, "wallet.milestones_claimed"),
                    value: t(locale, "wallet.milestones_value", {
                        count: String(balance.claimedMilestones.length),
                        total: String(TOTAL_MILESTONES),
                    }),
                    inline: true,
                }
            )
            .setTimestamp();

        if (balance.lastDaily) {
            embed.addFields({
                name: t(locale, "wallet.last_daily"),
                value: `<t:${Math.floor(balance.lastDaily.getTime() / 1000)}:R>`,
                inline: true,
            });
        }

        await Reply.embedEdit(interaction, embed);
    } catch {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        await interaction.editReply(t(locale, "common.error"));
    }
}

async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const result = await WalletService.claimDaily(userId);

        const embed = formatDailyEmbed(interaction, result, locale);
        await Reply.embedEdit(interaction, embed);
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        if (error instanceof Error && error.message === "DAILY_COOLDOWN") {
            await interaction.editReply(t(locale, "wallet.daily.cooldown"));
            return;
        }
        await interaction.editReply(t(locale, "common.error"));
    }
}

function formatDailyEmbed(
    interaction: ChatInputCommandInteraction,
    result: DailyClaimResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();
    let description = t(locale, "wallet.daily.success", { username: interaction.user.username }) + "\n\n";
    description += t(locale, "wallet.daily.reward", { star: String(result.baseReward) }) + "\n";

    if (result.streak > 1) {
        description += "\n" + t(locale, "wallet.daily.streak", { streak: String(result.streak) });
    }

    if (result.milestoneHit) {
        description += "\n" + t(locale, "wallet.daily.milestone", {
            days: String(result.milestoneHit.days),
            bonus: String(result.milestoneHit.bonus),
        });
    }

    embed.setDescription(description);
    return embed;
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const page = interaction.options.getInteger("page") ?? 1;

        const totalCount = await TransactionModel.countDocuments({
            userId,
            guildId: GLOBAL_GUILD_ID,
        });
        const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
        const safePage = Math.min(page, totalPages);

        const transactions = await TransactionModel.find({
            userId,
            guildId: GLOBAL_GUILD_ID,
        })
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * HISTORY_PAGE_SIZE)
            .limit(HISTORY_PAGE_SIZE)
            .lean();

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(t(locale, "wallet.history.title", { username: interaction.user.username }))
            .setTimestamp();

        if (transactions.length === 0) {
            embed.setDescription(t(locale, "wallet.history.empty"));
        } else {
            const lines = transactions.map((tx) => {
                const sign = tx.coinDelta >= 0 ? "+" : "";
                const time = `<t:${Math.floor(tx.createdAt.getTime() / 1000)}:R>`;
                return `${time} \`${tx.type}\` ${sign}**${tx.coinDelta}** star`;
            });
            embed.setDescription(lines.join("\n"));
        }

        embed.setFooter({
            text: t(locale, "wallet.history.page", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });

        await Reply.embedEdit(interaction, embed);
    } catch {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        await interaction.editReply(t(locale, "common.error"));
    }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/wallet.ts
git commit -m "feat(economy): add /wallet command (view, daily, history)"
```

---

### Task 8: Hook Milestones — Level Up

**Files:**
- Modify: `src/events/messageCreate.ts`

- [ ] **Step 1: Add milestone check after level-up**

In `src/events/messageCreate.ts`, find the level-up block (around line 73-78):

```typescript
const newLevel = levelFromXP(updated.xp);
if (newLevel > updated.level) {
    await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
    await rewardLevelUp(message.author.id, message.guild.id, newLevel);
}
```

Add wallet milestone checks after `rewardLevelUp`:

```typescript
const newLevel = levelFromXP(updated.xp);
if (newLevel > updated.level) {
    await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
    await rewardLevelUp(message.author.id, message.guild.id, newLevel);

    // Check global wallet level milestones
    const levelMilestones = [10, 25, 50, 100] as const;
    for (const threshold of levelMilestones) {
        if (newLevel >= threshold) {
            await WalletService.checkAndAwardMilestone(message.author.id, `level_${threshold}`);
        }
    }
}
```

Add the import at the top of the file:

```typescript
import WalletService from "../services/economy/wallet.service";
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/events/messageCreate.ts
git commit -m "feat(economy): hook wallet level milestones into messageCreate"
```

---

### Task 9: Hook Milestones — Pray Streak

**Files:**
- Modify: `src/services/economy/pray.service.ts`

- [ ] **Step 1: Add milestone check after streak update**

In `src/services/economy/pray.service.ts`, find the pray function's streak milestone section (around line 94-102 where `milestoneHit` is checked). After the streak section, add wallet milestone check:

Find the block where pray streak is calculated and `STREAK_MILESTONES` is checked. After the `for` loop and before the state update (`UserEconomyModel.updateOne`), add:

```typescript
// Check global wallet pray streak milestones
const prayStreakMilestones = [7, 14, 30] as const;
for (const threshold of prayStreakMilestones) {
    if (newStreak >= threshold) {
        await WalletService.checkAndAwardMilestone(userId, `pray_streak_${threshold}`);
    }
}
```

Add the import at the top of the file:

```typescript
import WalletService from "./wallet.service";
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/pray.service.ts
git commit -m "feat(economy): hook wallet pray-streak milestones into PrayService"
```

---

### Task 10: Hook Milestones — Leaderboard Top 3

**Files:**
- Modify: `src/commands/slash/leaderboard.ts`

- [ ] **Step 1: Add top-3 milestone check when displaying leaderboard**

In `src/commands/slash/leaderboard.ts`, find where all-time server leaderboard data is fetched and the user's rank is known. After determining the user's position in the leaderboard results, add:

```typescript
// Check global wallet leaderboard milestone
if (interaction.user.id) {
    const userRankIndex = allMembers.findIndex(
        (m) => m.userId === interaction.user.id
    );
    if (userRankIndex >= 0 && userRankIndex < 3) {
        await WalletService.checkAndAwardMilestone(
            interaction.user.id,
            "leaderboard_top3"
        );
    }
}
```

Add the import at the top of the file:

```typescript
import WalletService from "../../services/economy/wallet.service";
```

Note: This only checks when the user views the leaderboard. The milestone is one-time, so it's fine if it's not awarded instantly — the user will see it next time they check the leaderboard.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/leaderboard.ts
git commit -m "feat(economy): hook wallet top-3 milestone into leaderboard command"
```

---

### Task 11: Hook Milestones — Multi-Server

**Files:**
- Modify: `src/commands/slash/wallet.ts`

- [ ] **Step 1: Add multi-server check to handleDaily**

The `multi_server_*` milestones count how many guilds the user has economy data in. Query `UserEconomyModel.distinct("guildId")` — this is reliable regardless of cache state (bot doesn't have `GuildMembers` privileged intent).

In `src/commands/slash/wallet.ts`, add the import:

```typescript
import UserEconomyModel from "../../models/userEconomy.model";
```

Update `handleDaily` to check multi-server milestones after claiming:

```typescript
async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const result = await WalletService.claimDaily(userId);

        // Check multi-server milestones
        const mutualGuildIds = await UserEconomyModel.distinct("guildId", { userId });
        const serverCount = mutualGuildIds.length;
        const serverMilestones = [3, 5, 10] as const;
        for (const threshold of serverMilestones) {
            if (serverCount >= threshold) {
                await WalletService.checkAndAwardMilestone(userId, `multi_server_${threshold}`);
            }
        }

        const embed = formatDailyEmbed(interaction, result, locale);
        await Reply.embedEdit(interaction, embed);
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        if (error instanceof Error && error.message === "DAILY_COOLDOWN") {
            await interaction.editReply(t(locale, "wallet.daily.cooldown"));
            return;
        }
        await interaction.editReply(t(locale, "common.error"));
    }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/wallet.ts
git commit -m "feat(economy): hook wallet multi-server milestones into daily claim"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Full build check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Verify all new files exist**

Check:
- `src/models/userWallet.model.ts`
- `src/services/economy/wallet.service.ts`
- `src/commands/slash/wallet.ts`

- [ ] **Step 3: Verify command auto-discovery**

The command loader in `src/loaders/commands.ts` auto-discovers files in `src/commands/slash/`. No manual registration needed for `/wallet`.

- [ ] **Step 4: Start dev server and verify no runtime errors**

Run: `npm run start:dev`
Expected: Bot starts without errors. Check console for any import/module resolution issues.

- [ ] **Step 5: Manual test in Discord**

Test in development guild:
1. `/wallet view` — should show 0 star, 0 streak, 0/11 milestones
2. `/wallet daily` — should award 1-3 star, show streak 1
3. `/wallet daily` again — should show cooldown message
4. `/wallet history` — should show the daily claim transaction
5. `/wallet view` — should now show updated star balance and streak
