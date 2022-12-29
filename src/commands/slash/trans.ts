import axios from "axios";
import {
    bold,
    ChatInputCommandInteraction,
    EmbedBuilder,
    italic,
    SlashCommandBuilder,
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("trans")
        .setDescription("Translate all languages to Vietnamese")
        .addStringOption((option) =>
            option
                .setName("content")
                .setDescription("Text you wanna...")
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
