"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mangaRead = mangaRead;
const discord_js_1 = require("discord.js");
const config_1 = require("../../util/config");
const locale_1 = require("../i18n/locale");
const t_1 = require("../i18n/t");
const logger_mixed_1 = __importDefault(require("../../util/log/logger.mixed"));
const lock_1 = require("./lock");
const cache_1 = require("./cache");
const handler_1 = require("./handler");
async function replyEphemeral(interaction, content) {
    await interaction.reply({ content, flags: discord_js_1.MessageFlags.Ephemeral });
}
async function mangaRead(interaction) {
    const locale = await (0, locale_1.resolveLocale)(interaction);
    const channel = interaction.channel;
    if (!channel || channel.type !== discord_js_1.ChannelType.GuildText) {
        await replyEphemeral(interaction, (0, t_1.t)(locale, "manga.reader.channel_unsupported"));
        return;
    }
    const textChannel = channel;
    if (!textChannel.nsfw) {
        await replyEphemeral(interaction, (0, t_1.t)(locale, "manga.reader.nsfw_lost"));
        return;
    }
    const bookId = interaction.message.embeds[0]?.description;
    if (!bookId) {
        await replyEphemeral(interaction, (0, t_1.t)(locale, "manga.load_failed"));
        return;
    }
    const cacheEntry = await (0, cache_1.getMangaCache)(bookId);
    if (!cacheEntry) {
        // Cache expired or missing — nothing we can deliver and no charge record to refund.
        await replyEphemeral(interaction, (0, t_1.t)(locale, "manga.reader.overloaded"));
        return;
    }
    if (cacheEntry.ownerId !== interaction.user.id) {
        await replyEphemeral(interaction, (0, t_1.t)(locale, "manga.reader.not_owner"));
        return;
    }
    const title = interaction.message.embeds[0]?.title ?? "Thread";
    const lockStatus = await (0, lock_1.acquireMangaLock)(interaction.user.id, title, cacheEntry.images.length);
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
    let sentAny = false;
    try {
        await interaction.deferUpdate();
        // Remove the Read button immediately so it can't be re-clicked.
        await interaction.editReply({ components: [] }).catch(() => { });
        // Single-use cache: clear so a second click cannot re-trigger delivery.
        await (0, cache_1.clearMangaCache)(bookId);
        const thread = await textChannel.threads.create({
            name: title.length < 100 ? title : title.substring(0, 100),
            startMessage: interaction.message,
            autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneHour,
            reason: config_1.FOOTER.text,
        });
        if (thread.joinable)
            await thread.join();
        await thread.members.add(interaction.user.id);
        await thread.send((0, t_1.t)(locale, "manga.reader.disclaimer"));
        const total = cacheEntry.images.length;
        for (const [index, image] of cacheEntry.images.entries()) {
            const safeTimestamp = new Date().toISOString().replace(/[:/]/g, "-");
            await thread.send({
                content: (0, t_1.t)(locale, "manga.reader.page", { current: index + 1, total }),
                files: [
                    {
                        attachment: image,
                        name: `${config_1.SERVER_S}${safeTimestamp}_${index + 1}_${total}.png`,
                    },
                ],
            });
            sentAny = true;
        }
        // All pages delivered — release the lock before the cosmetic farewell so
        // a failed enjoy-send does not leak the lock.
        await (0, lock_1.releaseMangaLock)(interaction.user.id);
        await thread.send((0, t_1.t)(locale, "manga.reader.enjoy", { userId: interaction.user.id }));
    }
    catch (error) {
        (0, logger_mixed_1.default)(`[manga:read] ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        // Nothing delivered — refund the star (if any), release the lock, and
        // surface the failure to the user.
        if (!sentAny) {
            try {
                await (0, handler_1.refundCharge)(interaction.user.id, cacheEntry.sourceName, cacheEntry.charged);
            }
            catch (refundError) {
                (0, logger_mixed_1.default)(`[manga:read] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`, "error");
            }
            await (0, lock_1.releaseMangaLock)(interaction.user.id);
            await interaction
                .followUp({ content: (0, t_1.t)(locale, "manga.load_failed"), flags: discord_js_1.MessageFlags.Ephemeral })
                .catch(() => { });
        }
        // If sentAny, keep the lock so the user can finish in the thread naturally;
        // it will expire by TTL.
    }
}
