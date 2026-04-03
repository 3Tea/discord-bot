import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_PERMIT,
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

        const cdKey = `cd:permit:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: `Please try again in ${ttl}s.` });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: "You cannot permit yourself." });
            return;
        }

        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: true,
            ViewChannel: true,
        });

        const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
        if (!permitted.includes(targetId)) {
            permitted.push(targetId);
            await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
        }

        // Remove from blocked if present
        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        const blockedIndex = blocked.indexOf(targetId);
        if (blockedIndex !== -1) {
            blocked.splice(blockedIndex, 1);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.editReply({ content: `<@${targetId}> has been permitted ✅` });
    },
};
