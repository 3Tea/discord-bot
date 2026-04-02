import type { Client, TextBasedChannel, PartialGroupDMChannel } from "discord.js";
import type { Queue } from "distube";

import redis from "../../connector/redis";
import { buildNowPlayingEmbed, buildButtonRow, buildIdleEmbed, buildDisabledButtonRow } from "./embed";

const TTL_12H = 60 * 60 * 12;

interface PanelData {
    channelId: string;
    messageId: string;
}

type SendableChannel = Exclude<TextBasedChannel, PartialGroupDMChannel>;

export async function sendPanel(textChannel: SendableChannel, queue: Queue): Promise<void> {
    const song = queue.songs[0];
    if (!song) return;

    const guildId = queue.voiceChannel?.guild.id;
    if (!guildId) return;

    const embed = buildNowPlayingEmbed(song, queue);
    const row = buildButtonRow(queue.paused, queue.repeatMode);

    if (!("send" in textChannel)) return;
    const message = await textChannel.send({ embeds: [embed], components: [row] });

    const panelData: PanelData = { channelId: textChannel.id, messageId: message.id };
    await redis.setJson(`music_panel:${guildId}`, panelData, TTL_12H);
}

export async function updatePanel(client: Client, guildId: string, queue: Queue): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(panelData.messageId);
        const song = queue.songs[0];

        if (song) {
            const embed = buildNowPlayingEmbed(song, queue);
            const row = buildButtonRow(queue.paused, queue.repeatMode);
            await message.edit({ embeds: [embed], components: [row] });
        } else {
            const embed = buildIdleEmbed();
            const row = buildDisabledButtonRow();
            await message.edit({ embeds: [embed], components: [row] });
        }
    } catch {
        await redis.deleteKey(`music_panel:${guildId}`);
    }
}

export async function setIdlePanel(client: Client, guildId: string): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(panelData.messageId);
        const embed = buildIdleEmbed();
        const row = buildDisabledButtonRow();
        await message.edit({ embeds: [embed], components: [row] });
    } catch {
        await redis.deleteKey(`music_panel:${guildId}`);
    }
}

export async function deletePanel(client: Client, guildId: string): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(panelData.messageId);
            await message.delete();
        }
    } catch {
        // Already deleted, ignore
    }

    await redis.deleteKey(`music_panel:${guildId}`);
}

export async function resendPanel(textChannel: SendableChannel, client: Client, queue: Queue): Promise<void> {
    const guildId = queue.voiceChannel?.guild.id;
    if (!guildId) return;

    await deletePanel(client, guildId);
    await sendPanel(textChannel, queue);
}
