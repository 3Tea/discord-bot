import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";

interface Reward {
    coin: number;
    gem: number;
}

interface StreakInfo {
    streak: number;
    milestoneHit: { days: number; bonusCoin: number; bonusGem: number } | null;
}

export interface PrayResult {
    userReward: Reward;
    targetReward: Reward | null;
    streakInfo: StreakInfo;
    targetId?: string;
}

export interface CurseResult {
    userReward: Reward;
    targetReward: Reward | null;
    targetId?: string;
}

const STREAK_MILESTONES = [
    { days: 3, bonusCoin: 50, bonusGem: 0 },
    { days: 7, bonusCoin: 150, bonusGem: 1 },
    { days: 14, bonusCoin: 300, bonusGem: 2 },
    { days: 30, bonusCoin: 500, bonusGem: 5 },
] as const;

function randomInRange(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

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

function checkCooldown(lastAction: Date | null): boolean {
    if (!lastAction) return false;
    return isSameUTCDay(lastAction, new Date());
}

async function pray(userId: string, guildId: string, targetId?: string): Promise<PrayResult> {
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, new: true }
    );

    if (checkCooldown(eco.lastPray)) {
        throw new Error("PRAY_COOLDOWN");
    }

    const now = new Date();
    const isTargeted = targetId !== undefined;

    // Calculate rewards
    const userCoin = isTargeted ? randomInRange(100, 200) : randomInRange(50, 150);
    let userGem = 0;
    const userReward: Reward = { coin: userCoin, gem: 0 };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(80, 150), gem: 0 };
        // 5% gem chance for targeted pray
        if (Math.random() < 0.05) {
            userGem = 1;
            userReward.gem = 1;
        }
    }

    // Calculate streak
    let newStreak = 1;
    if (eco.lastStreakDate && isConsecutiveUTCDay(eco.lastStreakDate, now)) {
        newStreak = eco.prayStreak + 1;
    }

    // Check milestone
    let milestoneHit: StreakInfo["milestoneHit"] = null;
    for (const milestone of STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonusCoin: milestone.bonusCoin, bonusGem: milestone.bonusGem };
            userReward.coin += milestone.bonusCoin;
            userReward.gem += milestone.bonusGem;
            break;
        }
    }

    // Apply rewards
    await CurrencyService.addCoin(userId, guildId, userReward.coin, "pray", { targetId });
    if (userReward.gem > 0) {
        await CurrencyService.addGem(userId, guildId, userReward.gem, "pray", { targetId });
    }

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "pray", { fromUserId: userId });
    }

    // Update pray state
    await UserEconomyModel.updateOne(
        { userId, guildId },
        {
            $set: {
                lastPray: now,
                prayStreak: newStreak,
                lastStreakDate: now,
            },
        }
    );

    return {
        userReward,
        targetReward,
        streakInfo: { streak: newStreak, milestoneHit },
        targetId,
    };
}

async function curse(userId: string, guildId: string, targetId?: string): Promise<CurseResult> {
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, new: true }
    );

    if (checkCooldown(eco.lastCurse)) {
        throw new Error("CURSE_COOLDOWN");
    }

    const isTargeted = targetId !== undefined;

    const userReward: Reward = {
        coin: isTargeted ? randomInRange(40, 100) : randomInRange(20, 80),
        gem: 0,
    };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(30, 70), gem: 0 };
    }

    // Apply rewards
    await CurrencyService.addCoin(userId, guildId, userReward.coin, "curse", { targetId });

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "curse", { fromUserId: userId });
    }

    // Update curse cooldown (no streak for curse)
    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { lastCurse: new Date() } }
    );

    return { userReward, targetReward, targetId };
}

const PrayService = { pray, curse };

export default PrayService;
