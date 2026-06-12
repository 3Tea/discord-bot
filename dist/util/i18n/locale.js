"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLocale = resolveLocale;
exports.resolveGuildLocale = resolveGuildLocale;
exports.resolveUserLocale = resolveUserLocale;
exports.setUserLocale = setUserLocale;
exports.resetUserLocale = resetUserLocale;
exports.setGuildLocale = setGuildLocale;
exports.resetGuildLocale = resetGuildLocale;
const redis_1 = __importDefault(require("../../connector/redis"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const guild_model_1 = __importDefault(require("../../models/guild.model"));
const index_1 = require("./index");
const LOCALE_TTL = 60 * 60 * 24 * 30; // 30 days
function isSupportedLocale(value) {
    return index_1.SUPPORTED_LOCALES.includes(value);
}
function mapDiscordLocale(discordLocale) {
    if (discordLocale === "vi")
        return "vi";
    if (discordLocale === "id")
        return "id";
    if (discordLocale.startsWith("es"))
        return "es";
    if (discordLocale === "ja")
        return "ja";
    if (discordLocale.startsWith("zh"))
        return "zh";
    if (discordLocale === "ko")
        return "ko";
    if (discordLocale === "pt-BR")
        return "pt-BR";
    if (discordLocale === "fr")
        return "fr";
    if (discordLocale === "de")
        return "de";
    if (discordLocale === "ru")
        return "ru";
    if (discordLocale === "tr")
        return "tr";
    if (discordLocale === "it")
        return "it";
    if (discordLocale === "pl")
        return "pl";
    if (discordLocale === "nl")
        return "nl";
    if (discordLocale.startsWith("en"))
        return "en";
    return index_1.DEFAULT_LOCALE;
}
async function resolveFromRedisOrDb(redisKey, dbLookup) {
    const cached = await redis_1.default.getKey(redisKey);
    if (cached === "none")
        return null;
    if (cached && isSupportedLocale(cached))
        return cached;
    const dbValue = await dbLookup();
    if (dbValue && isSupportedLocale(dbValue)) {
        await redis_1.default.setKey(redisKey, dbValue, LOCALE_TTL);
        return dbValue;
    }
    await redis_1.default.setKey(redisKey, "none", LOCALE_TTL);
    return null;
}
async function resolveLocale(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const userLocale = await resolveFromRedisOrDb(`locale:user:${userId}`, async () => {
        const user = await user_model_1.default.findOne({ userID: userId }).select("locale").lean();
        return user?.locale;
    });
    if (userLocale)
        return userLocale;
    if (guildId) {
        const guildLocale = await resolveFromRedisOrDb(`locale:guild:${guildId}`, async () => {
            const guild = await guild_model_1.default.findOne({ guildID: guildId }).select("locale").lean();
            return guild?.locale;
        });
        if (guildLocale)
            return guildLocale;
    }
    return mapDiscordLocale(interaction.locale);
}
/**
 * Resolve locale for non-interaction contexts (events) using guild preference only.
 */
async function resolveGuildLocale(guildId) {
    const guildLocale = await resolveFromRedisOrDb(`locale:guild:${guildId}`, async () => {
        const guild = await guild_model_1.default.findOne({ guildID: guildId }).select("locale").lean();
        return guild?.locale;
    });
    return guildLocale ?? index_1.DEFAULT_LOCALE;
}
/**
 * Resolve locale for a user without an interaction context (e.g. DMs from cron jobs).
 * Falls back to DEFAULT_LOCALE if user has no preference.
 */
async function resolveUserLocale(userId) {
    const userLocale = await resolveFromRedisOrDb(`locale:user:${userId}`, async () => {
        const user = await user_model_1.default.findOne({ userID: userId }).select("locale").lean();
        return user?.locale;
    });
    return userLocale ?? index_1.DEFAULT_LOCALE;
}
async function setUserLocale(userId, locale) {
    await user_model_1.default.findOneAndUpdate({ userID: userId }, { $set: { locale } }, { upsert: true });
    await redis_1.default.setKey(`locale:user:${userId}`, locale, LOCALE_TTL);
}
async function resetUserLocale(userId) {
    await user_model_1.default.findOneAndUpdate({ userID: userId }, { $unset: { locale: 1 } });
    await redis_1.default.setKey(`locale:user:${userId}`, "none", LOCALE_TTL);
}
async function setGuildLocale(guildId, locale) {
    await guild_model_1.default.findOneAndUpdate({ guildID: guildId }, { $set: { locale } }, { upsert: true });
    await redis_1.default.setKey(`locale:guild:${guildId}`, locale, LOCALE_TTL);
}
async function resetGuildLocale(guildId) {
    await guild_model_1.default.findOneAndUpdate({ guildID: guildId }, { $unset: { locale: 1 } });
    await redis_1.default.setKey(`locale:guild:${guildId}`, "none", LOCALE_TTL);
}
