import { Client, EmbedBuilder, TextChannel } from "discord.js";
import redis from "../../connector/redis";
import EconomyLogConfigModel, { IEconomyLogConfig } from "../../models/economyLogConfig.model";
import { logger } from "../../util/log/logger.mixed";

type LogEventType =
    | "coin_transaction"
    | "gem_transaction"
    | "gambling_win"
    | "rob_success"
    | "admin_action"
    | "bulk_operation"
    | "freeze"
    | "reset";

let clientRef: Client | null = null;

function setClient(client: Client): void {
    clientRef = client;
}

async function getConfig(guildId: string): Promise<IEconomyLogConfig | null> {
    const cacheKey = `eco_log_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached === "none") return null;
    if (cached) return cached as IEconomyLogConfig;

    const config = await EconomyLogConfigModel.findOne({ guildId });
    if (!config) {
        await redis.setJson(cacheKey, "none", 300);
        return null;
    }
    await redis.setJson(cacheKey, config.toObject(), 300);
    return config;
}

async function shouldLog(guildId: string, eventType: LogEventType, amount?: number): Promise<boolean> {
    const config = await getConfig(guildId);
    if (!config || !config.enabled) return false;

    switch (eventType) {
        case "coin_transaction":
            return amount !== undefined && Math.abs(amount) >= config.thresholds.coinTransaction;
        case "gem_transaction":
            return amount !== undefined && Math.abs(amount) >= config.thresholds.gemTransaction;
        case "gambling_win":
            return amount !== undefined && amount >= config.thresholds.gamblingWin;
        case "rob_success":
            return config.thresholds.robSuccess;
        case "admin_action":
            return config.thresholds.adminActions;
        case "bulk_operation":
            return config.thresholds.bulkOperations;
        case "freeze":
            return config.thresholds.adminActions;
        case "reset":
            return config.thresholds.adminActions;
        default:
            return false;
    }
}

async function sendLog(guildId: string, embed: EmbedBuilder): Promise<void> {
    try {
        if (!clientRef) return;
        const config = await getConfig(guildId);
        if (!config || !config.enabled) return;

        const channel = await clientRef.channels.fetch(config.channelId).catch(() => null);
        if (!channel || !(channel instanceof TextChannel)) return;

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.warn(
            `Economy log send failed for guild ${guildId}: ${error instanceof Error ? error.message : "Unknown"}`
        );
    }
}

async function invalidateConfigCache(guildId: string): Promise<void> {
    await redis.deleteKey(`eco_log_config:${guildId}`);
}

const EconomyLogService = {
    setClient,
    getConfig,
    shouldLog,
    sendLog,
    invalidateConfigCache,
};

export default EconomyLogService;
