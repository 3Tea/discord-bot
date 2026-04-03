import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    MessageFlags,
    UserSelectMenuInteraction,
    VoiceChannel,
} from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";

export default {
    id: BUTTON_ID.VOICE_SELECT_KICK,
    async execute(interaction: UserSelectMenuInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.editReply({ content: "You are not in a voice channel." });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.editReply({ content: "You are not the owner." });
            return;
        }

        const cdKey = `cd:kick:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: `Please try again in ${ttl}s.` });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: "You cannot kick yourself." });
            return;
        }

        const targetMember = voiceChannel.members.get(targetId);
        if (!targetMember) {
            await interaction.editReply({
                content: "That user is not in the voice channel.",
            });
            return;
        }

        // Store target for the confirmation handler (30s TTL)
        await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, targetId, 30);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.VOICE_KICK_ONLY)
                .setLabel("Kick")
                .setEmoji("👢")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.VOICE_KICK_BLOCK)
                .setLabel("Kick & Block")
                .setEmoji("🚫")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.editReply({
            content: `Kick <@${targetId}> from the voice channel?`,
            components: [row],
        });
    },
};
