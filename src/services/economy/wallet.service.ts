import UserWalletModel, { IUserWallet } from "../../models/userWallet.model";
import TransactionModel, { TransactionType } from "../../models/transaction.model";
import { getTierConfig } from "../premium/premium.config";

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

export interface DailyClaimResult {
    baseReward: number;
    streakBonus: number;
    premiumBonus: number;
    streak: number;
    milestoneHit: { days: number; bonus: number } | null;
}

// --- UTC date helpers ---

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

// --- Daily streak milestones ---

const DAILY_STREAK_MILESTONES = [
    { days: 3, bonus: 2 },
    { days: 7, bonus: 5 },
    { days: 14, bonus: 10 },
    { days: 30, bonus: 20 },
] as const;

// --- Achievement milestones ---

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

/** Number of achievement milestone definitions in `MILESTONES` (for UI caps / progress). */
export const GLOBAL_WALLET_MILESTONE_COUNT = Object.keys(MILESTONES).length;

export function getMilestoneCount(): number {
    return GLOBAL_WALLET_MILESTONE_COUNT;
}

// --- Internal helpers ---

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

// --- Public API ---

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
    if (amount <= 0) throw new Error("addStar amount must be positive");
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
    if (amount <= 0) throw new Error("deductStar amount must be positive");
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

async function claimDaily(userId: string): Promise<DailyClaimResult> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomic cooldown check: only claim if lastDaily is null or before today UTC
    const wallet = await UserWalletModel.findOneAndUpdate(
        {
            userId,
            $or: [{ lastDaily: null }, { lastDaily: { $lt: startOfToday } }],
        },
        { $set: { lastDaily: now } },
        { new: true }
    );

    if (!wallet) {
        // Either wallet doesn't exist or cooldown active
        const existing = await getOrCreate(userId);
        if (existing.lastDaily && isSameUTCDay(existing.lastDaily, now)) {
            throw new Error("DAILY_COOLDOWN");
        }
        // Wallet didn't exist — create and retry
        return claimDaily(userId);
    }

    // Calculate streak
    let newStreak = 1;
    if (wallet.lastStreakDate && isConsecutiveUTCDay(wallet.lastStreakDate, now)) {
        newStreak = wallet.dailyStreak + 1;
    }

    const baseReward = Math.floor(Math.random() * 3) + 1;
    const premiumBonus = getTierConfig(wallet.premiumTier ?? null).dailyBonusStars;

    let milestoneHit: DailyClaimResult["milestoneHit"] = null;
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
    await UserWalletModel.updateOne(
        { userId },
        {
            $inc: { star: totalReward },
            $set: { dailyStreak: newStreak, lastStreakDate: now },
        }
    );

    await logTransaction(userId, "global_daily", totalReward, {
        streak: newStreak,
        base: baseReward,
        streakBonus,
        premiumBonus,
    });

    return { baseReward, streakBonus, premiumBonus, streak: newStreak, milestoneHit };
}

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
        return { awarded: false, star: 0 };
    }

    await logTransaction(userId, "global_milestone", starAmount, { milestone: milestoneKey });
    return { awarded: true, star: starAmount };
}

export default { getBalance, addStar, deductStar, getOrCreate, claimDaily, checkAndAwardMilestone };
