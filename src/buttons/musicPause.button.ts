import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { updatePanel } from "../util/music/panel";

export default {
    id: BUTTON_ID.MUSIC_PAUSE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        if (queue.paused) {
            queue.resume();
        } else {
            queue.pause();
        }

        await updatePanel(interaction.client, interaction.guildId!, queue);
        await interaction.deferUpdate();
    },
};
