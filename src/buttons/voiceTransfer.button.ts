import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_TRANSFER,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_TRANSFER)
            .setPlaceholder("Select the new owner")
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
