import axios from "axios";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { isValidObjectId } from "mongoose";

import redis from "../../connector/redis";
import ConfessionModel, { IConfession, IConfessionImage } from "../../models/confession.model";
import GuildConfessionConfigModel, {
    ConfessionMode,
    IGuildConfessionConfig,
} from "../../models/guildConfessionConfig.model";
import { FOOTER } from "../../util/config/index";
import { BUTTON_ID } from "../../util/config/button";
import { logger } from "../../util/log/logger.mixed";
import {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    confessionCooldownRedisKey,
} from "./constants";

export type { ConfessionMode } from "../../models/guildConfessionConfig.model";
export {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_DEFAULT,
} from "./constants";
export { CONFESSION_VIP_COST_GEM, CONFESSION_SKIP_CD_COST_COIN } from "./constants";

function applyConfessionFooter(embed: EmbedBuilder): void {
    if (FOOTER.text) {
        embed.setFooter({
            text: FOOTER.text,
            ...(FOOTER.icon ? { iconURL: FOOTER.icon } : {}),
        });
    }
}

export async function getGuildConfessionConfig(guildId: string): Promise<IGuildConfessionConfig | null> {
    return GuildConfessionConfigModel.findOne({ guildId }).exec();
}

export async function upsertGuildConfessionConfig(input: {
    guildId: string;
    enabled: boolean;
    mode: ConfessionMode;
    publicChannelId: string;
    reviewChannelId: string | null;
    cooldownMinutes: number;
}): Promise<IGuildConfessionConfig> {
    if (input.mode === "review" && !input.reviewChannelId) {
        throw new Error("REVIEW_CHANNEL_REQUIRED");
    }
    const clamped = Math.min(CONFESSION_COOLDOWN_MAX, Math.max(CONFESSION_COOLDOWN_MIN, input.cooldownMinutes));
    const doc = await GuildConfessionConfigModel.findOneAndUpdate(
        { guildId: input.guildId },
        {
            $set: {
                enabled: input.enabled,
                mode: input.mode,
                publicChannelId: input.publicChannelId,
                reviewChannelId: input.reviewChannelId,
                cooldownMinutes: clamped,
            },
            $setOnInsert: { lastConfessionNumber: 0 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
    if (!doc) {
        throw new Error("UPSERT_FAILED");
    }
    return doc;
}

export async function reserveNextConfessionNumber(guildId: string): Promise<number> {
    const updated = await GuildConfessionConfigModel.findOneAndUpdate(
        { guildId },
        { $inc: { lastConfessionNumber: 1 } },
        { new: true }
    ).exec();
    if (!updated) {
        throw new Error("CONFIG_MISSING");
    }
    return updated.lastConfessionNumber;
}

export async function isConfessionOnCooldown(guildId: string, userId: string): Promise<boolean> {
    const key = confessionCooldownRedisKey(guildId, userId);
    const raw = await redis.getKey(key);
    if (raw) return true;
    const ttl = await redis.ttlKey(key);
    return ttl > 0;
}

export async function getConfessionCooldownRemainingSeconds(guildId: string, userId: string): Promise<number> {
    const key = confessionCooldownRedisKey(guildId, userId);
    return redis.ttlKey(key);
}

export async function setConfessionCooldown(guildId: string, userId: string, cooldownMinutes: number): Promise<void> {
    const key = confessionCooldownRedisKey(guildId, userId);
    const ttlSeconds = Math.max(1, Math.round(cooldownMinutes * 60));
    await redis.setKey(key, "1", ttlSeconds);
}

export function validateConfessionAttachment(
    att: { url: string; name: string | null; contentType: string | null } | null | undefined
): { ok: true; image: IConfessionImage | null } | { ok: false } {
    if (!att) return { ok: true, image: null };
    const ct = att.contentType ?? "";
    if (!ct.startsWith("image/")) return { ok: false };
    return {
        ok: true,
        image: {
            url: att.url,
            name: att.name,
            contentType: att.contentType,
        },
    };
}

export function buildPublicConfessionEmbed(confessionNumber: number, content: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`Anonymous Confession (#${confessionNumber})`)
        .setDescription(content.length > CONFESSION_CONTENT_MAX ? content.slice(0, CONFESSION_CONTENT_MAX) : content)
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}

export function buildVipPublicConfessionEmbed(confessionNumber: number, content: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✨ Confession (#${confessionNumber})`)
        .setDescription(content.length > CONFESSION_CONTENT_MAX ? content.slice(0, CONFESSION_CONTENT_MAX) : content)
        .setTimestamp();
    embed.setFooter({
        text: "VIP Confession",
        ...(FOOTER.icon ? { iconURL: FOOTER.icon } : {}),
    });
    return embed;
}

export function buildReviewConfessionEmbed(params: {
    confessionNumber: number;
    content: string;
    authorId: string;
    isVip?: boolean;
}): EmbedBuilder {
    const title = params.isVip
        ? `✨ Confession review (#${params.confessionNumber}) — VIP`
        : `Confession review (#${params.confessionNumber})`;
    const embed = new EmbedBuilder()
        .setColor(params.isVip ? 0xf1c40f : 0xe67e22)
        .setTitle(title)
        .setDescription(
            params.content.length > CONFESSION_CONTENT_MAX
                ? params.content.slice(0, CONFESSION_CONTENT_MAX)
                : params.content
        )
        .addFields({
            name: "Author (moderators only)",
            value: `<@${params.authorId}> — \`${params.authorId}\``,
        })
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}

export function buildReviewResolvedEmbed(
    kind: "approved" | "rejected",
    confessionNumber: number,
    contentPreview: string
): EmbedBuilder {
    const status = kind === "approved" ? "Approved & published" : "Rejected";
    const embed = new EmbedBuilder()
        .setColor(kind === "approved" ? 0x2ecc71 : 0xe74c3c)
        .setTitle(`Confession #${confessionNumber} — ${status}`)
        .setDescription(contentPreview.slice(0, 500))
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}

export async function buildConfessionAttachmentFiles(image: IConfessionImage | null): Promise<AttachmentBuilder[]> {
    if (!image) return [];
    try {
        const res = await axios.get<ArrayBuffer>(image.url, {
            responseType: "arraybuffer",
            timeout: 15_000,
            maxContentLength: 8 * 1024 * 1024,
        });
        const buf = Buffer.from(res.data);
        const name = image.name && image.name.length > 0 ? image.name : "image.png";
        return [new AttachmentBuilder(buf, { name })];
    } catch (error) {
        logger.warn(
            `confession: failed to download image for attachment: ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

export async function sendAnonymousConfessionToChannel(
    channel: TextChannel,
    confessionNumber: number,
    content: string,
    image: IConfessionImage | null,
    isVip = false
): Promise<{ messageId: string } | { error: true }> {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content)
            : buildPublicConfessionEmbed(confessionNumber, content);
        const files = await buildConfessionAttachmentFiles(image);
        const msg = await channel.send({ embeds: [embed], files: files.length ? files : undefined });
        return { messageId: msg.id };
    } catch (error) {
        logger.error(
            `confession: sendAnonymousConfessionToChannel failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return { error: true };
    }
}

export async function createPublishedConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    publicMessageId: string;
    isVip?: boolean;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        status: "published",
        reviewMessageId: null,
        publicMessageId: input.publicMessageId,
        resolvedAt: new Date(),
    });
}

export async function createPendingConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    isVip?: boolean;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        status: "pending",
        reviewMessageId: null,
        publicMessageId: null,
        resolvedAt: null,
    });
}

export async function setConfessionReviewMessageId(confessionId: string, reviewMessageId: string): Promise<void> {
    await ConfessionModel.findByIdAndUpdate(confessionId, { reviewMessageId }).exec();
}

export type ModerationResult =
    | { ok: true }
    | { ok: false; code: "invalid_id" | "not_found" | "not_pending" | "config" | "send_failed" };

export async function approveConfession(interaction: ButtonInteraction): Promise<ModerationResult> {
    const rawId = interaction.customId.split(":")[1];
    if (!rawId || !isValidObjectId(rawId)) {
        return { ok: false, code: "invalid_id" };
    }
    const guildId = interaction.guildId;
    if (!guildId || !interaction.guild) {
        return { ok: false, code: "not_found" };
    }

    const doc = await ConfessionModel.findById(rawId).exec();
    if (!doc || doc.guildId !== guildId) {
        return { ok: false, code: "not_found" };
    }
    if (doc.status !== "pending") {
        return { ok: false, code: "not_pending" };
    }

    const config = await getGuildConfessionConfig(guildId);
    if (!config) {
        return { ok: false, code: "config" };
    }

    const ch = await interaction.guild.channels.fetch(config.publicChannelId).catch(() => null);
    if (!ch || !ch.isTextBased() || ch.isDMBased()) {
        return { ok: false, code: "send_failed" };
    }

    const textChannel = ch as TextChannel;
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.isVip);
    if ("error" in sendResult) {
        return { ok: false, code: "send_failed" };
    }

    doc.status = "published";
    doc.publicMessageId = sendResult.messageId;
    doc.resolvedAt = new Date();
    await doc.save();

    try {
        await interaction.message.edit({
            embeds: [buildReviewResolvedEmbed("approved", doc.number, doc.content)],
            components: [],
        });
    } catch (error) {
        logger.warn(
            `confession: failed to edit review message after approve: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return { ok: true };
}

export async function rejectConfession(interaction: ButtonInteraction): Promise<ModerationResult> {
    const rawId = interaction.customId.split(":")[1];
    if (!rawId || !isValidObjectId(rawId)) {
        return { ok: false, code: "invalid_id" };
    }
    const guildId = interaction.guildId;
    if (!guildId) {
        return { ok: false, code: "not_found" };
    }

    const doc = await ConfessionModel.findById(rawId).exec();
    if (!doc || doc.guildId !== guildId) {
        return { ok: false, code: "not_found" };
    }
    if (doc.status !== "pending") {
        return { ok: false, code: "not_pending" };
    }

    doc.status = "rejected";
    doc.resolvedAt = new Date();
    await doc.save();

    try {
        await interaction.message.edit({
            embeds: [buildReviewResolvedEmbed("rejected", doc.number, doc.content)],
            components: [],
        });
    } catch (error) {
        logger.warn(
            `confession: failed to edit review message after reject: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return { ok: true };
}

export function buildConfessionReviewComponents(
    confessionMongoId: string,
    labels: { approve: string; reject: string }
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_APPROVE}:${confessionMongoId}`)
            .setLabel(labels.approve)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_REJECT}:${confessionMongoId}`)
            .setLabel(labels.reject)
            .setStyle(ButtonStyle.Danger)
    );
}
