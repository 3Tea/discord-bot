import axios from "axios";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
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
import PremiumService from "../../services/premium/premium.service";
import type { TierConfig } from "../../services/premium/premium.config";
import { secondsUntilUTCMidnight } from "../date/utc";
import type { MangaSource } from "./sources";
import { buildPremiumButton } from "../premium/upgradeButton";
import { checkMangaLock } from "./lock";
import { setMangaCache } from "./cache";

const BUTTON_REMOVE_DELAY = 20_000; // 20 seconds
const STAR_COST = 1;
const AXIOS_TIMEOUT_MS = 8000;

/**
 * Checks free-use counter and deducts a star if exhausted.
 * Returns `true` if a star was charged, `false` if a free use was consumed.
 * Throws `InsufficientStarError` when the user has no free uses and no stars.
 */
async function applyStarCharge(
    userId: string,
    sourceName: string,
    tierConfig: TierConfig
): Promise<boolean> {
    const freeLimit = tierConfig.mangaFreeUses;

    if (!Number.isFinite(freeLimit)) return false;

    const freeKey = `manga_free:${userId}`;
    const newCount = await redis.incrKey(freeKey, secondsUntilUTCMidnight());

    if (newCount > freeLimit) {
        try {
            await WalletService.deductStar(userId, STAR_COST, "command_charge", { command: sourceName });
        } catch (error) {
            // Rollback the free-use counter so the failed charge doesn't burn a slot
            const current = (await redis.getJson(freeKey)) as number | null;
            if (current && current > 0) {
                await redis.setJson(freeKey, current - 1, secondsUntilUTCMidnight());
            }
            throw error;
        }
        return true;
    }

    return false;
}

/** Refunds a star charge or decrements the free-use counter on command error. */
export async function refundCharge(userId: string, sourceName: string, charged: boolean): Promise<void> {
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
    locale: SupportedLocale,
    maxPages: number
): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (result.total <= maxPages) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(BUTTON_ID.MANGA_READ)
                .setLabel(t(locale, "manga.read"))
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        row.addComponents(buildPremiumButton(locale));
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
        new ButtonBuilder().setURL(URL_REPORT_BUG).setLabel(t(locale, "manga.report_issue")).setStyle(ButtonStyle.Link)
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
                await interaction.reply({ content: t(locale, "manga.nsfw_only"), flags: MessageFlags.Ephemeral });
                return;
            }

            const lockStatus = await checkMangaLock(interaction.user.id);
            if (lockStatus.locked) {
                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle(t(locale, "manga.locked.title"))
                    .setDescription(
                        t(locale, "manga.locked.description", {
                            title: lockStatus.title ?? "",
                            seconds: lockStatus.seconds ?? 0,
                        })
                    );
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            const tierConfig = await PremiumService.getConfig(interaction.user.id);

            // Star charge gate — runs before deferReply so we can reply ephemeral
            let charged = false;
            try {
                charged = await applyStarCharge(interaction.user.id, source.name, tierConfig);
            } catch (error) {
                if (error instanceof InsufficientStarError) {
                    const embed = new EmbedBuilder().setDescription(t(locale, "manga.no_stars")).setColor(0xed4245);
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buildPremiumButton(locale));
                    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
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

                const response = await axios.get(apiUrl, { timeout: AXIOS_TIMEOUT_MS });
                if (!response.data?.data) {
                    throw new Error("Upstream response missing data payload");
                }

                const result = response.data.data;

                if (!Array.isArray(result.image) || result.image.length === 0) {
                    throw new Error("Upstream response contained no images");
                }

                const embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`${source.urlBase}${result.id}`)
                    .setImage(result.image[0])
                    .addFields(source.fields(result))
                    .setDescription(`${result.id}`)
                    .setTimestamp()
                    .setFooter(FOOTER.text ? { text: FOOTER.text, iconURL: FOOTER.icon } : null);

                const row = buildResultRow(result, source, locale, tierConfig.mangaMaxPages);
                if (result.total <= tierConfig.mangaMaxPages) {
                    await setMangaCache(result.id, {
                        ownerId: interaction.user.id,
                        charged,
                        images: result.image,
                    });
                }

                await interaction.editReply({ embeds: [embed], components: [row] });
                await wait(BUTTON_REMOVE_DELAY);
                try {
                    await interaction.editReply({ components: [] });
                } catch {
                    // Best-effort cleanup — message may have been deleted during the wait.
                }
            } catch (error) {
                log(`[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                try {
                    await refundCharge(interaction.user.id, source.name, charged);
                } catch (refundError) {
                    log(
                        `[manga:${source.name}] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`,
                        "error"
                    );
                }
                try {
                    await interaction.editReply({
                        content: t(locale, "manga.load_failed"),
                        components: [buildErrorRow(locale)],
                    });
                } catch {
                    // Original interaction expired or message was deleted — nothing to edit.
                }
            }
        },
    };
}
