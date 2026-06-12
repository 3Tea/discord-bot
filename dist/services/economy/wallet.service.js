"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_WALLET_MILESTONE_COUNT = exports.InsufficientStarError = void 0;
exports.getMilestoneCount = getMilestoneCount;
const userWallet_model_1 = __importDefault(require("../../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const premium_config_1 = require("../premium/premium.config");
const utc_1 = require("../../util/date/utc");
const GLOBAL_GUILD_ID = "global";
class InsufficientStarError extends Error {
    available;
    required;
    constructor(available, required) {
        super(`Insufficient star: have ${available}, need ${required}`);
        this.available = available;
        this.required = required;
        this.name = "InsufficientStarError";
    }
}
exports.InsufficientStarError = InsufficientStarError;
// --- Daily streak milestones ---
const DAILY_STREAK_MILESTONES = [
    { days: 3, bonus: 2 },
    { days: 7, bonus: 5 },
    { days: 14, bonus: 10 },
    { days: 30, bonus: 20 },
];
// --- Achievement milestones ---
const MILESTONES = {
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
/** Number of achievement milestone definitions in `MILESTONES` (for UI caps / progress). */
exports.GLOBAL_WALLET_MILESTONE_COUNT = Object.keys(MILESTONES).length;
function getMilestoneCount() {
    return exports.GLOBAL_WALLET_MILESTONE_COUNT;
}
// --- Internal helpers ---
async function logTransaction(userId, type, starDelta, metadata = {}) {
    await transaction_model_1.default.create({
        userId,
        guildId: GLOBAL_GUILD_ID,
        type,
        coinDelta: starDelta,
        gemDelta: 0,
        metadata,
    });
}
async function getOrCreate(userId) {
    const wallet = await userWallet_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId, star: 0, dailyStreak: 0, claimedMilestones: [] } }, { upsert: true, returnDocument: "after" });
    return wallet;
}
// --- Public API ---
async function getBalance(userId) {
    const wallet = await getOrCreate(userId);
    return {
        star: wallet.star,
        dailyStreak: wallet.dailyStreak,
        lastDaily: wallet.lastDaily,
        claimedMilestones: wallet.claimedMilestones,
    };
}
async function addStar(userId, amount, reason, metadata = {}) {
    if (amount <= 0)
        throw new Error("addStar amount must be positive");
    const wallet = await userWallet_model_1.default.findOneAndUpdate({ userId }, {
        $inc: { star: amount },
        $setOnInsert: { userId, dailyStreak: 0, claimedMilestones: [] },
    }, { upsert: true, returnDocument: "after" });
    await logTransaction(userId, reason, amount, metadata);
    return wallet;
}
async function deductStar(userId, amount, reason, metadata = {}) {
    if (amount <= 0)
        throw new Error("deductStar amount must be positive");
    const wallet = await userWallet_model_1.default.findOneAndUpdate({ userId, star: { $gte: amount } }, { $inc: { star: -amount } }, { returnDocument: "after" });
    if (!wallet) {
        const current = await getOrCreate(userId);
        throw new InsufficientStarError(current.star, amount);
    }
    await logTransaction(userId, reason, -amount, metadata);
    return wallet;
}
async function claimDaily(userId) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // Atomic cooldown check: only claim if lastDaily is null or before today UTC
    const wallet = await userWallet_model_1.default.findOneAndUpdate({
        userId,
        $or: [{ lastDaily: null }, { lastDaily: { $lt: startOfToday } }],
    }, { $set: { lastDaily: now } }, { returnDocument: "after" });
    if (!wallet) {
        // Either wallet doesn't exist or cooldown active
        const existing = await getOrCreate(userId);
        if (existing.lastDaily && (0, utc_1.isSameUTCDay)(existing.lastDaily, now)) {
            throw new Error("DAILY_COOLDOWN");
        }
        // Wallet didn't exist — create and retry
        return claimDaily(userId);
    }
    // Calculate streak
    let newStreak = 1;
    if (wallet.lastStreakDate && (0, utc_1.isConsecutiveUTCDay)(wallet.lastStreakDate, now)) {
        newStreak = wallet.dailyStreak + 1;
    }
    const baseReward = Math.floor(Math.random() * 3) + 1;
    const premiumBonus = (0, premium_config_1.getTierConfig)(wallet.premiumTier ?? null).dailyBonusStars;
    let milestoneHit = null;
    let streakBonus = 0;
    for (const milestone of DAILY_STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonus: milestone.bonus };
            streakBonus = milestone.bonus;
            break;
        }
    }
    const totalReward = baseReward + streakBonus + premiumBonus;
    // Update streak and star atomically
    await userWallet_model_1.default.updateOne({ userId }, {
        $inc: { star: totalReward },
        $set: { dailyStreak: newStreak, lastStreakDate: now },
    });
    await logTransaction(userId, "global_daily", totalReward, {
        streak: newStreak,
        base: baseReward,
        streakBonus,
        premiumBonus,
    });
    return { baseReward, streakBonus, premiumBonus, streak: newStreak, milestoneHit };
}
async function checkAndAwardMilestone(userId, milestoneKey) {
    const starAmount = MILESTONES[milestoneKey];
    if (!starAmount)
        return { awarded: false, star: 0 };
    // Ensure wallet exists first
    await getOrCreate(userId);
    // Atomic: only update if milestone not already claimed
    const result = await userWallet_model_1.default.findOneAndUpdate({ userId, claimedMilestones: { $ne: milestoneKey } }, {
        $inc: { star: starAmount },
        $addToSet: { claimedMilestones: milestoneKey },
    }, { returnDocument: "after" });
    if (!result) {
        return { awarded: false, star: 0 };
    }
    await logTransaction(userId, "global_milestone", starAmount, { milestone: milestoneKey });
    return { awarded: true, star: starAmount };
}
exports.default = { getBalance, addStar, deductStar, getOrCreate, claimDaily, checkAndAwardMilestone };
