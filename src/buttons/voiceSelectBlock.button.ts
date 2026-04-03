import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_BLOCK,
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

        const cdKey = `cd:block:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: `Please try again in ${ttl}s.` });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: "You cannot block yourself." });
            return;
        }

        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });

        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }

        // Remove from permitted if present
        const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
        const permIndex = permitted.indexOf(targetId);
        if (permIndex !== -1) {
            permitted.splice(permIndex, 1);
            await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
        }

        // Disconnect user if in channel
        const targetMember = voiceChannel.members.get(targetId);
        if (targetMember) {
            await targetMember.voice.disconnect("Blocked by channel owner");
        }

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.editReply({ content: `<@${targetId}> has been blocked 🚫` });
    },
};
