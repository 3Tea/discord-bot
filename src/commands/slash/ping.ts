import { bold, CommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),

    async execute(interaction: CommandInteraction) {
        const sent = await interaction.reply({
            content: "Pinging...",
            fetchReply: true,
        });
        interaction.editReply(
            bold(
                `Roundtrip latency: ${
                    sent.createdTimestamp - interaction.createdTimestamp
                }ms`
            )
        );
    },
};
