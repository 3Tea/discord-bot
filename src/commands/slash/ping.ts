import { bold, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),

    async execute(interaction: ChatInputCommandInteraction) {
        const { resource: sent } = await interaction.reply({
            content: "Pinging...",
            withResponse: true,
        });
        if (sent?.message) {
            await interaction.editReply(
                `${bold(`🧈 Roundtrip latency: ${sent.message.createdTimestamp - interaction.createdTimestamp}ms`)}`
            );
        }
    },
};
