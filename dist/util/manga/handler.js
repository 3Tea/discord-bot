"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundCharge = refundCharge;
exports.mangaCommand = mangaCommand;
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const promises_1 = require("node:timers/promises");
const index_1 = __importDefault(require("../../connector/redis/index"));
const config_1 = require("../../util/config");
const button_1 = require("../../util/config/button");
const locale_1 = require("../i18n/locale");
const t_1 = require("../i18n/t");
const commandLocales_1 = require("../i18n/commandLocales");
const logger_mixed_1 = __importDefault(require("../../util/log/logger.mixed"));
const wallet_service_1 = __importStar(require("../../services/economy/wallet.service"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const utc_1 = require("../date/utc");
const upgradeButton_1 = require("../premium/upgradeButton");
const lock_1 = require("./lock");
const cache_1 = require("./cache");
const BUTTON_REMOVE_DELAY = 20_000; // 20 seconds
const STAR_COST = 1;
const AXIOS_TIMEOUT_MS = 8000;
/**
 * Checks free-use counter and deducts a star if exhausted.
 * Returns `true` if a star was charged, `false` if a free use was consumed.
 * Throws `InsufficientStarError` when the user has no free uses and no stars.
 */
async function applyStarCharge(userId, sourceName, tierConfig) {
    const freeLimit = tierConfig.mangaFreeUses;
    if (!Number.isFinite(freeLimit))
        return false;
    const freeKey = `manga_free:${userId}`;
    const newCount = await index_1.default.incrKey(freeKey, (0, utc_1.secondsUntilUTCMidnight)());
    if (newCount > freeLimit) {
        try {
            await wallet_service_1.default.deductStar(userId, STAR_COST, "command_charge", { command: sourceName });
        }
        catch (error) {
            // Rollback the free-use counter so the failed charge doesn't burn a slot
            const current = (await index_1.default.getJson(freeKey));
            if (current && current > 0) {
                await index_1.default.setJson(freeKey, current - 1, (0, utc_1.secondsUntilUTCMidnight)());
            }
            throw error;
        }
        return true;
    }
    return false;
}
/** Refunds a star charge or decrements the free-use counter on command error. */
async function refundCharge(userId, sourceName, charged) {
    if (charged) {
        await wallet_service_1.default.addStar(userId, STAR_COST, "command_refund", { command: sourceName });
        return;
    }
    const freeKey = `manga_free:${userId}`;
    const current = (await index_1.default.getJson(freeKey));
    if (current && current > 0) {
        await index_1.default.setJson(freeKey, current - 1, (0, utc_1.secondsUntilUTCMidnight)());
    }
}
function buildResultRow(result, source, locale, maxPages) {
    const row = new discord_js_1.ActionRowBuilder();
    if (result.total <= maxPages) {
        row.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(button_1.BUTTON_ID.MANGA_READ)
            .setLabel((0, t_1.t)(locale, "manga.read"))
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    else {
        row.addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
    }
    row.addComponents(new discord_js_1.ButtonBuilder()
        .setURL(`${source.urlBase}${result.id}`)
        .setLabel((0, t_1.t)(locale, "manga.read_online"))
        .setStyle(discord_js_1.ButtonStyle.Link));
    return row;
}
function buildErrorRow(locale) {
    const row = new discord_js_1.ActionRowBuilder();
    row.addComponents(new discord_js_1.ButtonBuilder().setURL(config_1.URL_REPORT_BUG).setLabel((0, t_1.t)(locale, "manga.report_issue")).setStyle(discord_js_1.ButtonStyle.Link));
    if (config_1.SUPPORT_SERVER_LINK) {
        row.addComponents(new discord_js_1.ButtonBuilder()
            .setURL(config_1.SUPPORT_SERVER_LINK)
            .setLabel((0, t_1.t)(locale, "manga.support_server"))
            .setStyle(discord_js_1.ButtonStyle.Link));
    }
    return row;
}
function mangaCommand(source) {
    const builder = new discord_js_1.SlashCommandBuilder()
        .setName(source.name)
        .setDescription(source.description)
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.manga.desc", { source: source.name }))
        .addSubcommand((sub) => sub
        .setName("read")
        .setDescription("Read H manga and D")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.manga.read.desc"))
        .addIntegerOption((opt) => opt
        .setName("id")
        .setDescription("The ID you wanna read")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.manga.read.id.desc"))
        .setRequired(true)));
    if (source.supportsRandom) {
        builder.addSubcommand((sub) => sub
            .setName("random")
            .setDescription(`Random H and D from ${source.name}`)
            .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.manga.random.desc", { source: source.name })));
    }
    return {
        data: builder,
        async execute(interaction) {
            const locale = await (0, locale_1.resolveLocale)(interaction);
            if (!interaction.channel?.nsfw) {
                await interaction.reply({ content: (0, t_1.t)(locale, "manga.nsfw_only"), flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            const lockStatus = await (0, lock_1.checkMangaLock)(interaction.user.id);
            if (lockStatus.locked) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle((0, t_1.t)(locale, "manga.locked.title"))
                    .setDescription((0, t_1.t)(locale, "manga.locked.description", {
                    title: lockStatus.title ?? "",
                    seconds: lockStatus.seconds ?? 0,
                }));
                await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            const tierConfig = await premium_service_1.default.getConfig(interaction.user.id);
            // Star charge gate — runs before deferReply so we can reply ephemeral
            let charged = false;
            try {
                charged = await applyStarCharge(interaction.user.id, source.name, tierConfig);
            }
            catch (error) {
                if (error instanceof wallet_service_1.InsufficientStarError) {
                    const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "manga.no_stars")).setColor(0xed4245);
                    const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
                    await interaction.reply({ embeds: [embed], components: [row], flags: discord_js_1.MessageFlags.Ephemeral });
                    return;
                }
                throw error;
            }
            try {
                const subcommand = interaction.options.getSubcommand(true);
                await interaction.deferReply();
                const apiUrl = subcommand === "random"
                    ? `${config_1.SERVER_HD}${source.apiPath}/random`
                    : `${config_1.SERVER_HD}${source.apiPath}/get?book=${interaction.options.getInteger("id", true)}`;
                const response = await axios_1.default.get(apiUrl, { timeout: AXIOS_TIMEOUT_MS });
                if (!response.data?.data) {
                    throw new Error("Upstream response missing data payload");
                }
                const result = response.data.data;
                if (!Array.isArray(result.image) || result.image.length === 0) {
                    throw new Error("Upstream response contained no images");
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`${source.urlBase}${result.id}`)
                    .setImage(result.image[0])
                    .addFields(source.fields(result))
                    .setDescription(`${result.id}`)
                    .setTimestamp()
                    .setFooter(config_1.FOOTER.text ? { text: config_1.FOOTER.text, iconURL: config_1.FOOTER.icon } : null);
                const row = buildResultRow(result, source, locale, tierConfig.mangaMaxPages);
                if (result.total <= tierConfig.mangaMaxPages) {
                    await (0, cache_1.setMangaCache)(result.id, {
                        ownerId: interaction.user.id,
                        charged,
                        sourceName: source.name,
                        images: result.image,
                    });
                }
                await interaction.editReply({ embeds: [embed], components: [row] });
                await (0, promises_1.setTimeout)(BUTTON_REMOVE_DELAY);
                try {
                    await interaction.editReply({ components: [] });
                }
                catch {
                    // Best-effort cleanup — message may have been deleted during the wait.
                }
            }
            catch (error) {
                (0, logger_mixed_1.default)(`[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                try {
                    await refundCharge(interaction.user.id, source.name, charged);
                }
                catch (refundError) {
                    (0, logger_mixed_1.default)(`[manga:${source.name}] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`, "error");
                }
                try {
                    await interaction.editReply({
                        content: (0, t_1.t)(locale, "manga.load_failed"),
                        components: [buildErrorRow(locale)],
                    });
                }
                catch {
                    // Original interaction expired or message was deleted — nothing to edit.
                }
            }
        },
    };
}
