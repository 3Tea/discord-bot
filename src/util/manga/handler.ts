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
import type { SupportedLocale } from "../i18n/index";
import log from "../../util/log/logger.mixed";
import WalletService, { InsufficientStarError } from "../../services/economy/wallet.service";
import type { MangaSource } from "./sources";

const CACHE_TTL = 60 * 10; // 10 minutes
const BUTTON_REMOVE_DELAY = 20_000; // 20 seconds
const MAX_READ_PAGES = 30;
const FREE_DAILY_USES = 3;
const STAR_COST = 1;

function secondsUntilUTCMidnight(): number {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
}

/**
 * Checks free-use counter and deducts a star if exhausted.
 * Returns `true` if a star was charged, `false` if a free use was consumed.
 * Throws `InsufficientStarError` when the user has no free uses and no stars.
 */
async function applyStarCharge(userId: string, sourceName: string): Promise<boolean> {
    const freeKey = `manga_free:${userId}`;
    const usedToday = (await redis.getJson(freeKey)) as number | null;

    if (usedToday !== null && usedToday >= FREE_DAILY_USES) {
        await WalletService.deductStar(userId, STAR_COST, "command_charge", { command: sourceName });
        return true;
    }

    const newCount = (usedToday ?? 0) + 1;
    await redis.setJson(freeKey, newCount, secondsUntilUTCMidnight());
    return false;
}

/** Refunds a star charge or decrements the free-use counter on command error. */
async function refundCharge(userId: string, sourceName: string, charged: boolean): Promise<void> {
    if (charged) {
        await WalletService.addStar(userId, STAR_COST, "command_refund", { command: sourceName });
        return;
    }
    const freeKey = `manga_free:${userId}`;
    const current = (await redis.getJson(freeKey)) as number | null;
    if (current && current > 0) {
        await redis.setJson(freeKey, current - 1, secondsUntilUTCMidnight());
    }
}

function buildResultRow(
    result: { total: number; id: string | number; image: string[] },
    source: MangaSource,
    locale: SupportedLocale
): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (result.total < MAX_READ_PAGES) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.MANGA_READ)
                .setLabel(t(locale, "manga.read"))
                .setStyle(ButtonStyle.Primary)
        );
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

    return row;
}

function buildErrorRow(locale: SupportedLocale): ActionRowBuilder<ButtonBuilder> {
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
    return row;
}

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

            if (!(interaction.channel as TextChannel)?.nsfw) {
                await interaction.reply({ content: t(locale, "manga.nsfw_only"), ephemeral: true });
                return;
            }

            // Star charge gate — runs before deferReply so we can reply ephemeral
            let charged: boolean;
            try {
                charged = await applyStarCharge(interaction.user.id, source.name);
            } catch (error) {
                if (error instanceof InsufficientStarError) {
                    await interaction.reply({ content: t(locale, "manga.no_stars"), ephemeral: true });
                    return;
                }
                throw error;
            }

            try {
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

                const row = buildResultRow(result, source, locale);
                if (result.total < MAX_READ_PAGES) {
                    await redis.setJson(`${BUTTON_ID.MANGA_READ}_${result.id}`, result.image, CACHE_TTL);
                }

                await interaction.editReply({ embeds: [embed], components: [row] });
                await wait(BUTTON_REMOVE_DELAY);
                await interaction.editReply({ components: [] });
            } catch (error) {
                log(`[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                try {
                    await refundCharge(interaction.user.id, source.name, charged);
                } catch (refundError) {
                    log(`[manga:${source.name}] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`, "error");
                }
                await interaction.editReply({
                    content: t(locale, "manga.premium_only"),
                    components: [buildErrorRow(locale)],
                });
            }
        },
    };
}
