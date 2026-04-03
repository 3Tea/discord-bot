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

export async function validateOwner(interaction: RepliableInteraction): Promise<VoiceChannel | null> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
        await replyOrEdit(interaction, "You are not in a voice channel.");
        return null;
    }

    const ownerId = await redis.getJson(voiceChannel.id);
    if (ownerId !== interaction.user.id) {
        await replyOrEdit(interaction, "You are not the owner of this voice channel.");
        return null;
    }

    return voiceChannel;
}

/**
 * Check cooldown for an action. Returns true if action is allowed, false if on cooldown.
 * If on cooldown, replies with ephemeral message.
 */
export async function checkCooldown(interaction: RepliableInteraction, redisKey: string): Promise<boolean> {
    const ttl = await redis.ttlKey(redisKey);
    if (ttl > 0) {
        await replyOrEdit(interaction, `Please try again in ${ttl}s.`);
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
export async function buildPanelEmbed(channelId: string, ownerId: string): Promise<EmbedBuilder> {
    const state: string = (await redis.getJson(`state:${channelId}`)) || "unlocked";
    const permitted: string[] = (await redis.getJson(`permitted:${channelId}`)) || [];
    const blocked: string[] = (await redis.getJson(`blocked:${channelId}`)) || [];

    const statusMap: Record<string, string> = {
        unlocked: "Unlocked",
        locked: "Locked",
        hidden: "Hidden",
    };

    const embed = new EmbedBuilder()
        .setTitle("Voice Control Panel")
        .setColor("Random")
        .setTimestamp()
        .setDescription(`**Owner:** <@${ownerId}>\n**Status:** ${statusMap[state] ?? "Unlocked"}`);

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    if (permitted.length > 0) {
        embed.addFields({
            name: "Permitted",
            value: permitted.map((id) => `<@${id}>`).join(", "),
        });
    }

    if (blocked.length > 0) {
        embed.addFields({
            name: "Blocked",
            value: blocked.map((id) => `<@${id}>`).join(", "),
        });
    }

    return embed;
}

/**
 * Build the button rows for the control panel.
 */
export function buildPanelRows(): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_LOCK)
            .setEmoji("🔒")
            .setLabel("Lock")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_UNLOCK)
            .setEmoji("🔓")
            .setLabel("Unlock")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_HIDE)
            .setEmoji("👁️")
            .setLabel("Hide")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_RENAME)
            .setEmoji("✏️")
            .setLabel("Rename")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_LIMIT)
            .setEmoji("👥")
            .setLabel("Limit")
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_PERMIT)
            .setEmoji("✅")
            .setLabel("Permit")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_BLOCK)
            .setEmoji("🚫")
            .setLabel("Block")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_KICK)
            .setEmoji("👢")
            .setLabel("Kick")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.VOICE_TRANSFER)
            .setEmoji("🔄")
            .setLabel("Transfer")
            .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2];
}

/**
 * Update the control panel message in the voice channel.
 */
export async function updatePanel(voiceChannel: VoiceChannel): Promise<void> {
    const panelMessageId = await redis.getJson(`panel:${voiceChannel.id}`);
    if (!panelMessageId) return;

    const ownerId = await redis.getJson(voiceChannel.id);
    if (!ownerId) return;

    try {
        const message = await voiceChannel.messages.fetch(panelMessageId);
        const embed = await buildPanelEmbed(voiceChannel.id, ownerId);
        await message.edit({ embeds: [embed], components: buildPanelRows() });
    } catch {
        // Message may have been deleted, ignore
    }
}

/**
 * Send the control panel to the voice channel text chat, mention owner, pin it, and store the message ID.
 */
export async function sendPanel(voiceChannel: VoiceChannel, ownerId: string): Promise<void> {
    const embed = await buildPanelEmbed(voiceChannel.id, ownerId);
    const rows = buildPanelRows();
    const message = await voiceChannel.send({
        content: `<@${ownerId}> — Your voice control panel`,
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
