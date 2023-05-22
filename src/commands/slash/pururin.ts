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
import { BUTTON_ID } from "../../util/config/button";

const wait = require("node:timers/promises").setTimeout;

export default {
    data: new SlashCommandBuilder()
        .setName("pururin")
        .setDescription("Gets random doujinshi on pururin")
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
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("random")
                .setDescription("Random H and D from pururin")
        ),
    async execute(interaction: ChatInputCommandInteraction | any) {
        try {
            if (!interaction.channel?.nsfw) {
                await interaction.reply(`Only NSFW channel`);
                return;
            }
            const subcommand = interaction.options.getSubcommand(true);
            const data = interaction.options.data.find(
                (e: any) => e.name === subcommand
            );

            let pururin;

            await interaction.deferReply();

            if (subcommand != "random") {
                pururin = await axios.get(
                    `${SERVER_HD}pururin/get?book=${data.options[0].value}`
                );
            } else {
                pururin = await axios.get(`${SERVER_HD}pururin/random`);
            }

            console.log(pururin);

            if (pururin.data?.data) {
                const result = pururin.data.data;
                console.log(result);
                const nhentaiEmbed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`https://pururin.to/gallery/${result.id}`)
                    .setImage(result.image[0])
                    .addFields(
                        {
                            name: `Title: `,
                            value: `${result.title}`,
                        },
                        {
                            name: "Total of pages",
                            value: `${result.total}`,
                            inline: true,
                        },
                        {
                            name: "Tags",
                            value: `${
                                result.tags && result.tags.length != 0
                                    ? result.tags
                                    : "Update..."
                            }`,
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
                            .setCustomId(`${BUTTON_ID.pururinRead}`)
                            .setLabel("Read")
                            .setStyle(ButtonStyle.Primary)
                    );
                    await redis.setJson(
                        `${BUTTON_ID.pururinRead}_${result.id}`,
                        result.image,
                        60 * 10
                    );
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${BUTTON_ID.pururinRead}`)
                            .setLabel(
                                "Please read it online. There are too many pages."
                            )
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setURL(`https://pururin.to/gallery/${result.id}`)
                        .setLabel("Read Online")
                        .setStyle(ButtonStyle.Link)
                );

                // console.log(interaction);
                await interaction.editReply({
                    embeds: [nhentaiEmbed],
                    components: [row],
                });
                await wait(20000);
                await interaction.editReply({
                    components: [],
                });
                return;
            }
            return;
        } catch (error) {
            console.log(error);
            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(
                new ButtonBuilder()
                    .setURL(`${process.env.URL_REPORT_BUG}`)
                    .setLabel("Report this issue")
                    .setStyle(ButtonStyle.Link)
            );
            await interaction.editReply({
                content: `Server maintenance`,
                components: [row],
            });
        }
    },
};
