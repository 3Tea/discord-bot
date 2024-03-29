import { ChatInputCommandInteraction, Events } from "discord.js";
import client from "../client";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client?.commands.get(interaction.commandName);

        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`
            );
            return;
        }

        console.log(
            `/${interaction.commandName} => username: ${interaction.user.username}#${interaction.user.discriminator} ID: ${interaction.user.id}`
        );

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `There was an error while executing this command! ${interaction.commandName}`,
                ephemeral: true,
            });
        }
    },
};
