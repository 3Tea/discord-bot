import { ButtonInteraction, Events } from "discord.js";

import client from "../client";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;

        const button = client?.buttons.get(interaction.customId);

        if (!button) {
            console.error(
                `No button matching ${interaction.customId} was found.`
            );
            return;
        }

        try {
            await button.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `There was an error while executing this button! ${interaction.customId}`,
                ephemeral: true,
            });
        }
    },
};
