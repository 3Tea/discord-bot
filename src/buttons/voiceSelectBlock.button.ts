import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_BLOCK,
    async execute(interaction: UserSelectMenuInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        const cdKey = `cd:block:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.reply({ content: "You cannot block yourself.", flags: MessageFlags.Ephemeral });
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
        await interaction.reply({ content: `<@${targetId}> has been blocked 🚫`, flags: MessageFlags.Ephemeral });
    },
};
