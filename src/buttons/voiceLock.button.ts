import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_LOCK,
    async execute(interaction: ButtonInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const locale = await resolveLocale(interaction);
        const voiceChannel = await validateOwner(interaction, locale);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey, locale))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: false,
            ViewChannel: true,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel, locale);
        await interaction.editReply({ content: t(locale, "voice.locked") });
    },
};
