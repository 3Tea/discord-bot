"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationConfig = getNotificationConfig;
exports.invalidateNotificationCache = invalidateNotificationCache;
exports.sendNotification = sendNotification;
const discord_js_1 = require("discord.js");
const guildNotificationConfig_model_1 = __importDefault(require("../../models/guildNotificationConfig.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const index_1 = require("../../util/config/index");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const CONFIG_CACHE_TTL = 300; // 5 minutes
function cacheKey(guildId, type) {
    return `notification_config:${guildId}:${type}`;
}
async function getNotificationConfig(guildId, type) {
    const key = cacheKey(guildId, type);
    const cached = await redis_1.default.getJson(key);
    if (cached)
        return cached;
    const config = await guildNotificationConfig_model_1.default.findOneAndUpdate({ guildId, type }, { $setOnInsert: { guildId, type } }, { upsert: true, new: true });
    await redis_1.default.setJson(key, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
async function invalidateNotificationCache(guildId, type) {
    await redis_1.default.deleteKey(cacheKey(guildId, type));
}
async function sendNotification(guild, channelId, embed) {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased())
            return false;
        const textChannel = channel;
        const me = guild.members.me;
        if (!me)
            return false;
        const permissions = textChannel.permissionsFor(me);
        if (!permissions?.has([discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.EmbedLinks])) {
            return false;
        }
        if (!embed.data.footer && index_1.FOOTER.text) {
            embed.setFooter({ text: index_1.FOOTER.text, iconURL: index_1.FOOTER.icon });
        }
        await textChannel.send({ embeds: [embed] });
        return true;
    }
    catch (error) {
        logger_mixed_1.logger.error(`[notification:send] ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
    }
}
