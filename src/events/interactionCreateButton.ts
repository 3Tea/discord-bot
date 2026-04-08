import { ButtonInteraction, Events, MessageFlags } from "discord.js";

import client from "../client";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;

        let button = client?.buttons.get(interaction.customId);
        if (!button && interaction.customId.includes(":")) {
            const prefix = interaction.customId.split(":")[0] ?? "";
            button = client?.buttons.get(prefix);
        }

        if (!button) {
            // Unregistered buttons are handled by message component collectors
            return;
        }

        try {
            await button.execute(interaction);
        } catch (error) {
            console.error(error);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: `There was an error while executing this button! ${interaction.customId}`,
                    });
                } else {
                    await interaction.reply({
                        content: `There was an error while executing this button! ${interaction.customId}`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } catch {
                // Interaction expired — silently ignore
            }
        }
    },
};
