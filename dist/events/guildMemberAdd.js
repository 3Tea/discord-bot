"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const notificationService_1 = require("../services/notification/notificationService");
const notificationEmbeds_1 = require("../services/notification/notificationEmbeds");
const guildNotificationConfig_model_1 = require("../models/guildNotificationConfig.model");
const locale_1 = require("../util/i18n/locale");
const logger_mixed_1 = require("../util/log/logger.mixed");
exports.default = {
    name: discord_js_1.Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const locale = await (0, locale_1.resolveGuildLocale)(guildId);
            // Welcome notification
            const welcomeConfig = await (0, notificationService_1.getNotificationConfig)(guildId, guildNotificationConfig_model_1.NotificationType.Welcome);
            if (welcomeConfig.enabled && welcomeConfig.channelId) {
                const embed = (0, notificationEmbeds_1.buildWelcomeEmbed)(member, locale);
                await (0, notificationService_1.sendNotification)(member.guild, welcomeConfig.channelId, embed, guildNotificationConfig_model_1.NotificationType.Welcome);
            }
            // Milestone notification
            const milestoneConfig = await (0, notificationService_1.getNotificationConfig)(guildId, guildNotificationConfig_model_1.NotificationType.Milestone);
            if (milestoneConfig.enabled && milestoneConfig.channelId) {
                const thresholds = milestoneConfig.options?.thresholds ?? [50, 100, 250, 500, 1000];
                const memberCount = member.guild.memberCount;
                if (thresholds.includes(memberCount)) {
                    const embed = (0, notificationEmbeds_1.buildMilestoneEmbed)(member.guild, memberCount, locale);
                    await (0, notificationService_1.sendNotification)(member.guild, milestoneConfig.channelId, embed, guildNotificationConfig_model_1.NotificationType.Milestone);
                }
            }
        }
        catch (error) {
            logger_mixed_1.logger.error(`[guildMemberAdd] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
