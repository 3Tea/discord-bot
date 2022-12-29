import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    italic,
    bold,
} from "discord.js";

import Reply from "../../util/decorator/reply";

import axios from "axios";

export default {
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Chatting")
        .addStringOption((option) =>
            option
                .setName("content")
                .setDescription("something...")
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        interaction.deferReply();

        const content = interaction.options.getString("content");

        const simsimi = await axios({
            method: "GET",
            baseURL: `https://api.simsimi.net/v2/?text=${content}&lc=vn`,
        });

        if (simsimi.data?.success) {
            return interaction.editReply({
                content: `${bold(`Q: ${content}`)}\n${italic(
                    `A: ${simsimi.data?.success}`
                )}`,
            });
        } else {
            const embed = new EmbedBuilder().setColor("Random").setTimestamp();
            embed.setTitle(`${content} not found the answer`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
