import { Events, GuildMember, PartialGuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildBoostEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        try {
            // Detect new boost: premiumSince was null, now has value
            const wasBoosting = oldMember.premiumSince !== null;
            const isBoosting = newMember.premiumSince !== null;
            if (wasBoosting || !isBoosting) return;

            const guildId = newMember.guild.id;
            const config = await getNotificationConfig(guildId, NotificationType.Boost);
            if (!config.enabled || !config.channelId) return;

            const locale = await resolveGuildLocale(guildId);
            const embed = buildBoostEmbed(newMember, locale);
            await sendNotification(newMember.guild, config.channelId, embed);
        } catch (error) {
            logger.error(`[guildMemberUpdate:boost] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
