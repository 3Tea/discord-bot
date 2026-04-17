"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateRewardConfigCache = invalidateRewardConfigCache;
exports.rewardLevelUp = rewardLevelUp;
exports.tickVoiceCoinReward = tickVoiceCoinReward;
exports.cleanupVoiceCoinCounter = cleanupVoiceCoinCounter;
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const guildEconomyRewardConfig_model_1 = __importDefault(require("../../models/guildEconomyRewardConfig.model"));
const logger_mixed_1 = require("../log/logger.mixed");
const CONFIG_CACHE_TTL = 300; // 5 minutes
async function getRewardConfig(guildId) {
    const cacheKey = `economy_reward_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const config = await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
    await redis_1.default.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
async function invalidateRewardConfigCache(guildId) {
    await redis_1.default.deleteKey(`economy_reward_config:${guildId}`);
}
async function rewardLevelUp(userId, guildId, newLevel) {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled)
            return { coinReward: 0, gemReward: 0 };
        const coinReward = config.levelUpCoinBase + newLevel * config.levelUpCoinPerLevel;
        await currency_service_1.default.addCoin(userId, guildId, coinReward, "level_up", {
            level: newLevel,
        });
        // Check gem milestone — when loaded from Redis cache, gemMilestones is a plain object
        const milestonesRaw = config.gemMilestones;
        const milestones = milestonesRaw instanceof Map
            ? milestonesRaw
            : new Map(Object.entries(milestonesRaw ?? {}));
        const gemReward = milestones.get(String(newLevel)) ?? 0;
        if (gemReward > 0) {
            await currency_service_1.default.addGem(userId, guildId, gemReward, "level_up", {
                level: newLevel,
            });
        }
        return { coinReward, gemReward };
    }
    catch (error) {
        logger_mixed_1.logger.error(`[activityReward:levelUp] ${error instanceof Error ? error.message : "Unknown error"}`);
        return { coinReward: 0, gemReward: 0 };
    }
}
async function tickVoiceCoinReward(userId, guildId) {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled || config.voiceCoinReward <= 0)
            return;
        const key = `voice_coin:${guildId}:${userId}`;
        const current = (await redis_1.default.getJson(key)) ?? 0;
        const count = current + 1;
        if (count >= config.voiceCoinInterval) {
            await currency_service_1.default.addCoin(userId, guildId, config.voiceCoinReward, "voice_reward", {
                minutes: config.voiceCoinInterval,
            });
            await redis_1.default.setJson(key, 0, 3600);
        }
        else {
            await redis_1.default.setJson(key, count, 3600);
        }
    }
    catch (error) {
        logger_mixed_1.logger.error(`[activityReward:voiceCoin] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
async function cleanupVoiceCoinCounter(userId, guildId) {
    await redis_1.default.deleteKey(`voice_coin:${guildId}:${userId}`);
}
