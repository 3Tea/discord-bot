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
        .setName("hentaifox")
        .setDescription("Gets random doujinshi on hentaifox")
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
                .setDescription("Random H and D from hentaifox")
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

            let hentaiFox;

            await interaction.deferReply();

            if (subcommand != "random") {
                hentaiFox = await axios.get(
                    `${SERVER_HD}hentaifox/get?book=${data.options[0].value}`
                );
            } else {
                hentaiFox = await axios.get(`${SERVER_HD}hentaifox/random`);
            }

            // console.log(hentaiFox);

            if (hentaiFox.data?.data) {
                const result = hentaiFox.data.data;
                console.log(result);
                const nhentaiEmbed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`https://hentaifox.com/gallery/${result.id}`)
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
                        },
                        {
                            name: "Update",
                            value: `${
                                result.upload_date &&
                                result.upload_date.length != 0
                                    ? result.upload_date
                                    : "update..."
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
                            .setCustomId(`${BUTTON_ID.hentaiFoxRead}`)
                            .setLabel("Read")
                            .setStyle(ButtonStyle.Primary)
                    );
                    await redis.setJson(
                        `${BUTTON_ID.hentaiFoxRead}_${result.id}`,
                        result.image,
                        60 * 10
                    );
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${BUTTON_ID.hentaiFoxRead}`)
                            .setLabel(
                                "Please read it online. There are too many pages."
                            )
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setURL(`https://hentaifox.com/gallery/${result.id}`)
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
