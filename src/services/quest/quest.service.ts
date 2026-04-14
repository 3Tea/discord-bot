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

async function getOrCreateToday(userId: string): Promise<IUserQuest> {
    const date = getTodayDateKey();

    // Check DB for existing record (single query, no misleading cache-then-DB pattern)
    const existing = await UserQuestModel.findOne({ userId, date });
    if (existing) return existing;

    const templates = generateDailyQuests(userId, date);
    const quests: IQuestProgress[] = templates.map((t) => ({
        questId: t.id,
        progress: 0,
        target: t.target,
        completed: false,
        rewardPaid: false,
    }));

    const prevRecords = await UserQuestModel.find({ userId }).sort({ date: -1 }).limit(1).lean();
    const prev = prevRecords[0];
    let questStreak = 0;
    let lastQuestDate: string | null = null;

    if (prev) {
        questStreak = prev.questStreak ?? 0;
        lastQuestDate = prev.lastQuestDate ?? null;
    }

    let doc;
    try {
        doc = await UserQuestModel.create({
            userId,
            date,
            quests,
            claimed: false,
            questStreak,
            lastQuestDate,
        });
    } catch (error) {
        // Handle race condition: concurrent first access creates duplicate key
        if (error instanceof Error && "code" in error && (error as Record<string, unknown>).code === 11000) {
            const existing = await UserQuestModel.findOne({ userId, date });
            if (existing) return existing;
        }
        throw error;
    }

    await redis.setJson(cacheKey(userId, date), doc.quests, secondsUntilUTCMidnight());
    return doc;
}

export interface TrackResult {
    questCompleted?: { name: string; reward: number };
    allComplete?: boolean;
}

async function trackProgress(userId: string, guildId: string, trigger: string): Promise<TrackResult | null> {
    const doc = await getOrCreateToday(userId);
    const date = getTodayDateKey();

    const questEntry = doc.quests.find((q) => {
        if (q.completed) return false;
        const template = getQuestTemplate(q.questId);
        if (!template) return false;
        return template.triggers.includes(trigger);
    });

    if (!questEntry) return null;

    const template = getQuestTemplate(questEntry.questId)!;

    questEntry.progress = Math.min(questEntry.progress + 1, questEntry.target);

    let questCompleted: TrackResult["questCompleted"];
    if (questEntry.progress >= questEntry.target && !questEntry.completed) {
        questEntry.completed = true;

        const tier = await PremiumService.getTier(userId);
        const coinReward = getQuestCoinReward(template.difficulty, tier);
        await CurrencyService.addCoin(userId, guildId, coinReward, "quest_reward", {
            questId: questEntry.questId,
            difficulty: template.difficulty,
        });
        questEntry.rewardPaid = true;

        questCompleted = { name: template.nameKey, reward: coinReward };
    }

    await UserQuestModel.updateOne({ userId, date }, { $set: { quests: doc.quests } });
    await redis.setJson(cacheKey(userId, date), doc.quests, secondsUntilUTCMidnight());

    const allComplete = doc.quests.every((q) => q.completed);

    return {
        questCompleted,
        allComplete: allComplete && !doc.claimed ? true : undefined,
    };
}

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

    const starReward = getQuestStarReward(tier);
    await WalletService.addStar(userId, starReward, "quest_complete", { date });

    let newStreak = 1;
    if (doc.lastQuestDate && isConsecutiveDate(doc.lastQuestDate, date)) {
        newStreak = doc.questStreak + 1;
    }

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

    await UserQuestModel.updateOne(
        { userId, date },
        { $set: { claimed: true, questStreak: newStreak, lastQuestDate: date } }
    );

    await redis.deleteKey(cacheKey(userId, date));

    return {
        success: true,
        starReward,
        streakBonus: streakBonus > 0 ? streakBonus : undefined,
        streakDays: streakBonus > 0 ? newStreak : undefined,
    };
}

export default { getOrCreateToday, trackProgress, claim };
