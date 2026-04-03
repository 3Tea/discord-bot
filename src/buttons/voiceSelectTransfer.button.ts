import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_TRANSFER,
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

        const cdKey = `cd:transfer:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: `Please try again in ${ttl}s.` });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: "You are already the owner." });
            return;
        }

        // Transfer ownership
        await redis.setJson(voiceChannel.id, targetId, TTL_12H);
        // Clear permitted and blocked lists (clean slate)
        await redis.deleteKey(`permitted:${voiceChannel.id}`);
        await redis.deleteKey(`blocked:${voiceChannel.id}`);

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.editReply({
            content: `Ownership transferred to <@${targetId}> 🔄`,
        });
    },
};
