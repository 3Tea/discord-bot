"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userQuest_model_1 = __importDefault(require("../../models/userQuest.model"));
const currency_service_1 = __importDefault(require("../economy/currency.service"));
const wallet_service_1 = __importDefault(require("../economy/wallet.service"));
const premium_service_1 = __importDefault(require("../premium/premium.service"));
const index_1 = __importDefault(require("../../connector/redis/index"));
const utc_1 = require("../../util/date/utc");
const quest_config_1 = require("./quest.config");
function cacheKey(userId, date) {
    return `quest:${userId}:${date}`;
}
function isConsecutiveDate(prev, current) {
    const prevDate = new Date(prev + "T00:00:00Z");
    const currDate = new Date(current + "T00:00:00Z");
    const diffMs = currDate.getTime() - prevDate.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}
async function getOrCreateToday(userId) {
    const date = (0, quest_config_1.getTodayDateKey)();
    // Check DB for existing record (single query, no misleading cache-then-DB pattern)
    const existing = await userQuest_model_1.default.findOne({ userId, date });
    if (existing)
        return existing;
    const templates = (0, quest_config_1.generateDailyQuests)(userId, date);
    const quests = templates.map((t) => ({
        questId: t.id,
        progress: 0,
        target: t.target,
        completed: false,
        rewardPaid: false,
    }));
    const prevRecords = await userQuest_model_1.default.find({ userId }).sort({ date: -1 }).limit(1).lean();
    const prev = prevRecords[0];
    let questStreak = 0;
    let lastQuestDate = null;
    if (prev) {
        questStreak = prev.questStreak ?? 0;
        lastQuestDate = prev.lastQuestDate ?? null;
    }
    let doc;
    try {
        doc = await userQuest_model_1.default.create({
            userId,
            date,
            quests,
            claimed: false,
            questStreak,
            lastQuestDate,
        });
    }
    catch (error) {
        // Handle race condition: concurrent first access creates duplicate key
        if (error instanceof Error && "code" in error && error.code === 11000) {
            const existing = await userQuest_model_1.default.findOne({ userId, date });
            if (existing)
                return existing;
        }
        throw error;
    }
    await index_1.default.setJson(cacheKey(userId, date), doc.quests, (0, utc_1.secondsUntilUTCMidnight)());
    return doc;
}
async function trackProgress(userId, guildId, trigger) {
    const doc = await getOrCreateToday(userId);
    const date = (0, quest_config_1.getTodayDateKey)();
    const questEntry = doc.quests.find((q) => {
        if (q.completed)
            return false;
        const template = (0, quest_config_1.getQuestTemplate)(q.questId);
        if (!template)
            return false;
        return template.triggers.includes(trigger);
    });
    if (!questEntry)
        return null;
    const template = (0, quest_config_1.getQuestTemplate)(questEntry.questId);
    questEntry.progress = Math.min(questEntry.progress + 1, questEntry.target);
    let questCompleted;
    if (questEntry.progress >= questEntry.target && !questEntry.completed) {
        questEntry.completed = true;
        const tier = await premium_service_1.default.getTier(userId);
        const coinReward = (0, quest_config_1.getQuestCoinReward)(template.difficulty, tier);
        await currency_service_1.default.addCoin(userId, guildId, coinReward, "quest_reward", {
            questId: questEntry.questId,
            difficulty: template.difficulty,
        });
        questEntry.rewardPaid = true;
        questCompleted = { name: template.nameKey, reward: coinReward };
    }
    await userQuest_model_1.default.updateOne({ userId, date }, { $set: { quests: doc.quests } });
    await index_1.default.setJson(cacheKey(userId, date), doc.quests, (0, utc_1.secondsUntilUTCMidnight)());
    const allComplete = doc.quests.every((q) => q.completed);
    return {
        questCompleted,
        allComplete: allComplete && !doc.claimed ? true : undefined,
    };
}
async function claim(userId) {
    const doc = await getOrCreateToday(userId);
    const date = (0, quest_config_1.getTodayDateKey)();
    const completedCount = doc.quests.filter((q) => q.completed).length;
    if (completedCount < 3) {
        return { success: false, notComplete: true, completedCount };
    }
    if (doc.claimed) {
        return { success: false, alreadyClaimed: true };
    }
    const tier = await premium_service_1.default.getTier(userId);
    const starReward = (0, quest_config_1.getQuestStarReward)(tier);
    await wallet_service_1.default.addStar(userId, starReward, "quest_complete", { date });
    let newStreak = 1;
    if (doc.lastQuestDate && isConsecutiveDate(doc.lastQuestDate, date)) {
        newStreak = doc.questStreak + 1;
    }
    let streakBonus = 0;
    for (const milestone of quest_config_1.QUEST_STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            streakBonus = milestone.rewards[tier ?? "free"];
            await wallet_service_1.default.addStar(userId, streakBonus, "quest_streak", {
                date,
                streakDays: milestone.days,
            });
            break;
        }
    }
    await userQuest_model_1.default.updateOne({ userId, date }, { $set: { claimed: true, questStreak: newStreak, lastQuestDate: date } });
    await index_1.default.deleteKey(cacheKey(userId, date));
    return {
        success: true,
        starReward,
        streakBonus: streakBonus > 0 ? streakBonus : undefined,
        streakDays: streakBonus > 0 ? newStreak : undefined,
    };
}
exports.default = { getOrCreateToday, trackProgress, claim };
