import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";

import { resendPanel } from "../../util/music/panel";

export default {
    data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current music player panel"),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId ?? "");

        if (!queue?.songs.length) {
            await interaction.reply({
                content: "Nothing is playing right now. Use `/play` to start!",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply();

        if (interaction.channel && "send" in interaction.channel) {
            await resendPanel(interaction.channel, interaction.client, queue);
        }

        await interaction.deleteReply();
    },
};
