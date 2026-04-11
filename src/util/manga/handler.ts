import axios from "axios";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { setTimeout as wait } from "node:timers/promises";

import redis from "../../connector/redis/index";
import { FOOTER, SERVER_HD, SUPPORT_SERVER_LINK, URL_REPORT_BUG } from "../../util/config";
import { BUTTON_ID } from "../../util/config/button";
import { resolveLocale } from "../i18n/locale";
import { t } from "../i18n/t";
import { descriptionLocales } from "../i18n/commandLocales";
import log from "../../util/log/logger.mixed";
import type { MangaSource } from "./sources";

const CACHE_TTL = 60 * 10; // 10 minutes
const BUTTON_REMOVE_DELAY = 20_000; // 20 seconds
const MAX_READ_PAGES = 30;

export function mangaCommand(source: MangaSource) {
    const builder = new SlashCommandBuilder()
        .setName(source.name)
        .setDescription(source.description)
        .setDescriptionLocalizations(descriptionLocales("cmd.manga.desc", { source: source.name }))
        .addSubcommand((sub) =>
            sub
                .setName("read")
                .setDescription("Read H manga and D")
                .setDescriptionLocalizations(descriptionLocales("cmd.manga.read.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("id")
                        .setDescription("The ID you wanna read")
                        .setDescriptionLocalizations(descriptionLocales("cmd.manga.read.id.desc"))
                        .setRequired(true)
                )
        );

    if (source.supportsRandom) {
        builder.addSubcommand((sub) =>
            sub
                .setName("random")
                .setDescription(`Random H and D from ${source.name}`)
                .setDescriptionLocalizations(descriptionLocales("cmd.manga.random.desc", { source: source.name }))
        );
    }

    return {
        data: builder,

        async execute(interaction: ChatInputCommandInteraction): Promise<void> {
            const locale = await resolveLocale(interaction);

            try {
                if (!(interaction.channel as TextChannel)?.nsfw) {
                    await interaction.reply({ content: t(locale, "manga.nsfw_only"), ephemeral: true });
                    return;
                }

                const subcommand = interaction.options.getSubcommand(true);
                await interaction.deferReply();

                const apiUrl =
                    subcommand === "random"
                        ? `${SERVER_HD}${source.apiPath}/random`
                        : `${SERVER_HD}${source.apiPath}/get?book=${interaction.options.getInteger("id", true)}`;

                const response = await axios.get(apiUrl);

                if (!response.data?.data) return;

                const result = response.data.data;

                const embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`${source.urlBase}${result.id}`)
                    .setImage(result.image[0])
                    .addFields(source.fields(result))
                    .setDescription(`${result.id}`)
                    .setTimestamp()
                    .setFooter(FOOTER.text ? { text: FOOTER.text, iconURL: FOOTER.icon } : null);

                const row = new ActionRowBuilder<ButtonBuilder>();

                if (result.total < MAX_READ_PAGES) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.MANGA_READ)
                            .setLabel(t(locale, "manga.read"))
                            .setStyle(ButtonStyle.Primary)
                    );
                    await redis.setJson(`${BUTTON_ID.MANGA_READ}_${result.id}`, result.image, CACHE_TTL);
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.MANGA_READ)
                            .setLabel(t(locale, "manga.premium_only"))
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setURL(`${source.urlBase}${result.id}`)
                        .setLabel(t(locale, "manga.read_online"))
                        .setStyle(ButtonStyle.Link)
                );

                await interaction.editReply({ embeds: [embed], components: [row] });
                await wait(BUTTON_REMOVE_DELAY);
                await interaction.editReply({ components: [] });
            } catch (error) {
                log(`[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                const row = new ActionRowBuilder<ButtonBuilder>();
                row.addComponents(
                    new ButtonBuilder()
                        .setURL(URL_REPORT_BUG)
                        .setLabel(t(locale, "manga.report_issue"))
                        .setStyle(ButtonStyle.Link)
                );
                if (SUPPORT_SERVER_LINK) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setURL(SUPPORT_SERVER_LINK)
                            .setLabel(t(locale, "manga.support_server"))
                            .setStyle(ButtonStyle.Link)
                    );
                }
                await interaction.editReply({
                    content: t(locale, "manga.premium_only"),
                    components: [row],
                });
            }
        },
    };
}
