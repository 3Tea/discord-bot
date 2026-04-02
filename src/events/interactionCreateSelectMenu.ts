import { Events, MessageFlags, UserSelectMenuInteraction } from "discord.js";

import client from "../client";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: UserSelectMenuInteraction) {
        if (!interaction.isUserSelectMenu()) return;

        const handler = client?.selectMenus.get(interaction.customId);

        if (!handler) {
            console.error(`No select menu handler matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await handler.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `There was an error while executing this select menu! ${interaction.customId}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
