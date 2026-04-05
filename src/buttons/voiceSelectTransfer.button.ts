import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_TRANSFER,
    async execute(interaction: UserSelectMenuInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const locale = await resolveLocale(interaction);
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.editReply({ content: t(locale, "voice.not_in_channel") });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.editReply({ content: t(locale, "voice.not_owner") });
            return;
        }

        const cdKey = `cd:transfer:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: t(locale, "voice.cooldown", { seconds: ttl }) });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: t(locale, "voice.transfer_self") });
            return;
        }

        // Transfer ownership
        await redis.setJson(voiceChannel.id, targetId, TTL_12H);
        // Clear permitted and blocked lists (clean slate)
        await redis.deleteKey(`permitted:${voiceChannel.id}`);
        await redis.deleteKey(`blocked:${voiceChannel.id}`);

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel, locale);
        await interaction.editReply({
            content: t(locale, "voice.transferred", { userId: targetId }),
        });
    },
};
