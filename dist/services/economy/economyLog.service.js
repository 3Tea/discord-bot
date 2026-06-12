"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const economyLogConfig_model_1 = __importDefault(require("../../models/economyLogConfig.model"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
let clientRef = null;
function setClient(client) {
    clientRef = client;
}
async function getConfig(guildId) {
    const cacheKey = `eco_log_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached === "none")
        return null;
    if (cached)
        return cached;
    const config = await economyLogConfig_model_1.default.findOne({ guildId });
    if (!config) {
        await redis_1.default.setJson(cacheKey, "none", 300);
        return null;
    }
    await redis_1.default.setJson(cacheKey, config.toObject(), 300);
    return config;
}
async function shouldLog(guildId, eventType, amount) {
    const config = await getConfig(guildId);
    if (!config || !config.enabled)
        return false;
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
async function sendLog(guildId, embed) {
    try {
        if (!clientRef)
            return;
        const config = await getConfig(guildId);
        if (!config || !config.enabled)
            return;
        const channel = await clientRef.channels.fetch(config.channelId).catch(() => null);
        if (!channel || !(channel instanceof discord_js_1.TextChannel))
            return;
        await channel.send({ embeds: [embed] });
    }
    catch (error) {
        logger_mixed_1.logger.warn(`Economy log send failed for guild ${guildId}: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
async function invalidateConfigCache(guildId) {
    await redis_1.default.deleteKey(`eco_log_config:${guildId}`);
}
const EconomyLogService = {
    setClient,
    getConfig,
    shouldLog,
    sendLog,
    invalidateConfigCache,
};
exports.default = EconomyLogService;
