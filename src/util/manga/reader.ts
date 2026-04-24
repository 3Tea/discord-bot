import {
    ButtonInteraction,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    TextChannel,
    ThreadAutoArchiveDuration,
} from "discord.js";

import { FOOTER, SERVER_S } from "../../util/config";
import { resolveLocale } from "../i18n/locale";
import { t } from "../i18n/t";
import log from "../../util/log/logger.mixed";
import { acquireMangaLock, releaseMangaLock } from "./lock";
import { clearMangaCache, getMangaCache } from "./cache";
import { refundCharge } from "./handler";

async function replyEphemeral(interaction: ButtonInteraction, content: string): Promise<void> {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function mangaRead(interaction: ButtonInteraction): Promise<void> {
    const locale = await resolveLocale(interaction);

    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
        await replyEphemeral(interaction, t(locale, "manga.reader.channel_unsupported"));
        return;
    }

    const textChannel = channel as TextChannel;
    if (!textChannel.nsfw) {
        await replyEphemeral(interaction, t(locale, "manga.reader.nsfw_lost"));
        return;
    }

    const bookId = interaction.message.embeds[0]?.description;
    if (!bookId) {
        await replyEphemeral(interaction, t(locale, "manga.load_failed"));
        return;
    }

    const cacheEntry = await getMangaCache(bookId);
    if (!cacheEntry) {
        // Cache expired or missing — nothing we can deliver and no charge record to refund.
        await replyEphemeral(interaction, t(locale, "manga.reader.overloaded"));
        return;
    }

    if (cacheEntry.ownerId !== interaction.user.id) {
        await replyEphemeral(interaction, t(locale, "manga.reader.not_owner"));
        return;
    }

    const title = interaction.message.embeds[0]?.title ?? "Thread";
    const lockStatus = await acquireMangaLock(interaction.user.id, title, cacheEntry.images.length);
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

    let sentAny = false;
    try {
        await interaction.deferUpdate();

        // Remove the Read button immediately so it can't be re-clicked.
        await interaction.editReply({ components: [] }).catch(() => {});

        // Single-use cache: clear so a second click cannot re-trigger delivery.
        await clearMangaCache(bookId);

        const thread = await textChannel.threads.create({
            name: title.length < 100 ? title : title.substring(0, 100),
            startMessage: interaction.message,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            reason: FOOTER.text,
        });

        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);

        await thread.send(t(locale, "manga.reader.disclaimer"));

        const total = cacheEntry.images.length;
        for (const [index, image] of cacheEntry.images.entries()) {
            const safeTimestamp = new Date().toISOString().replace(/[:/]/g, "-");
            await thread.send({
                content: t(locale, "manga.reader.page", { current: index + 1, total }),
                files: [
                    {
                        attachment: image,
                        name: `${SERVER_S}${safeTimestamp}_${index + 1}_${total}.png`,
                    },
                ],
            });
            sentAny = true;
        }

        // All pages delivered — release the lock before the cosmetic farewell so
        // a failed enjoy-send does not leak the lock.
        await releaseMangaLock(interaction.user.id);
        await thread.send(t(locale, "manga.reader.enjoy", { userId: interaction.user.id }));
    } catch (error) {
        log(`[manga:read] ${error instanceof Error ? error.message : "Unknown error"}`, "error");

        // Nothing delivered — refund the star (if any), release the lock, and
        // surface the failure to the user.
        if (!sentAny) {
            try {
                await refundCharge(interaction.user.id, cacheEntry.sourceName, cacheEntry.charged);
            } catch (refundError) {
                log(
                    `[manga:read] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`,
                    "error"
                );
            }
            await releaseMangaLock(interaction.user.id);
            await interaction
                .followUp({ content: t(locale, "manga.load_failed"), flags: MessageFlags.Ephemeral })
                .catch(() => {});
        }
        // If sentAny, keep the lock so the user can finish in the thread naturally;
        // it will expire by TTL.
    }
}
