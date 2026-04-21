import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GuildEconomyRewardConfigModel, { IGuildEconomyRewardConfig } from "../../models/guildEconomyRewardConfig.model";
import { logger } from "../log/logger.mixed";

const CONFIG_CACHE_TTL = 300; // 5 minutes

export interface LevelUpRewardResult {
    coinReward: number;
    gemReward: number;
}

async function getRewardConfig(guildId: string): Promise<IGuildEconomyRewardConfig> {
    const cacheKey = `economy_reward_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildEconomyRewardConfig;

    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, returnDocument: "after" }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export async function invalidateRewardConfigCache(guildId: string): Promise<void> {
    await redis.deleteKey(`economy_reward_config:${guildId}`);
}

export async function rewardLevelUp(userId: string, guildId: string, newLevel: number): Promise<LevelUpRewardResult> {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled) return { coinReward: 0, gemReward: 0 };

        const coinReward = config.levelUpCoinBase + newLevel * config.levelUpCoinPerLevel;
        await CurrencyService.addCoin(userId, guildId, coinReward, "level_up", {
            level: newLevel,
        });

        // Check gem milestone — when loaded from Redis cache, gemMilestones is a plain object
        const milestonesRaw: unknown = config.gemMilestones;
        const milestones: Map<string, number> =
            milestonesRaw instanceof Map
                ? (milestonesRaw as Map<string, number>)
                : new Map(Object.entries((milestonesRaw as Record<string, number>) ?? {}));
        const gemReward = milestones.get(String(newLevel)) ?? 0;

        if (gemReward > 0) {
            await CurrencyService.addGem(userId, guildId, gemReward, "level_up", {
                level: newLevel,
            });
        }

        return { coinReward, gemReward };
    } catch (error) {
        logger.error(`[activityReward:levelUp] ${error instanceof Error ? error.message : "Unknown error"}`);
        return { coinReward: 0, gemReward: 0 };
    }
}

export async function tickVoiceCoinReward(userId: string, guildId: string): Promise<void> {
    try {
        const config = await getRewardConfig(guildId);
        if (!config.enabled || config.voiceCoinReward <= 0) return;

        const key = `voice_coin:${guildId}:${userId}`;
        const current = ((await redis.getJson(key)) as number) ?? 0;
        const count = current + 1;

        if (count >= config.voiceCoinInterval) {
            await CurrencyService.addCoin(userId, guildId, config.voiceCoinReward, "voice_reward", {
                minutes: config.voiceCoinInterval,
            });
            await redis.setJson(key, 0, 3600);
        } else {
            await redis.setJson(key, count, 3600);
        }
    } catch (error) {
        logger.error(`[activityReward:voiceCoin] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export async function cleanupVoiceCoinCounter(userId: string, guildId: string): Promise<void> {
    await redis.deleteKey(`voice_coin:${guildId}:${userId}`);
}
