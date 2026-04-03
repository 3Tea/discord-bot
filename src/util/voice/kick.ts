import { ButtonInteraction, GuildMember, MessageFlags, VoiceChannel } from "discord.js";

import redis from "../../connector/redis";
import { setCooldown, updatePanel } from "./helpers";

const TTL_12H = 60 * 60 * 12;

export async function handleKick(interaction: ButtonInteraction, block: boolean): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
        return;
    }

    const targetId = await redis.getJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    if (!targetId) {
        await interaction.reply({ content: "Kick request expired. Please try again.", flags: MessageFlags.Ephemeral });
        return;
    }

    await redis.deleteKey(`kick_target:${interaction.user.id}:${voiceChannel.id}`);

    const targetMember = voiceChannel.members.get(targetId);
    if (targetMember) {
        await targetMember.voice.disconnect("Kicked by channel owner");
    }

    if (block) {
        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });

        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }
    }

    await setCooldown(`cd:kick:${voiceChannel.id}`, 10);
    await updatePanel(voiceChannel);

    const action = block ? "kicked and blocked" : "kicked";
    await interaction.update({ content: `<@${targetId}> has been ${action}.`, components: [] });
}
