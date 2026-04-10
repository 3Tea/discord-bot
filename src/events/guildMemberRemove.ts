import { Events, GuildMember, PartialGuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildGoodbyeEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member: GuildMember | PartialGuildMember) {
        try {
            if (member.partial) return;

            const guildId = member.guild.id;
            const config = await getNotificationConfig(guildId, NotificationType.Goodbye);
            if (!config.enabled || !config.channelId) return;

            const locale = await resolveGuildLocale(guildId);
            const embed = buildGoodbyeEmbed(member as GuildMember, locale);
            await sendNotification(member.guild, config.channelId, embed);
        } catch (error) {
            logger.error(`[guildMemberRemove] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
