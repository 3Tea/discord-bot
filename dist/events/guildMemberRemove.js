"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const notificationService_1 = require("../services/notification/notificationService");
const notificationEmbeds_1 = require("../services/notification/notificationEmbeds");
const guildNotificationConfig_model_1 = require("../models/guildNotificationConfig.model");
const locale_1 = require("../util/i18n/locale");
const logger_mixed_1 = require("../util/log/logger.mixed");
exports.default = {
    name: discord_js_1.Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        try {
            if (member.partial)
                return;
            const guildId = member.guild.id;
            const config = await (0, notificationService_1.getNotificationConfig)(guildId, guildNotificationConfig_model_1.NotificationType.Goodbye);
            if (!config.enabled || !config.channelId)
                return;
            const locale = await (0, locale_1.resolveGuildLocale)(guildId);
            const embed = (0, notificationEmbeds_1.buildGoodbyeEmbed)(member, locale);
            await (0, notificationService_1.sendNotification)(member.guild, config.channelId, embed, guildNotificationConfig_model_1.NotificationType.Goodbye);
        }
        catch (error) {
            logger_mixed_1.logger.error(`[guildMemberRemove] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
