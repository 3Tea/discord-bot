import { ButtonInteraction, GuildMember, VoiceChannel } from "discord.js";

import redis from "../../connector/redis";
import { resolveLocale } from "../i18n/locale";
import { t } from "../i18n/t";
import { setCooldown, updatePanel } from "./helpers";

const TTL_12H = 60 * 60 * 12;

export async function handleKick(interaction: ButtonInteraction, block: boolean): Promise<void> {
    const locale = await resolveLocale(interaction);
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.editReply({ content: t(locale, "voice.not_in_channel") });
        return;
    }

    const targetId = await redis.getJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    if (!targetId) {
        await interaction.editReply({ content: t(locale, "voice.kick_expired") });
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
    await updatePanel(voiceChannel, locale);

    const content = block
        ? t(locale, "voice.kicked_blocked", { userId: targetId })
        : t(locale, "voice.kicked", { userId: targetId });
    await interaction.editReply({ content, components: [] });
}
