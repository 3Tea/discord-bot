import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { buildQueueEmbed } from "../util/music/embed";

export default {
    id: BUTTON_ID.MUSIC_QUEUE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue || !queue.songs.length) {
            await interaction.reply({ content: "The queue is empty.", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = buildQueueEmbed(queue);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
