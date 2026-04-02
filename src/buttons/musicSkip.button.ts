import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";

export default {
    id: BUTTON_ID.MUSIC_SKIP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        if (queue.songs.length <= 1) {
            queue.stop();
        } else {
            await queue.skip();
        }

        await interaction.deferUpdate();
    },
};
