import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { updatePanel } from "../util/music/panel";

const LOOP_NAMES = ["disabled", "song repeat", "queue repeat"];

export default {
    id: BUTTON_ID.MUSIC_LOOP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        const newMode = queue.setRepeatMode();
        await updatePanel(interaction.client, interaction.guildId!, queue);

        await interaction.reply({
            content: `Loop mode: **${LOOP_NAMES[newMode]}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
