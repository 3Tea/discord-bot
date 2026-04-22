import { EmbedBuilder, Guild, PermissionFlagsBits, TextChannel } from "discord.js";
import GuildNotificationConfigModel, {
    IGuildNotificationConfig,
    NotificationType,
} from "../../models/guildNotificationConfig.model";
import redis from "../../connector/redis";
import { FOOTER } from "../../util/config/index";
import { logger } from "../../util/log/logger.mixed";
import { BotOutputAudit } from "../audit/botOutputAudit.service";

const CONFIG_CACHE_TTL = 300; // 5 minutes

function cacheKey(guildId: string, type: NotificationType): string {
    return `notification_config:${guildId}:${type}`;
}

export async function getNotificationConfig(
    guildId: string,
    type: NotificationType
): Promise<IGuildNotificationConfig> {
    const key = cacheKey(guildId, type);
    const cached = await redis.getJson(key);
    if (cached) return cached as IGuildNotificationConfig;

    const config = await GuildNotificationConfigModel.findOneAndUpdate(
        { guildId, type },
        { $setOnInsert: { guildId, type } },
        { upsert: true, returnDocument: "after" }
    );

    await redis.setJson(key, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export async function invalidateNotificationCache(guildId: string, type: NotificationType): Promise<void> {
    await redis.deleteKey(cacheKey(guildId, type));
}

export async function sendNotification(
    guild: Guild,
    channelId: string,
    embed: EmbedBuilder,
    type: NotificationType
): Promise<boolean> {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const textChannel = channel as TextChannel;
        const me = guild.members.me;
        if (!me) return false;

        const permissions = textChannel.permissionsFor(me);
        if (!permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return false;
        }

        if (!embed.data.footer && FOOTER.text) {
            embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon });
        }

        await textChannel.send({ embeds: [embed] });

        // NotificationType enum values ("welcome" | "goodbye" | "level_up" |
        // "boost" | "milestone") are a subset of OutputSource — safe cast.
        BotOutputAudit.record({
            source: type as Parameters<typeof BotOutputAudit.record>[0]["source"],
            targetType: "channel",
            targetId: textChannel.id,
            guildId: guild.id,
            isEphemeral: false,
            content: undefined,
            embeds: [embed.toJSON()],
            components: [],
            attachments: [],
            capturedAt: new Date(),
        });

        return true;
    } catch (error) {
        logger.error(`[notification:send] ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
    }
}
