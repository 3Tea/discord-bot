import { ButtonInteraction } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { handleKick } from "../util/voice/kick";

export default {
    id: BUTTON_ID.VOICE_KICK_BLOCK,
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        await handleKick(interaction, true);
    },
};
