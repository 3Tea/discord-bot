import { Events, GuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildWelcomeEmbed, buildMilestoneEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member: GuildMember) {
        try {
            const guildId = member.guild.id;
            const locale = await resolveGuildLocale(guildId);

            // Welcome notification
            const welcomeConfig = await getNotificationConfig(guildId, NotificationType.Welcome);
            if (welcomeConfig.enabled && welcomeConfig.channelId) {
                const embed = buildWelcomeEmbed(member, locale);
                await sendNotification(member.guild, welcomeConfig.channelId, embed);
            }

            // Milestone notification
            const milestoneConfig = await getNotificationConfig(guildId, NotificationType.Milestone);
            if (milestoneConfig.enabled && milestoneConfig.channelId) {
                const thresholds = milestoneConfig.options?.thresholds ?? [50, 100, 250, 500, 1000];
                const memberCount = member.guild.memberCount;
                if (thresholds.includes(memberCount)) {
                    const embed = buildMilestoneEmbed(member.guild, memberCount, locale);
                    await sendNotification(member.guild, milestoneConfig.channelId, embed);
                }
            }
        } catch (error) {
            logger.error(`[guildMemberAdd] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
