import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner, checkCooldown } from "../util/voice/helpers";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.VOICE_RENAME,
    async execute(interaction: ButtonInteraction) {
        const locale = await resolveLocale(interaction);
        const voiceChannel = await validateOwner(interaction, locale);
        if (!voiceChannel) return;

        const cdKey = `setVoiceName:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey, locale))) return;

        const modal = new ModalBuilder()
            .setCustomId(BUTTON_ID.VOICE_MODAL_RENAME)
            .setTitle(t(locale, "voice.modal.rename_title"));

        const nameInput = new TextInputBuilder()
            .setCustomId("voice_name_input")
            .setLabel(t(locale, "voice.modal.rename_label"))
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
        await interaction.showModal(modal);
    },
};
