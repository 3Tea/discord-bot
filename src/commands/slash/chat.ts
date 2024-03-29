import axios from "axios";
import {
    bold,
    ChatInputCommandInteraction,
    EmbedBuilder,
    italic,
    SlashCommandBuilder,
} from "discord.js";

import { KEY_CHAT } from "../../util/config";

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

        try {
            const simsimi = await axios({
                method: "GET",
                baseURL: `https://api.simsimi.net/v2/?text=${encodeURI(
                    content
                )}&lc=vn&key=${KEY_CHAT}`,
                headers: { "Accept-Encoding": "gzip,deflate,compress" },
            });

            if (simsimi && simsimi.data?.success) {
                return interaction.editReply({
                    content: `${bold(`Q: ${content}`)}\n${italic(
                        `A: ${simsimi.data?.success}`
                    )}`,
                });
            } else {
                const embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTimestamp();
                embed.setTitle(`${content} not found the answer`);
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            const embed = new EmbedBuilder().setColor("Random").setTimestamp();
            embed.setTitle(`${content} not found the answer`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
