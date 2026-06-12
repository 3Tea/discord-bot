"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const random_1 = require("../../util/math/random");
const utc_1 = require("../../util/date/utc");
const currency_service_1 = __importDefault(require("./currency.service"));
const wallet_service_1 = __importDefault(require("./wallet.service"));
const STREAK_MILESTONES = [
    { days: 3, bonusCoin: 50, bonusGem: 0 },
    { days: 7, bonusCoin: 150, bonusGem: 1 },
    { days: 14, bonusCoin: 300, bonusGem: 2 },
    { days: 30, bonusCoin: 500, bonusGem: 5 },
];
async function pray(userId, guildId, targetId) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // Atomically claim the cooldown slot — prevents concurrent invocations
    let preUpdate;
    try {
        preUpdate = await userEconomy_model_1.default.findOneAndUpdate({
            userId,
            guildId,
            $or: [{ lastPray: null }, { lastPray: { $exists: false } }, { lastPray: { $lt: startOfToday } }],
        }, {
            $set: { lastPray: now },
            $setOnInsert: { userId, guildId },
        }, { upsert: true, returnDocument: "before" });
    }
    catch (error) {
        if (error instanceof mongodb_1.MongoServerError && error.code === 11000) {
            throw new Error("PRAY_COOLDOWN");
        }
        throw error;
    }
    // If preUpdate is null, it was an upsert (new doc) OR the filter didn't match.
    // Check if doc exists with lastPray >= startOfToday (cooldown active).
    if (!preUpdate) {
        const existing = await userEconomy_model_1.default.findOne({ userId, guildId });
        if (existing && existing.lastPray && existing.lastPray >= startOfToday) {
            throw new Error("PRAY_COOLDOWN");
        }
    }
    // Use pre-update doc for streak calculation (defaults for new users)
    const prevPrayStreak = preUpdate?.prayStreak ?? 0;
    const prevLastStreakDate = preUpdate?.lastStreakDate ?? null;
    const isTargeted = targetId !== undefined;
    // Calculate rewards
    const userCoin = isTargeted ? (0, random_1.randomInRange)(100, 200) : (0, random_1.randomInRange)(50, 150);
    const userReward = { coin: userCoin, gem: 0 };
    let targetReward = null;
    if (isTargeted) {
        targetReward = { coin: (0, random_1.randomInRange)(80, 150), gem: 0 };
        // 5% gem chance for targeted pray
        if (Math.random() < 0.05) {
            userReward.gem = 1;
        }
    }
    // Calculate streak
    let newStreak = 1;
    if (prevLastStreakDate && (0, utc_1.isConsecutiveUTCDay)(prevLastStreakDate, now)) {
        newStreak = prevPrayStreak + 1;
    }
    // Check milestone
    let milestoneHit = null;
    for (const milestone of STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonusCoin: milestone.bonusCoin, bonusGem: milestone.bonusGem };
            userReward.coin += milestone.bonusCoin;
            userReward.gem += milestone.bonusGem;
            break;
        }
    }
    // Check global wallet pray streak milestones
    const prayStreakMilestones = [7, 14, 30];
    for (const threshold of prayStreakMilestones) {
        if (newStreak >= threshold) {
            await wallet_service_1.default.checkAndAwardMilestone(userId, `pray_streak_${threshold}`);
        }
    }
    // Apply rewards
    await currency_service_1.default.addCoin(userId, guildId, userReward.coin, "pray", { targetId });
    if (userReward.gem > 0) {
        await currency_service_1.default.addGem(userId, guildId, userReward.gem, "pray", { targetId });
    }
    if (targetReward && targetId) {
        await currency_service_1.default.addCoin(targetId, guildId, targetReward.coin, "pray", { fromUserId: userId });
    }
    // Update streak (lastPray already set atomically above)
    await userEconomy_model_1.default.updateOne({ userId, guildId }, { $set: { prayStreak: newStreak, lastStreakDate: now } });
    return {
        userReward,
        targetReward,
        streakInfo: { streak: newStreak, milestoneHit },
        targetId,
    };
}
async function curse(userId, guildId, targetId) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // Atomically claim the cooldown slot — prevents concurrent invocations
    let preUpdate;
    try {
        preUpdate = await userEconomy_model_1.default.findOneAndUpdate({
            userId,
            guildId,
            $or: [{ lastCurse: null }, { lastCurse: { $exists: false } }, { lastCurse: { $lt: startOfToday } }],
        }, {
            $set: { lastCurse: now },
            $setOnInsert: { userId, guildId },
        }, { upsert: true, returnDocument: "before" });
    }
    catch (error) {
        if (error instanceof mongodb_1.MongoServerError && error.code === 11000) {
            throw new Error("CURSE_COOLDOWN");
        }
        throw error;
    }
    // If preUpdate is null, check if cooldown is active (doc exists with lastCurse >= startOfToday)
    if (!preUpdate) {
        const existing = await userEconomy_model_1.default.findOne({ userId, guildId });
        if (existing && existing.lastCurse && existing.lastCurse >= startOfToday) {
            throw new Error("CURSE_COOLDOWN");
        }
    }
    const isTargeted = targetId !== undefined;
    const userReward = {
        coin: isTargeted ? (0, random_1.randomInRange)(40, 100) : (0, random_1.randomInRange)(20, 80),
        gem: 0,
    };
    let targetReward = null;
    if (isTargeted) {
        targetReward = { coin: (0, random_1.randomInRange)(30, 70), gem: 0 };
    }
    // Apply rewards
    await currency_service_1.default.addCoin(userId, guildId, userReward.coin, "curse", { targetId });
    if (targetReward && targetId) {
        await currency_service_1.default.addCoin(targetId, guildId, targetReward.coin, "curse", { fromUserId: userId });
    }
    return { userReward, targetReward, targetId };
}
const PrayService = { pray, curse };
exports.default = PrayService;
