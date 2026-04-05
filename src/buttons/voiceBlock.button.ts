import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.VOICE_BLOCK,
    async execute(interaction: ButtonInteraction) {
        const locale = await resolveLocale(interaction);
        const voiceChannel = await validateOwner(interaction, locale);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_BLOCK)
            .setPlaceholder(t(locale, "voice.select.block_placeholder"))
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
