import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";
import WalletService from "./wallet.service";

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

function isConsecutiveUTCDay(prev: Date, now: Date): boolean {
    const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
    const nowDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = nowDay.getTime() - prevDay.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}

async function pray(userId: string, guildId: string, targetId?: string): Promise<PrayResult> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomically claim the cooldown slot — prevents concurrent invocations
    const preUpdate = await UserEconomyModel.findOneAndUpdate(
        {
            userId,
            guildId,
            $or: [{ lastPray: null }, { lastPray: { $exists: false } }, { lastPray: { $lt: startOfToday } }],
        },
        {
            $set: { lastPray: now },
            $setOnInsert: { userId, guildId },
        },
        { upsert: true, returnDocument: "before" }
    );

    // If preUpdate is null, it was an upsert (new doc) OR the filter didn't match.
    // Check if doc exists with lastPray >= startOfToday (cooldown active).
    if (!preUpdate) {
        const existing = await UserEconomyModel.findOne({ userId, guildId });
        if (existing && existing.lastPray && existing.lastPray >= startOfToday) {
            throw new Error("PRAY_COOLDOWN");
        }
    }

    // Use pre-update doc for streak calculation (defaults for new users)
    const prevPrayStreak = preUpdate?.prayStreak ?? 0;
    const prevLastStreakDate = preUpdate?.lastStreakDate ?? null;

    const isTargeted = targetId !== undefined;

    // Calculate rewards
    const userCoin = isTargeted ? randomInRange(100, 200) : randomInRange(50, 150);
    const userReward: Reward = { coin: userCoin, gem: 0 };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(80, 150), gem: 0 };
        // 5% gem chance for targeted pray
        if (Math.random() < 0.05) {
            userReward.gem = 1;
        }
    }

    // Calculate streak
    let newStreak = 1;
    if (prevLastStreakDate && isConsecutiveUTCDay(prevLastStreakDate, now)) {
        newStreak = prevPrayStreak + 1;
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

    // Check global wallet pray streak milestones
    const prayStreakMilestones = [7, 14, 30] as const;
    for (const threshold of prayStreakMilestones) {
        if (newStreak >= threshold) {
            await WalletService.checkAndAwardMilestone(userId, `pray_streak_${threshold}`);
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

    // Update streak (lastPray already set atomically above)
    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { prayStreak: newStreak, lastStreakDate: now } }
    );

    return {
        userReward,
        targetReward,
        streakInfo: { streak: newStreak, milestoneHit },
        targetId,
    };
}

async function curse(userId: string, guildId: string, targetId?: string): Promise<CurseResult> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomically claim the cooldown slot — prevents concurrent invocations
    const preUpdate = await UserEconomyModel.findOneAndUpdate(
        {
            userId,
            guildId,
            $or: [{ lastCurse: null }, { lastCurse: { $exists: false } }, { lastCurse: { $lt: startOfToday } }],
        },
        {
            $set: { lastCurse: now },
            $setOnInsert: { userId, guildId },
        },
        { upsert: true, returnDocument: "before" }
    );

    // If preUpdate is null, check if cooldown is active (doc exists with lastCurse >= startOfToday)
    if (!preUpdate) {
        const existing = await UserEconomyModel.findOne({ userId, guildId });
        if (existing && existing.lastCurse && existing.lastCurse >= startOfToday) {
            throw new Error("CURSE_COOLDOWN");
        }
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

    return { userReward, targetReward, targetId };
}

const PrayService = { pray, curse };

export default PrayService;
