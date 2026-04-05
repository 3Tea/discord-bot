import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner, checkCooldown } from "../util/voice/helpers";
import { resolveLocale } from "../util/i18n/locale";

export default {
    id: BUTTON_ID.VOICE_LIMIT,
    async execute(interaction: ButtonInteraction) {
        const locale = await resolveLocale(interaction);
        const voiceChannel = await validateOwner(interaction, locale);
        if (!voiceChannel) return;

        const cdKey = `setUserLimit:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey, locale))) return;

        const modal = new ModalBuilder().setCustomId(BUTTON_ID.VOICE_MODAL_LIMIT).setTitle("Set User Limit");

        const limitInput = new TextInputBuilder()
            .setCustomId("voice_limit_input")
            .setLabel("User limit (0-99, 0 = unlimited)")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
        await interaction.showModal(modal);
    },
};
