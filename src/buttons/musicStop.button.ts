import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { setIdlePanel } from "../util/music/panel";

export default {
    id: BUTTON_ID.MUSIC_STOP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        queue.stop();
        await setIdlePanel(interaction.client, interaction.guildId!);
        await interaction.deferUpdate();
    },
};
