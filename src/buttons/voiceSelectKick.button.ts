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
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.VOICE_SELECT_KICK,
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

        const cdKey = `cd:kick:${voiceChannel.id}`;
        const ttl = await redis.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: t(locale, "voice.cooldown", { seconds: ttl }) });
            return;
        }

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: t(locale, "voice.kick_self") });
            return;
        }

        const targetMember = voiceChannel.members.get(targetId);
        if (!targetMember) {
            await interaction.editReply({
                content: t(locale, "voice.kick_not_in_channel"),
            });
            return;
        }

        // Store target for the confirmation handler (30s TTL)
        await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, targetId, 30);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.VOICE_KICK_ONLY)
                .setLabel(t(locale, "voice.btn.kick"))
                .setEmoji("👢")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.VOICE_KICK_BLOCK)
                .setLabel(t(locale, "voice.btn.kick_block"))
                .setEmoji("🚫")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.editReply({
            content: t(locale, "voice.kick_confirm", { userId: targetId }),
            components: [row],
        });
    },
};
