import axios from "axios";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import redis from "../../connector/redis/index";
import { FOOTER, SERVER_HD } from "../../util/config";
import { ButtonId } from "../../util/config/button";

const wait = require("node:timers/promises").setTimeout;

export default {
    data: new SlashCommandBuilder()
        .setName("nhentai")
        .setDescription("H manga and D reader")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("read")
                .setDescription("Read H manga and D")
                .addIntegerOption((option) =>
                    option
                        .setName("id")
                        .setDescription("The ID you wanna read")
                        .setRequired(true)
                )
        ),
    // .addSubcommand((subcommand) =>
    //     subcommand
    //         .setName("search")
    //         .setDescription("Search H and D")
    //         .addStringOption((option) =>
    //             option
    //                 .setName("string")
    //                 .setDescription("The name of the H manga and D")
    //                 .setMaxLength(200)
    //                 .setRequired(true)
    //         )
    // ),
    async execute(interaction: ChatInputCommandInteraction | any) {
        if (!interaction.channel?.nsfw) {
            await interaction.reply(`Only NSFW channel`);
            return;
        }
        const subcommand = interaction.options.getSubcommand(true);
        const data = interaction.options.data.find(
            (e: any) => e.name === subcommand
        );

        const nhentai = await axios.get(
            `${SERVER_HD}nhentai/get?book=${data.options[0].value}`
        );

        if (nhentai.data?.data) {
            const result = nhentai.data.data;
            console.log(result);
            const nhentaiEmbed = new EmbedBuilder()
                .setColor("Random")
                .setTitle(result.title)
                .setURL(`https://nhentai.net/g/${result.id}`)
                .setImage(result.image[0])
                .addFields(
                    {
                        name: `Title: `,
                        value: `${result.optional_title.english}\n${result.optional_title.japanese}\n${result.optional_title.pretty}`,
                    },
                    {
                        name: "Language: ",
                        value: `${result.language}`,
                        inline: true,
                    },
                    {
                        name: "Artist",
                        value: `${result.artist}`,
                        inline: true,
                    },
                    {
                        name: "Total of pages",
                        value: `${result.total}`,
                        inline: true,
                    },
                    {
                        name: "Group: ",
                        value: `${result.group ? result.group : "update..."}`,
                        inline: true,
                    },
                    {
                        name: "Parodies: ",
                        value: `${
                            result.parodies ? result.parodies : "update..."
                        }`,
                        inline: true,
                    },
                    {
                        name: "Characters: ",
                        value: `${
                            result.characters.length != 0
                                ? result.characters
                                : `update...`
                        }`,
                        inline: true,
                    },
                    {
                        name: "Last updated: ",
                        value: `${result.upload_date}`,
                        inline: true,
                    }
                )
                .setDescription(`${result.id}`)
                .setTimestamp()
                .setFooter({
                    text: FOOTER.text,
                    iconURL: FOOTER.icon,
                });
            const row = new ActionRowBuilder<ButtonBuilder>();
            if (result.total < 50) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${ButtonId.nhtaiRead}`)
                        .setLabel("Read")
                        .setStyle(ButtonStyle.Primary)
                );
                await redis.setJson(
                    `${ButtonId.nhtaiRead}_${result.id}`,
                    result.image,
                    60 * 10
                );
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${ButtonId.nhtaiRead}`)
                        .setLabel("Please read online, Too many pages")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            }

            row.addComponents(
                new ButtonBuilder()
                    .setURL(`https://nhentai.net/g/${result.id}`)
                    .setLabel("Read Online")
                    .setStyle(ButtonStyle.Link)
            );

            await interaction.reply({
                embeds: [nhentaiEmbed],
                components: [row],
            });
            await wait(15000);
            await interaction.editReply({
                components: [],
            });
        }
        return;
    },
};
