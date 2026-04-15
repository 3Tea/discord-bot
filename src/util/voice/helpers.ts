import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    MessageType,
    RepliableInteraction,
    VoiceChannel,
} from "discord.js";

import redis from "../../connector/redis";
import { FOOTER } from "../config/index";
import { BUTTON_ID } from "../config/button";
import { resolveLocale } from "../i18n/locale";
import type { LocaleInteraction } from "../i18n/locale";
import { t } from "../i18n/t";
import type { SupportedLocale } from "../i18n/index";

const TTL_12H = 60 * 60 * 12;

/**
 * Check if the interaction user is the owner of the voice channel.
 * Returns the voice channel if valid, or null (and replies with error) if not.
 */
async function replyOrEdit(interaction: RepliableInteraction, content: string): Promise<void> {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
    } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
}

export async function validateOwner(
    interaction: RepliableInteraction,
    locale?: SupportedLocale
): Promise<VoiceChannel | null> {
    const resolvedLocale = locale ?? (await resolveLocale(interaction as LocaleInteraction));
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
        await replyOrEdit(interaction, t(resolvedLocale, "voice.not_in_channel"));
        return null;
    }

    const ownerId = await redis.getJson<string>(voiceChannel.id);
    if (ownerId !== interaction.user.id) {
        await replyOrEdit(interaction, t(resolvedLocale, "voice.not_owner"));
        return null;
    }

    return voiceChannel;
}

/**
 * Check cooldown for an action. Returns true if action is allowed, false if on cooldown.
 * If on cooldown, replies with ephemeral message.
 */
export async function checkCooldown(
    interaction: RepliableInteraction,
    redisKey: string,
    locale?: SupportedLocale
): Promise<boolean> {
    const resolvedLocale = locale ?? (await resolveLocale(interaction as LocaleInteraction));
    const ttl = await redis.ttlKey(redisKey);
    if (ttl > 0) {
        await replyOrEdit(interaction, t(resolvedLocale, "voice.cooldown", { seconds: ttl }));
        return false;
    }
    return true;
}

/**
 * Set cooldown for an action.
 */
export async function setCooldown(redisKey: string, seconds: number): Promise<void> {
    await redis.setJson(redisKey, 1, seconds);
}

/**
 * Build the control panel embed showing owner and status.
 */
export async function buildPanelEmbed(
    channelId: string,
    ownerId: string,
    locale: SupportedLocale
): Promise<EmbedBuilder> {
    const state: string = (await redis.getJson<string>(`state:${channelId}`)) || "unlocked";
    const permitted: string[] = (await redis.getJson<string[]>(`permitted:${channelId}`)) || [];
    const blocked: string[] = (await redis.getJson<string[]>(`blocked:${channelId}`)) || [];

    const statusMap: Record<string, string> = {
        unlocked: t(locale, "voice.panel.status_unlocked"),
        locked: t(locale, "voice.panel.status_locked"),
        hidden: t(locale, "voice.panel.status_hidden"),
    };

    const statusText = statusMap[state] ?? t(locale, "voice.panel.status_unlocked");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "voice.panel.title"))
        .setColor("Random")
        .setTimestamp()
        .setDescription(t(locale, "voice.panel.description", { ownerId, status: statusText }));

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    if (permitted.length > 0) {
        embed.addFields({
            name: t(locale, "voice.panel.permitted"),
            value: permitted.map((id) => `<@${id}>`).join(", "),
        });
    }

    if (blocked.length > 0) {
        embed.addFields({
            name: t(locale, "voice.panel.blocked"),
            value: blocked.map((id) => `<@${id}>`).join(", "),
        });
    }

    return embed;
}

/**
 * Build the button rows for the control panel.
 */
export function buildPanelRows(locale: SupportedLocale): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_LOCK)
            .setEmoji("🔒")
            .setLabel(t(locale, "voice.btn.lock"))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_UNLOCK)
            .setEmoji("🔓")
            .setLabel(t(locale, "voice.btn.unlock"))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_HIDE)
            .setEmoji("👁️")
            .setLabel(t(locale, "voice.btn.hide"))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_RENAME)
            .setEmoji("✏️")
            .setLabel(t(locale, "voice.btn.rename"))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_LIMIT)
            .setEmoji("👥")
            .setLabel(t(locale, "voice.btn.limit"))
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_PERMIT)
            .setEmoji("✅")
            .setLabel(t(locale, "voice.btn.permit"))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_BLOCK)
            .setEmoji("🚫")
            .setLabel(t(locale, "voice.btn.block"))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_KICK)
            .setEmoji("👢")
            .setLabel(t(locale, "voice.btn.kick"))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_TRANSFER)
            .setEmoji("🔄")
            .setLabel(t(locale, "voice.btn.transfer"))
            .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2];
}

/**
 * Update the control panel message in the voice channel.
 */
export async function updatePanel(voiceChannel: VoiceChannel, locale: SupportedLocale): Promise<void> {
    const panelMessageId = await redis.getJson<string>(`panel:${voiceChannel.id}`);
    if (!panelMessageId) return;

    const ownerId = await redis.getJson<string>(voiceChannel.id);
    if (!ownerId) return;

    try {
        const message = await voiceChannel.messages.fetch(panelMessageId);
        const embed = await buildPanelEmbed(voiceChannel.id, ownerId, locale);
        await message.edit({ embeds: [embed], components: buildPanelRows(locale) });
    } catch {
        // Message may have been deleted, ignore
    }
}

/**
 * Send the control panel to the voice channel text chat, mention owner, pin it, and store the message ID.
 */
export async function sendPanel(voiceChannel: VoiceChannel, ownerId: string, locale: SupportedLocale): Promise<void> {
    const embed = await buildPanelEmbed(voiceChannel.id, ownerId, locale);
    const rows = buildPanelRows(locale);
    const message = await voiceChannel.send({
        content: t(locale, "voice.panel.owner_mention", { ownerId }),
        embeds: [embed],
        components: rows,
    });
    await redis.setJson(`panel:${voiceChannel.id}`, message.id, TTL_12H);

    // Pin the panel and delete the "pinned a message" system message
    try {
        await message.pin();
        const messages = await voiceChannel.messages.fetch({ limit: 5 });
        const pinSystemMsg = messages.find((m) => m.type === MessageType.ChannelPinnedMessage);
        if (pinSystemMsg) await pinSystemMsg.delete();
    } catch {
        // Ignore if pin fails (missing permissions)
    }
}

/**
 * Clean up all Redis keys for a voice channel.
 */
export async function cleanupRedisKeys(channelId: string): Promise<void> {
    await Promise.all([
        redis.deleteKey(channelId),
        redis.deleteKey(`panel:${channelId}`),
        redis.deleteKey(`state:${channelId}`),
        redis.deleteKey(`blocked:${channelId}`),
        redis.deleteKey(`permitted:${channelId}`),
    ]);
}
