import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";
import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        embed.setTitle(`3AT - Endless Paradox 💖 Slash CMD Support`);

        for (const i of client.commands) {
            const field = i[1].data.toJSON();
            embed.addFields({
                name: field.name,
                value: field.description,
            });
        }

        const homepage = new ButtonBuilder()
            .setLabel("Homepage")
            .setURL(`${process.env.URL_HOMEPAGE}`)
            .setStyle(ButtonStyle.Link);

        const discussions = new ButtonBuilder()
            .setLabel("Discussions")
            .setURL(`${process.env.URL_DISCUSSIONS}`)
            .setStyle(ButtonStyle.Link);

        const reportBug = new ButtonBuilder()
            .setLabel("Report bug")
            .setURL(`${process.env.URL_REPORT_BUG}`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            homepage,
            discussions,
            reportBug
        );
        return Reply.embedButtons(interaction, embed, row);
    },
};
