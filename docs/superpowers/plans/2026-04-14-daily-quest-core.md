# Daily Quest Core — Implementation Plan (Plan 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the daily quest system core — model, quest pool config, quest service (generate, track, claim), `/quest` command (view + claim), transaction types, and i18n. After this plan, quests can be viewed and claimed, but no commands auto-track progress yet (that's Plan 2).

**Architecture:** Deterministic quest generation from seed (`hash(userId + date)`). Quest progress stored in MongoDB with Redis cache. Service layer with `generateQuests`, `trackProgress`, `claim` API. Coin rewards via `CurrencyService`, star rewards via `WalletService`.

**Tech Stack:** Mongoose, ioredis, Discord.js v14, i18next, crypto (for hash seed)

**Spec:** `docs/superpowers/specs/2026-04-14-daily-quest-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/models/transaction.model.ts` | Add 3 quest transaction types |
| Create | `src/models/userQuest.model.ts` | UserQuest schema |
| Create | `src/services/quest/quest.config.ts` | Quest pool, reward tables, generation logic |
| Create | `src/services/quest/quest.service.ts` | trackProgress, getOrCreateToday, claim |
| Create | `src/commands/slash/quest.ts` | `/quest view` + `/quest claim` |
| Modify | `src/locales/*.json` (15 files) | ~35 i18n keys |

---

### Task 1: Add quest transaction types

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add 3 quest transaction types**

Add to the `TransactionType` union (after `"premium_extend"`):

```typescript
    | "quest_reward"
    | "quest_complete"
    | "quest_streak"
```

Add to the schema `enum` array (after `"premium_extend"`):

```typescript
                "quest_reward",
                "quest_complete",
                "quest_streak",
```

- [ ] **Step 2: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(quest): add quest transaction types"
```

---

### Task 2: Create UserQuest model

**Files:**
- Create: `src/models/userQuest.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/models/userQuest.model.ts

import { Document, model, Schema } from "mongoose";

export interface IQuestProgress {
    questId: string;
    progress: number;
    target: number;
    completed: boolean;
    rewardPaid: boolean;
}

export interface IUserQuest extends Document {
    userId: string;
    date: string;
    quests: IQuestProgress[];
    claimed: boolean;
    questStreak: number;
    lastQuestDate: string | null;
}

const questProgressSchema = new Schema(
    {
        questId: { type: String, required: true },
        progress: { type: Number, default: 0 },
        target: { type: Number, required: true },
        completed: { type: Boolean, default: false },
        rewardPaid: { type: Boolean, default: false },
    },
    { _id: false }
);

const userQuestSchema = new Schema(
    {
        userId: { type: String, required: true },
        date: { type: String, required: true },
        quests: { type: [questProgressSchema], default: [] },
        claimed: { type: Boolean, default: false },
        questStreak: { type: Number, default: 0 },
        lastQuestDate: { type: String, default: null },
    },
    { timestamps: true, collection: "UserQuests" }
);

userQuestSchema.index({ userId: 1, date: 1 }, { unique: true });

export default model<IUserQuest>("UserQuest", userQuestSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/models/userQuest.model.ts
git commit -m "feat(quest): create UserQuest model"
```

---

### Task 3: Create quest config (pool + rewards + generation)

**Files:**
- Create: `src/services/quest/quest.config.ts`

- [ ] **Step 1: Create the quest config file**

```typescript
// src/services/quest/quest.config.ts

import { createHash } from "node:crypto";
import type { PremiumTier } from "../../models/userWallet.model";

export type QuestDifficulty = "easy" | "medium" | "hard";

export interface QuestTemplate {
    id: string;
    difficulty: QuestDifficulty;
    triggers: string[];
    target: number;
    nameKey: string; // i18n key for display name
}

// --- Quest Pool ---

const EASY_QUESTS: QuestTemplate[] = [
    { id: "e_pray", difficulty: "easy", triggers: ["pray_target"], target: 1, nameKey: "quest.name.e_pray" },
    { id: "e_curse", difficulty: "easy", triggers: ["curse_target"], target: 1, nameKey: "quest.name.e_curse" },
    { id: "e_rank", difficulty: "easy", triggers: ["rank"], target: 1, nameKey: "quest.name.e_rank" },
    { id: "e_balance", difficulty: "easy", triggers: ["balance"], target: 1, nameKey: "quest.name.e_balance" },
    { id: "e_wallet", difficulty: "easy", triggers: ["wallet_view"], target: 1, nameKey: "quest.name.e_wallet" },
    { id: "e_daily", difficulty: "easy", triggers: ["wallet_daily"], target: 1, nameKey: "quest.name.e_daily" },
];

const MEDIUM_QUESTS: QuestTemplate[] = [
    { id: "m_work", difficulty: "medium", triggers: ["work"], target: 1, nameKey: "quest.name.m_work" },
    { id: "m_fish", difficulty: "medium", triggers: ["fish"], target: 1, nameKey: "quest.name.m_fish" },
    { id: "m_mine", difficulty: "medium", triggers: ["mine"], target: 1, nameKey: "quest.name.m_mine" },
    { id: "m_gift", difficulty: "medium", triggers: ["gift"], target: 1, nameKey: "quest.name.m_gift" },
    { id: "m_confess", difficulty: "medium", triggers: ["confession"], target: 1, nameKey: "quest.name.m_confess" },
    { id: "m_shop", difficulty: "medium", triggers: ["shop_view"], target: 1, nameKey: "quest.name.m_shop" },
];

const HARD_QUESTS: QuestTemplate[] = [
    { id: "h_dungeon", difficulty: "hard", triggers: ["dungeon"], target: 1, nameKey: "quest.name.h_dungeon" },
    { id: "h_mine2", difficulty: "hard", triggers: ["mine"], target: 2, nameKey: "quest.name.h_mine2" },
    { id: "h_gamble_win", difficulty: "hard", triggers: ["gamble_win"], target: 1, nameKey: "quest.name.h_gamble_win" },
    { id: "h_pray_curse", difficulty: "hard", triggers: ["pray", "curse"], target: 2, nameKey: "quest.name.h_pray_curse" },
    { id: "h_fish2", difficulty: "hard", triggers: ["fish"], target: 2, nameKey: "quest.name.h_fish2" },
    { id: "h_rob_success", difficulty: "hard", triggers: ["rob_success"], target: 1, nameKey: "quest.name.h_rob_success" },
];

// --- Reward Tables ---

interface QuestRewards {
    easy: number;
    medium: number;
    hard: number;
    allComplete: number;
}

export const QUEST_REWARDS: Record<"free" | PremiumTier, QuestRewards> = {
    free: { easy: 10, medium: 20, hard: 35, allComplete: 1 },
    star: { easy: 15, medium: 30, hard: 50, allComplete: 2 },
    galaxy: { easy: 20, medium: 40, hard: 70, allComplete: 3 },
};

interface StreakMilestone {
    days: number;
    rewards: Record<"free" | PremiumTier, number>;
}

export const QUEST_STREAK_MILESTONES: StreakMilestone[] = [
    { days: 3, rewards: { free: 1, star: 2, galaxy: 3 } },
    { days: 7, rewards: { free: 3, star: 5, galaxy: 8 } },
    { days: 14, rewards: { free: 5, star: 8, galaxy: 12 } },
    { days: 30, rewards: { free: 10, star: 15, galaxy: 20 } },
];

// --- Deterministic Generation ---

function seededIndex(seed: string, poolSize: number): number {
    const hash = createHash("sha256").update(seed).digest();
    const num = hash.readUInt32BE(0);
    return num % poolSize;
}

export function generateDailyQuests(userId: string, date: string): QuestTemplate[] {
    const easyIdx = seededIndex(`${userId}:${date}:easy`, EASY_QUESTS.length);
    const medIdx = seededIndex(`${userId}:${date}:medium`, MEDIUM_QUESTS.length);
    const hardIdx = seededIndex(`${userId}:${date}:hard`, HARD_QUESTS.length);

    return [EASY_QUESTS[easyIdx], MEDIUM_QUESTS[medIdx], HARD_QUESTS[hardIdx]];
}

export function getQuestCoinReward(difficulty: QuestDifficulty, tier: PremiumTier | null): number {
    return QUEST_REWARDS[tier ?? "free"][difficulty];
}

export function getQuestStarReward(tier: PremiumTier | null): number {
    return QUEST_REWARDS[tier ?? "free"].allComplete;
}

export function getQuestTemplate(questId: string): QuestTemplate | undefined {
    return [...EASY_QUESTS, ...MEDIUM_QUESTS, ...HARD_QUESTS].find((q) => q.id === questId);
}

export function getTodayDateKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/quest/quest.config.ts
git commit -m "feat(quest): create quest pool config with generation and rewards"
```

---

### Task 4: Create quest service

**Files:**
- Create: `src/services/quest/quest.service.ts`

- [ ] **Step 1: Create the quest service file**

```typescript
// src/services/quest/quest.service.ts

import UserQuestModel, { IUserQuest, IQuestProgress } from "../../models/userQuest.model";
import CurrencyService from "../economy/currency.service";
import WalletService from "../economy/wallet.service";
import PremiumService from "../premium/premium.service";
import redis from "../../connector/redis/index";
import {
    generateDailyQuests,
    getQuestCoinReward,
    getQuestStarReward,
    getQuestTemplate,
    getTodayDateKey,
    QUEST_STREAK_MILESTONES,
} from "./quest.config";
import type { PremiumTier } from "../../models/userWallet.model";

function cacheKey(userId: string, date: string): string {
    return `quest:${userId}:${date}`;
}

function secondsUntilUTCMidnight(): number {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
}

function isConsecutiveDate(prev: string, current: string): boolean {
    const prevDate = new Date(prev + "T00:00:00Z");
    const currDate = new Date(current + "T00:00:00Z");
    const diffMs = currDate.getTime() - prevDate.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}

// --- Get or create today's quest record ---

async function getOrCreateToday(userId: string): Promise<IUserQuest> {
    const date = getTodayDateKey();

    // Redis cache check
    const cached = await redis.getJson(cacheKey(userId, date));
    if (cached) {
        // Rehydrate from cache — find the full DB doc for streak info
        const doc = await UserQuestModel.findOne({ userId, date });
        if (doc) return doc;
    }

    // Check if already exists in DB
    const existing = await UserQuestModel.findOne({ userId, date });
    if (existing) {
        await redis.setJson(cacheKey(userId, date), existing.quests, secondsUntilUTCMidnight());
        return existing;
    }

    // Generate new quests for today
    const templates = generateDailyQuests(userId, date);
    const quests: IQuestProgress[] = templates.map((t) => ({
        questId: t.id,
        progress: 0,
        target: t.target,
        completed: false,
        rewardPaid: false,
    }));

    // Get streak from previous record
    const prevRecords = await UserQuestModel.find({ userId }).sort({ date: -1 }).limit(1).lean();
    const prev = prevRecords[0];
    let questStreak = 0;
    let lastQuestDate: string | null = null;

    if (prev) {
        questStreak = prev.questStreak ?? 0;
        lastQuestDate = prev.lastQuestDate ?? null;
    }

    const doc = await UserQuestModel.create({
        userId,
        date,
        quests,
        claimed: false,
        questStreak,
        lastQuestDate,
    });

    await redis.setJson(cacheKey(userId, date), doc.quests, secondsUntilUTCMidnight());
    return doc;
}

// --- Track progress ---

export interface TrackResult {
    questCompleted?: { name: string; reward: number };
    allComplete?: boolean;
}

async function trackProgress(userId: string, guildId: string, trigger: string): Promise<TrackResult | null> {
    const doc = await getOrCreateToday(userId);
    const date = getTodayDateKey();

    // Find a quest that matches this trigger and is not yet complete
    const questEntry = doc.quests.find((q) => {
        if (q.completed) return false;
        const template = getQuestTemplate(q.questId);
        if (!template) return false;
        return template.triggers.includes(trigger);
    });

    if (!questEntry) return null;

    const template = getQuestTemplate(questEntry.questId)!;

    // Increment progress
    questEntry.progress = Math.min(questEntry.progress + 1, questEntry.target);

    // Check completion
    let questCompleted: TrackResult["questCompleted"];
    if (questEntry.progress >= questEntry.target && !questEntry.completed) {
        questEntry.completed = true;

        // Pay coin reward
        const tier = await PremiumService.getTier(userId);
        const coinReward = getQuestCoinReward(template.difficulty, tier);
        await CurrencyService.addCoin(userId, guildId, coinReward, "quest_reward", {
            questId: questEntry.questId,
            difficulty: template.difficulty,
        });
        questEntry.rewardPaid = true;

        questCompleted = { name: template.nameKey, reward: coinReward };
    }

    // Save to DB + cache
    await UserQuestModel.updateOne({ userId, date }, { $set: { quests: doc.quests } });
    await redis.setJson(cacheKey(userId, date), doc.quests, secondsUntilUTCMidnight());

    const allComplete = doc.quests.every((q) => q.completed);

    return {
        questCompleted,
        allComplete: allComplete && !doc.claimed ? true : undefined,
    };
}

// --- Claim all-3-complete bonus ---

interface ClaimResult {
    success: boolean;
    starReward?: number;
    streakBonus?: number;
    streakDays?: number;
    alreadyClaimed?: boolean;
    notComplete?: boolean;
    completedCount?: number;
}

async function claim(userId: string): Promise<ClaimResult> {
    const doc = await getOrCreateToday(userId);
    const date = getTodayDateKey();

    const completedCount = doc.quests.filter((q) => q.completed).length;

    if (completedCount < 3) {
        return { success: false, notComplete: true, completedCount };
    }

    if (doc.claimed) {
        return { success: false, alreadyClaimed: true };
    }

    const tier = await PremiumService.getTier(userId);

    // Pay star reward
    const starReward = getQuestStarReward(tier);
    await WalletService.addStar(userId, starReward, "quest_complete", { date });

    // Update streak
    let newStreak = 1;
    if (doc.lastQuestDate && isConsecutiveDate(doc.lastQuestDate, date)) {
        newStreak = doc.questStreak + 1;
    }

    // Check streak milestone
    let streakBonus = 0;
    for (const milestone of QUEST_STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            streakBonus = milestone.rewards[tier ?? "free"];
            await WalletService.addStar(userId, streakBonus, "quest_streak", {
                date,
                streakDays: milestone.days,
            });
            break;
        }
    }

    // Update document
    await UserQuestModel.updateOne(
        { userId, date },
        { $set: { claimed: true, questStreak: newStreak, lastQuestDate: date } }
    );

    // Clear cache
    await redis.deleteKey(cacheKey(userId, date));

    return {
        success: true,
        starReward,
        streakBonus: streakBonus > 0 ? streakBonus : undefined,
        streakDays: streakBonus > 0 ? newStreak : undefined,
    };
}

export default { getOrCreateToday, trackProgress, claim };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/quest/quest.service.ts
git commit -m "feat(quest): create quest service with track, claim, and streak logic"
```

---

### Task 5: Create /quest command

**Files:**
- Create: `src/commands/slash/quest.ts`

- [ ] **Step 1: Create the command file**

```typescript
// src/commands/slash/quest.ts

import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import QuestService from "../../services/quest/quest.service";
import { getQuestCoinReward, getQuestTemplate, getTodayDateKey } from "../../services/quest/quest.config";
import PremiumService from "../../services/premium/premium.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

export default {
    data: new SlashCommandBuilder()
        .setName("quest")
        .setDescription("Daily quests — complete tasks for coin and star rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.quest.desc"))
        .addSubcommand((sub) =>
            sub.setName("view").setDescription("View today's quests and progress")
        )
        .addSubcommand((sub) =>
            sub.setName("claim").setDescription("Claim your all-quests-complete bonus")
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommand === "view") {
                await handleView(interaction, locale);
            } else {
                await handleClaim(interaction, locale);
            }
        } catch {
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};

async function handleView(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const userId = interaction.user.id;
    const doc = await QuestService.getOrCreateToday(userId);
    const tier = await PremiumService.getTier(userId);
    const date = getTodayDateKey();

    const lines = doc.quests.map((q) => {
        const template = getQuestTemplate(q.questId);
        if (!template) return "";
        const name = t(locale, template.nameKey);
        const reward = getQuestCoinReward(template.difficulty, tier);
        if (q.completed) {
            return t(locale, "quest.view.complete", {
                name,
                progress: String(q.progress),
                target: String(q.target),
                reward: String(reward),
            });
        }
        return t(locale, "quest.view.incomplete", {
            name,
            progress: String(q.progress),
            target: String(q.target),
            reward: String(reward),
        });
    });

    const completedCount = doc.quests.filter((q) => q.completed).length;
    const streakLine = doc.questStreak > 0
        ? t(locale, "quest.view.streak", { days: String(doc.questStreak) })
        : t(locale, "quest.view.no_streak");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "quest.view.title", { date }))
        .setDescription(lines.join("\n") + `\n\n${t(locale, "quest.view.progress", { done: String(completedCount) })} | ${streakLine}`)
        .setColor(completedCount === 3 ? 0x57f287 : 0xf39c12)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

async function handleClaim(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const userId = interaction.user.id;
    const result = await QuestService.claim(userId);

    if (result.notComplete) {
        await interaction.editReply(
            t(locale, "quest.claim.not_complete", { done: String(result.completedCount ?? 0) })
        );
        return;
    }

    if (result.alreadyClaimed) {
        await interaction.editReply(t(locale, "quest.claim.already"));
        return;
    }

    let description = t(locale, "quest.claim.success", { stars: String(result.starReward) });
    if (result.streakBonus) {
        description += "\n" + t(locale, "quest.claim.streak_bonus", {
            bonus: String(result.streakBonus),
            days: String(result.streakDays),
        });
    }

    const embed = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x57f287)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/slash/quest.ts
git commit -m "feat(quest): add /quest view and /quest claim commands"
```

---

### Task 6: Add i18n keys (15 locales)

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

```json
"quest.view.title": "📋 Daily Quests — {{date}}",
"quest.view.complete": "✅ {{name}} ({{progress}}/{{target}}) — {{reward}} coin ✓",
"quest.view.incomplete": "⬜ {{name}} ({{progress}}/{{target}}) — {{reward}} coin",
"quest.view.progress": "Progress: {{done}}/3",
"quest.view.streak": "Streak: {{days}} days 🔥",
"quest.view.no_streak": "Streak: 0 days",
"quest.claim.success": "Claimed **{{stars}}** star!",
"quest.claim.streak_bonus": "+**{{bonus}}** star streak bonus ({{days}} days)! 🔥",
"quest.claim.not_complete": "Complete all quests first. Progress: {{done}}/3.",
"quest.claim.already": "Already claimed today.",
"quest.notify.complete": "⭐ Quest complete: \"{{name}}\" (+{{reward}} coin)",
"quest.notify.all_done": "🎉 All quests complete! Use `/quest claim` to collect your bonus.",
"quest.name.e_pray": "Pray for someone",
"quest.name.e_curse": "Curse someone",
"quest.name.e_rank": "Check your rank",
"quest.name.e_balance": "Check your balance",
"quest.name.e_wallet": "View wallet",
"quest.name.e_daily": "Claim daily stars",
"quest.name.m_work": "Work a job",
"quest.name.m_fish": "Catch a fish",
"quest.name.m_mine": "Mine for minerals",
"quest.name.m_gift": "Gift coins to someone",
"quest.name.m_confess": "Submit a confession",
"quest.name.m_shop": "Browse the shop",
"quest.name.h_dungeon": "Complete a dungeon run",
"quest.name.h_mine2": "Mine 2 times",
"quest.name.h_gamble_win": "Win a gamble",
"quest.name.h_pray_curse": "Pray and Curse in same day",
"quest.name.h_fish2": "Fish 2 times",
"quest.name.h_rob_success": "Rob someone successfully",
"cmd.quest.desc": "Daily quests — complete tasks for coin and star rewards"
```

- [ ] **Step 2: Add keys to vi.json**

```json
"quest.view.title": "📋 Nhiệm Vụ Hàng Ngày — {{date}}",
"quest.view.complete": "✅ {{name}} ({{progress}}/{{target}}) — {{reward}} coin ✓",
"quest.view.incomplete": "⬜ {{name}} ({{progress}}/{{target}}) — {{reward}} coin",
"quest.view.progress": "Tiến độ: {{done}}/3",
"quest.view.streak": "Streak: {{days}} ngày 🔥",
"quest.view.no_streak": "Streak: 0 ngày",
"quest.claim.success": "Đã nhận **{{stars}}** star!",
"quest.claim.streak_bonus": "+**{{bonus}}** star bonus streak ({{days}} ngày)! 🔥",
"quest.claim.not_complete": "Hoàn thành tất cả nhiệm vụ trước. Tiến độ: {{done}}/3.",
"quest.claim.already": "Đã nhận hôm nay rồi.",
"quest.notify.complete": "⭐ Hoàn thành nhiệm vụ: \"{{name}}\" (+{{reward}} coin)",
"quest.notify.all_done": "🎉 Hoàn thành tất cả nhiệm vụ! Dùng `/quest claim` để nhận thưởng.",
"quest.name.e_pray": "Cầu nguyện cho ai đó",
"quest.name.e_curse": "Nguyền rủa ai đó",
"quest.name.e_rank": "Xem rank card",
"quest.name.e_balance": "Xem số dư",
"quest.name.e_wallet": "Xem ví",
"quest.name.e_daily": "Nhận star hàng ngày",
"quest.name.m_work": "Làm việc",
"quest.name.m_fish": "Câu cá",
"quest.name.m_mine": "Đào khoáng sản",
"quest.name.m_gift": "Tặng coin cho ai đó",
"quest.name.m_confess": "Gửi confession",
"quest.name.m_shop": "Duyệt shop",
"quest.name.h_dungeon": "Hoàn thành 1 lượt dungeon",
"quest.name.h_mine2": "Đào 2 lần",
"quest.name.h_gamble_win": "Thắng cờ bạc",
"quest.name.h_pray_curse": "Cầu nguyện và Nguyền rủa cùng ngày",
"quest.name.h_fish2": "Câu cá 2 lần",
"quest.name.h_rob_success": "Cướp thành công",
"cmd.quest.desc": "Nhiệm vụ hàng ngày — hoàn thành để nhận coin và star"
```

- [ ] **Step 3: Add keys to all other 13 locale files with native translations**

Add the same 31 keys to `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`. Quest name translations should be native.

- [ ] **Step 4: Commit**

```bash
git add src/locales/
git commit -m "feat(quest): add i18n keys for daily quest system (15 locales)"
```

---

### Task 7: Verify build

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual smoke test (if dev available)**

- `/quest view` — should show 3 quests (all ⬜ at 0 progress)
- `/quest claim` — should say "not complete"
- Quests should be deterministic: same user, same day = same quests
