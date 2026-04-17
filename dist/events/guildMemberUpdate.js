"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const notificationService_1 = require("../services/notification/notificationService");
const notificationEmbeds_1 = require("../services/notification/notificationEmbeds");
const guildNotificationConfig_model_1 = require("../models/guildNotificationConfig.model");
const locale_1 = require("../util/i18n/locale");
const logger_mixed_1 = require("../util/log/logger.mixed");
exports.default = {
    name: discord_js_1.Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember, newMember) {
        try {
            // Fetch full member if partial (premiumSince may be unavailable)
            if (oldMember.partial)
                oldMember = await oldMember.fetch();
            // Detect new boost: premiumSince was null, now has value
            const wasBoosting = oldMember.premiumSince !== null;
            const isBoosting = newMember.premiumSince !== null;
            if (wasBoosting || !isBoosting)
                return;
            const guildId = newMember.guild.id;
            const config = await (0, notificationService_1.getNotificationConfig)(guildId, guildNotificationConfig_model_1.NotificationType.Boost);
            if (!config.enabled || !config.channelId)
                return;
            const locale = await (0, locale_1.resolveGuildLocale)(guildId);
            const embed = (0, notificationEmbeds_1.buildBoostEmbed)(newMember, locale);
            await (0, notificationService_1.sendNotification)(newMember.guild, config.channelId, embed);
        }
        catch (error) {
            logger_mixed_1.logger.error(`[guildMemberUpdate:boost] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
