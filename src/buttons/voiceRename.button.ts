import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner, checkCooldown } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_RENAME,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `setVoiceName:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const modal = new ModalBuilder().setCustomId(BUTTON_ID.VOICE_MODAL_RENAME).setTitle("Rename Voice Channel");

        const nameInput = new TextInputBuilder()
            .setCustomId("voice_name_input")
            .setLabel("New channel name (max 50 chars)")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
        await interaction.showModal(modal);
    },
};
