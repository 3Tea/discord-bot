import MemberXPModel from "../../models/memberXP.model";
import UserEconomyModel from "../../models/userEconomy.model";
import UserWalletModel from "../../models/userWallet.model";
import UserQuestModel from "../../models/userQuest.model";
import TransactionModel from "../../models/transaction.model";
import UserAchievementModel from "../../models/userAchievement.model";
import CurrencyService from "../economy/currency.service";
import WalletService from "../economy/wallet.service";
import redis from "../../connector/redis/index";
import {
    ACHIEVEMENTS,
    CATEGORY_ORDER,
    type AchievementCategory,
    type AchievementDef,
    type UserStats,
} from "./achievement.config";
import { logger } from "../../util/log/logger.mixed";

// ── Public interfaces ────────────────────────────────────────────────────────

export interface AchievementStatus {
    def: AchievementDef;
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: { current: number; target: number };
}

export interface CheckResult {
    all: AchievementStatus[];
    newUnlocks: AchievementDef[];
    stats: UserStats;
}

// ── Cache keys ───────────────────────────────────────────────────────────────

const STATS_CACHE_TTL = 60;
const statsKey = (guildId: string, userId: string) => `achievement_stats:${guildId}:${userId}`;
const unlockedKey = (guildId: string, userId: string) => `achievement_unlocked:${guildId}:${userId}`;

// ── Transaction types tracked for count aggregation ─────────────────────────

const COUNTED_TYPES = ["pray", "gambling", "gift", "rob", "work", "fish"] as const;
type CountedType = (typeof COUNTED_TYPES)[number];

interface TypeCount {
    _id: CountedType;
    count: number;
}

// ── 1. fetchUserStats ────────────────────────────────────────────────────────

export async function fetchUserStats(userId: string, guildId: string): Promise<UserStats> {
    const cacheKey = statsKey(guildId, userId);
    const cached = await redis.getJson(cacheKey) as UserStats | null;
    if (cached) return cached;

    const [memberXP, userEconomy, userWallet, latestQuest, typeCounts] = await Promise.all([
        MemberXPModel.findOne({ guildId, userId }).lean(),
        UserEconomyModel.findOne({ guildId, userId }).lean(),
        UserWalletModel.findOne({ userId }).lean(),
        UserQuestModel.findOne({ userId }).sort({ date: -1 }).lean(),
        TransactionModel.aggregate<TypeCount>([
            { $match: { userId, type: { $in: [...COUNTED_TYPES] } } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
    ]);

    const typeMap = new Map<CountedType, number>(
        typeCounts.map((tc) => [tc._id, tc.count])
    );

    const stats: UserStats = {
        // From MemberXP
        level: memberXP?.level ?? 0,
        xp: memberXP?.xp ?? 0,
        messageCount: memberXP?.messageCount ?? 0,
        voiceMinutes: memberXP?.voiceMinutes ?? 0,
        reactionCount: memberXP?.reactionCount ?? 0,
        // From UserEconomy
        coin: userEconomy?.coin ?? 0,
        gem: userEconomy?.gem ?? 0,
        prayStreak: userEconomy?.prayStreak ?? 0,
        mineDepth: userEconomy?.mineDepth ?? 1,
        mineCheckpoint: userEconomy?.mineCheckpoint ?? 1,
        dungeonDepth: userEconomy?.dungeonDepth ?? 1,
        dungeonCheckpoint: userEconomy?.dungeonCheckpoint ?? 1,
        // From UserWallet
        star: userWallet?.star ?? 0,
        // From UserQuest
        questStreak: latestQuest?.questStreak ?? 0,
        // From Transaction aggregation
        totalPrayCount: typeMap.get("pray") ?? 0,
        totalGambleCount: typeMap.get("gambling") ?? 0,
        totalGiftCount: typeMap.get("gift") ?? 0,
        totalRobCount: typeMap.get("rob") ?? 0,
        totalWorkCount: typeMap.get("work") ?? 0,
        totalFishCount: typeMap.get("fish") ?? 0,
    };

    await redis.setJson(cacheKey, stats, STATS_CACHE_TTL);
    return stats;
}

// ── 2. checkAndUnlock ────────────────────────────────────────────────────────

export async function checkAndUnlock(userId: string, guildId: string): Promise<CheckResult> {
    // Step 1: Fetch stats (uses cache if available)
    const stats = await fetchUserStats(userId, guildId);

    // Step 2: Fetch already-unlocked achievement IDs
    const unlockedDocs = await UserAchievementModel
        .find({ userId, guildId })
        .select("achievementId unlockedAt")
        .lean();

    const unlockedMap = new Map<string, Date>(
        unlockedDocs.map((doc) => [doc.achievementId, doc.unlockedAt])
    );

    // Step 3: Find newly qualifying achievements
    const newUnlockDefs: AchievementDef[] = [];
    for (const def of ACHIEVEMENTS) {
        if (!unlockedMap.has(def.id) && def.condition(stats)) {
            newUnlockDefs.push(def);
        }
    }

    // Step 4: Persist new unlocks
    if (newUnlockDefs.length > 0) {
        const now = new Date();
        await UserAchievementModel.insertMany(
            newUnlockDefs.map((def) => ({
                userId,
                guildId,
                achievementId: def.id,
                unlockedAt: now,
                rewardPaid: true,
            })),
            { ordered: false }
        );

        // Step 5: Pay rewards for each new unlock
        for (const def of newUnlockDefs) {
            const meta: Record<string, unknown> = {
                achievementId: def.id,
                achievementName: def.nameKey,
            };
            try {
                const rewardPromises: Promise<unknown>[] = [];

                if (def.reward.coin && def.reward.coin > 0) {
                    rewardPromises.push(
                        CurrencyService.addCoin(userId, guildId, def.reward.coin, "achievement_reward", meta)
                    );
                }
                if (def.reward.gem && def.reward.gem > 0) {
                    rewardPromises.push(
                        CurrencyService.addGem(userId, guildId, def.reward.gem, "achievement_reward", meta)
                    );
                }
                if (def.reward.star && def.reward.star > 0) {
                    rewardPromises.push(
                        WalletService.addStar(userId, def.reward.star, "achievement_reward", meta)
                    );
                }

                await Promise.all(rewardPromises);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Achievement reward payment failed for ${def.id} (user=${userId}): ${message}`);
            }

            // Register the new unlock in the local map for accurate status building below
            unlockedMap.set(def.id, now);
        }

        // Step 6: Invalidate both caches after unlocks
        await Promise.all([
            redis.deleteKey(statsKey(guildId, userId)),
            redis.deleteKey(unlockedKey(guildId, userId)),
        ]);
    }

    // Step 7: Build full status list
    const all: AchievementStatus[] = ACHIEVEMENTS.map((def) => {
        const unlockedAt = unlockedMap.get(def.id);
        if (unlockedAt) {
            return { def, unlocked: true, unlockedAt };
        }
        const progress = def.progress ? def.progress(stats) : undefined;
        return { def, unlocked: false, progress };
    });

    return { all, newUnlocks: newUnlockDefs, stats };
}

// ── 3. getUnlockedCount ──────────────────────────────────────────────────────

export async function getUnlockedCount(
    userId: string,
    guildId: string
): Promise<{ unlocked: number; total: number }> {
    const unlocked = await UserAchievementModel.countDocuments({ userId, guildId });
    return { unlocked, total: ACHIEVEMENTS.length };
}

// ── 4. getByCategory ────────────────────────────────────────────────────────

export function getByCategory(
    statuses: AchievementStatus[]
): Map<AchievementCategory, AchievementStatus[]> {
    const map = new Map<AchievementCategory, AchievementStatus[]>(
        CATEGORY_ORDER.map((cat) => [cat, []])
    );

    for (const status of statuses) {
        const bucket = map.get(status.def.category);
        if (bucket) {
            bucket.push(status);
        }
    }

    return map;
}

// ── Default export (service object pattern) ──────────────────────────────────

const AchievementService = {
    fetchUserStats,
    checkAndUnlock,
    getUnlockedCount,
    getByCategory,
};

export default AchievementService;
