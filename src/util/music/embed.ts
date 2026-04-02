import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { Queue, Song } from "distube";

import { FOOTER } from "../config/index";
import { BUTTON_ID } from "../config/button";

const LOOP_LABELS = ["Off", "🔂 Song", "🔁 Queue"] as const;

export function buildNowPlayingEmbed(song: Song, queue: Queue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🎵 Now Playing")
        .setColor(0x1db954)
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
            { name: "Artist", value: song.uploader?.name || "Unknown", inline: true },
            { name: "Duration", value: song.formattedDuration || "Live", inline: true },
            { name: "Requested by", value: `${song.member?.user || "Unknown"}`, inline: true },
            {
                name: "Queue",
                value: queue.songs.length > 1 ? `${queue.songs.length - 1} song(s) remaining` : "No songs in queue",
                inline: true,
            },
            { name: "Loop", value: LOOP_LABELS[queue.repeatMode] || "Off", inline: true }
        )
        .setTimestamp();

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildIdleEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🎵 Music Player")
        .setColor(0x808080)
        .setDescription("No music playing. Use `/play` to start!")
        .setTimestamp();

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildQueueEmbed(queue: Queue): EmbedBuilder {
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11);

    let description = `**🎵 Now:** [${current.name}](${current.url}) — ${current.formattedDuration}\n\n`;

    if (upcoming.length > 0) {
        description += upcoming
            .map((song, i) => `**${i + 1}.** [${song.name}](${song.url}) — ${song.formattedDuration}`)
            .join("\n");
    } else {
        description += "*No upcoming songs*";
    }

    if (queue.songs.length > 11) {
        description += `\n\n*...and ${queue.songs.length - 11} more*`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 Queue (${queue.songs.length} song${queue.songs.length === 1 ? "" : "s"})`)
        .setColor(0x1db954)
        .setDescription(description)
        .setTimestamp();

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildButtonRow(isPaused: boolean, repeatMode: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_PAUSE)
            .setEmoji(isPaused ? "▶️" : "⏸️")
            .setLabel(isPaused ? "Resume" : "Pause")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_SKIP)
            .setEmoji("⏭️")
            .setLabel("Skip")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_STOP)
            .setEmoji("⏹️")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_LOOP)
            .setEmoji(repeatMode === 0 ? "🔁" : repeatMode === 1 ? "🔂" : "🔁")
            .setLabel(`Loop: ${LOOP_LABELS[repeatMode] || "Off"}`)
            .setStyle(repeatMode === 0 ? ButtonStyle.Secondary : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_QUEUE)
            .setEmoji("📋")
            .setLabel("Queue")
            .setStyle(ButtonStyle.Secondary)
    );
}

export function buildDisabledButtonRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_PAUSE)
            .setEmoji("⏸️")
            .setLabel("Pause")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_SKIP)
            .setEmoji("⏭️")
            .setLabel("Skip")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_STOP)
            .setEmoji("⏹️")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_LOOP)
            .setEmoji("🔁")
            .setLabel("Loop: Off")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_QUEUE)
            .setEmoji("📋")
            .setLabel("Queue")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}
