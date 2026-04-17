"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUserStats = fetchUserStats;
exports.checkAndUnlock = checkAndUnlock;
exports.getUnlockedCount = getUnlockedCount;
exports.getByCategory = getByCategory;
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const userWallet_model_1 = __importDefault(require("../../models/userWallet.model"));
const userQuest_model_1 = __importDefault(require("../../models/userQuest.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const userAchievement_model_1 = __importDefault(require("../../models/userAchievement.model"));
const currency_service_1 = __importDefault(require("../economy/currency.service"));
const wallet_service_1 = __importDefault(require("../economy/wallet.service"));
const index_1 = __importDefault(require("../../connector/redis/index"));
const achievement_config_1 = require("./achievement.config");
const logger_mixed_1 = require("../../util/log/logger.mixed");
// ── Cache keys ───────────────────────────────────────────────────────────────
const STATS_CACHE_TTL = 60;
const statsKey = (guildId, userId) => `achievement_stats:${guildId}:${userId}`;
const unlockedKey = (guildId, userId) => `achievement_unlocked:${guildId}:${userId}`;
// ── Transaction types tracked for count aggregation ─────────────────────────
const COUNTED_TYPES = ["pray", "gambling", "gift", "rob", "work", "fish"];
// ── 1. fetchUserStats ────────────────────────────────────────────────────────
async function fetchUserStats(userId, guildId) {
    const cacheKey = statsKey(guildId, userId);
    const cached = (await index_1.default.getJson(cacheKey));
    if (cached)
        return cached;
    const [memberXP, userEconomy, userWallet, latestQuest, typeCounts] = await Promise.all([
        memberXP_model_1.default.findOne({ guildId, userId }).lean(),
        userEconomy_model_1.default.findOne({ guildId, userId }).lean(),
        userWallet_model_1.default.findOne({ userId }).lean(),
        userQuest_model_1.default.findOne({ userId }).sort({ date: -1 }).lean(),
        transaction_model_1.default.aggregate([
            { $match: { userId, guildId, type: { $in: [...COUNTED_TYPES] } } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
    ]);
    const typeMap = new Map(typeCounts.map((tc) => [tc._id, tc.count]));
    const stats = {
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
    await index_1.default.setJson(cacheKey, stats, STATS_CACHE_TTL);
    return stats;
}
// ── 2. checkAndUnlock ────────────────────────────────────────────────────────
async function checkAndUnlock(userId, guildId) {
    // Step 1: Fetch stats (uses cache if available)
    const stats = await fetchUserStats(userId, guildId);
    // Step 2: Fetch already-unlocked achievement IDs (cache-first)
    const cachedUnlocked = await index_1.default.getJson(unlockedKey(guildId, userId));
    let unlockedMap;
    if (cachedUnlocked) {
        unlockedMap = new Map(Object.entries(cachedUnlocked).map(([k, v]) => [k, new Date(v)]));
    }
    else {
        const unlockedDocs = await userAchievement_model_1.default.find({ userId, guildId })
            .select("achievementId unlockedAt")
            .lean();
        unlockedMap = new Map(unlockedDocs.map((doc) => [doc.achievementId, doc.unlockedAt]));
        await index_1.default.setJson(unlockedKey(guildId, userId), Object.fromEntries(unlockedMap), 60);
    }
    // Step 3: Find newly qualifying achievements
    const newUnlockDefs = [];
    for (const def of achievement_config_1.ACHIEVEMENTS) {
        if (!unlockedMap.has(def.id) && def.condition(stats)) {
            newUnlockDefs.push(def);
        }
    }
    // Step 4: Persist new unlocks (upsert to avoid duplicates in race conditions)
    const actuallyUnlockedDefs = [];
    if (newUnlockDefs.length > 0) {
        const now = new Date();
        const bulkResult = await userAchievement_model_1.default.bulkWrite(newUnlockDefs.map((def) => ({
            updateOne: {
                filter: { userId, guildId, achievementId: def.id },
                update: {
                    $setOnInsert: {
                        userId,
                        guildId,
                        achievementId: def.id,
                        unlockedAt: now,
                        rewardPaid: true,
                    },
                },
                upsert: true,
            },
        })), { ordered: false });
        // Build set of achievement IDs that were actually inserted (not already present)
        const actuallyInserted = new Set();
        if (bulkResult.upsertedCount > 0) {
            for (let i = 0; i < newUnlockDefs.length; i++) {
                if (bulkResult.upsertedIds[i] !== undefined) {
                    actuallyInserted.add(newUnlockDefs[i].id);
                }
            }
        }
        // Step 5: Pay rewards only for achievements actually inserted this run
        for (const def of newUnlockDefs) {
            if (!actuallyInserted.has(def.id))
                continue;
            actuallyUnlockedDefs.push(def);
            const meta = {
                achievementId: def.id,
                achievementName: def.nameKey,
            };
            try {
                const rewardPromises = [];
                if (def.reward.coin && def.reward.coin > 0) {
                    rewardPromises.push(currency_service_1.default.addCoin(userId, guildId, def.reward.coin, "achievement_reward", meta));
                }
                if (def.reward.gem && def.reward.gem > 0) {
                    rewardPromises.push(currency_service_1.default.addGem(userId, guildId, def.reward.gem, "achievement_reward", meta));
                }
                if (def.reward.star && def.reward.star > 0) {
                    rewardPromises.push(wallet_service_1.default.addStar(userId, def.reward.star, "achievement_reward", meta));
                }
                await Promise.all(rewardPromises);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger_mixed_1.logger.error(`Achievement reward payment failed for ${def.id} (user=${userId}): ${message}`);
            }
            // Register the new unlock in the local map for accurate status building below
            unlockedMap.set(def.id, now);
        }
        // Step 6: Invalidate both caches after unlocks
        await Promise.all([index_1.default.deleteKey(statsKey(guildId, userId)), index_1.default.deleteKey(unlockedKey(guildId, userId))]);
    }
    // Step 7: Build full status list
    const all = achievement_config_1.ACHIEVEMENTS.map((def) => {
        const unlockedAt = unlockedMap.get(def.id);
        if (unlockedAt) {
            return { def, unlocked: true, unlockedAt };
        }
        const progress = def.progress ? def.progress(stats) : undefined;
        return { def, unlocked: false, progress };
    });
    return { all, newUnlocks: actuallyUnlockedDefs, stats };
}
// ── 3. getUnlockedCount ──────────────────────────────────────────────────────
async function getUnlockedCount(userId, guildId) {
    const unlocked = await userAchievement_model_1.default.countDocuments({ userId, guildId });
    return { unlocked, total: achievement_config_1.ACHIEVEMENTS.length };
}
// ── 4. getByCategory ────────────────────────────────────────────────────────
function getByCategory(statuses) {
    const map = new Map(achievement_config_1.CATEGORY_ORDER.map((cat) => [cat, []]));
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
exports.default = AchievementService;
