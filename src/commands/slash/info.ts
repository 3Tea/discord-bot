import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import infoBot from "../../../package.json";
import reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Information about bot")
        .addSubcommand((subcommand) =>
            subcommand.setName("bot").setDescription("Information about bot")
        ),
    // .addSubcommand((subcommand) =>
    //     subcommand
    //         .setName("author")
    //         .setDescription("Information about author")
    // ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        console.log(subcommand);

        switch (subcommand) {
            case "bot":
                embed.setTitle(`3AT - Endless Paradox`);
                embed.addFields(
                    {
                        name: "Name: ",
                        value: `3AT - Endless Paradox`,
                        inline: true,
                    },
                    {
                        name: "Version: ",
                        value: `${infoBot.version}`,
                        inline: true,
                    },
                    {
                        name: "Language: ",
                        value: `Typescript: 4.9.4`,
                        inline: true,
                    },
                    {
                        name: "Node.js: ",
                        value: `Node.js: 18.12.1`,
                        inline: true,
                    },
                    {
                        name: "Discord: ",
                        value: `Discord.js: 14.7.1`,
                        inline: true,
                    }
                    // {
                    //     name: "Homepage: ",
                    //     value: `${infoBot.homepage}`,
                    //     inline: true,
                    // },
                    // {
                    //     name: "Bugs: ",
                    //     value: `${infoBot.bugs.url}`,
                    //     inline: true,
                    // },
                    // {
                    //     name: "Discussions: ",
                    //     value: `${infoBot.discussions}`,
                    //     inline: true,
                    // }
                );
                break;

            default:
                break;
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

        const row = new ActionRowBuilder().addComponents(
            homepage,
            discussions,
            reportBug
        );
        await reply.embedButtons(interaction, embed, row);
        return;
    },
};

export function getInfoBot(interaction: ChatInputCommandInteraction) {
    return interaction.client.guilds.cache.reduce(
        (a, g) => a + g.memberCount,
        0
    );
}
