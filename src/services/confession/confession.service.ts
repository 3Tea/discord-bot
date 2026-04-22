import axios from "axios";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { isValidObjectId } from "mongoose";
import type { UpdateQuery } from "mongoose";

import redis from "../../connector/redis";
import { secondsUntilUTCMidnight } from "../../util/date/utc";
import { BotOutputAudit } from "../audit/botOutputAudit.service";
import ConfessionModel, { ConfessionDoc, IConfession, IConfessionAudio, IConfessionImage } from "../../models/confession.model";
import GuildConfessionConfigModel, {
    ConfessionMode,
    IGuildConfessionConfig,
} from "../../models/guildConfessionConfig.model";
import ConfessionVoteModel from "../../models/confessionVote.model";
import ConfessionReplyModel from "../../models/confessionReply.model";
import ConfessionBanModel from "../../models/confessionBan.model";
import { FOOTER } from "../../util/config/index";
import { BUTTON_ID } from "../../util/config/button";
import { logger } from "../../util/log/logger.mixed";
import { resolveGuildLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    CONFESSION_REPLY_COST_COIN,
    CONFESSION_REPLY_MAX_LENGTH,
    CONFESSION_KEYWORD_MAX_LENGTH,
    CONFESSION_KEYWORDS_MAX_COUNT,
    CONFESSION_TAGS,
    AUDIO_CONTENT_TYPES,
    confessionCooldownRedisKey,
    confessionAudioRedisKey,
} from "./constants";

export type { ConfessionMode } from "../../models/guildConfessionConfig.model";
export {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_DEFAULT,
} from "./constants";
export { CONFESSION_VIP_COST_GEM, CONFESSION_SKIP_CD_COST_COIN } from "./constants";
export { CONFESSION_REPLY_COST_COIN, CONFESSION_REPLY_MAX_LENGTH } from "./constants";
export { CONFESSION_KEYWORD_MAX_LENGTH, CONFESSION_KEYWORDS_MAX_COUNT, CONFESSION_TAGS } from "./constants";
export type { ConfessionTag } from "./constants";

// Narrows `unknown` to `string` and guards against Mongoose v9's `isValidObjectId`
// which rejects (and throws on) non-string inputs.
export function isObjectIdString(value: unknown): value is string {
    return typeof value === "string" && isValidObjectId(value);
}

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
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
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
        { returnDocument: "after" }
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

export function validateConfessionAudio(
    att: { url: string; name: string | null; contentType: string | null; size: number } | null | undefined
): { ok: true; audio: IConfessionAudio | null } | { ok: false } {
    if (!att) return { ok: true, audio: null };
    const ct = att.contentType ?? "";
    if (!ct.startsWith("audio/")) return { ok: false };
    if (!AUDIO_CONTENT_TYPES.includes(ct as (typeof AUDIO_CONTENT_TYPES)[number])) return { ok: false };
    return {
        ok: true,
        audio: { url: att.url, name: att.name, contentType: att.contentType },
    };
}

export async function checkAndIncrementAudioLimit(userId: string, dailyLimit: number): Promise<boolean> {
    if (!Number.isFinite(dailyLimit)) return true;

    const key = confessionAudioRedisKey(userId);
    const used = (await redis.getJson(key)) as number | null;

    if (used !== null && used >= dailyLimit) return false;

    await redis.setJson(key, (used ?? 0) + 1, secondsUntilUTCMidnight());
    return true;
}

export async function decrementAudioLimit(userId: string): Promise<void> {
    const key = confessionAudioRedisKey(userId);
    const current = (await redis.getJson(key)) as number | null;
    if (current && current > 0) {
        await redis.setJson(key, current - 1, secondsUntilUTCMidnight());
    }
}

export function buildPublicConfessionEmbed(
    confessionNumber: number,
    content: string,
    tag?: string | null
): EmbedBuilder {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`Anonymous Confession (#${confessionNumber})`)
        .setDescription(desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc)
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}

export function buildVipPublicConfessionEmbed(
    confessionNumber: number,
    content: string,
    tag?: string | null
): EmbedBuilder {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✨ Confession (#${confessionNumber})`)
        .setDescription(desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc)
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
    tag?: string | null;
}): EmbedBuilder {
    const title = params.isVip
        ? `✨ Confession review (#${params.confessionNumber}) — VIP`
        : `Confession review (#${params.confessionNumber})`;
    const tagLine = params.tag ? `[🏷️ ${params.tag.charAt(0).toUpperCase() + params.tag.slice(1)}]\n` : "";
    const desc = tagLine + params.content;
    const embed = new EmbedBuilder()
        .setColor(params.isVip ? 0xf1c40f : 0xe67e22)
        .setTitle(title)
        .setDescription(desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc)
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

export async function buildConfessionAttachmentFiles(
    image: IConfessionImage | null,
    audio: IConfessionAudio | null
): Promise<AttachmentBuilder[]> {
    const files: AttachmentBuilder[] = [];

    if (image) {
        try {
            const res = await axios.get<ArrayBuffer>(image.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
                maxContentLength: 8 * 1024 * 1024,
            });
            const buf = Buffer.from(res.data);
            const name = image.name && image.name.length > 0 ? image.name : "image.png";
            files.push(new AttachmentBuilder(buf, { name }));
        } catch (error) {
            logger.warn(
                `confession: failed to download image for attachment: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    if (audio) {
        try {
            const res = await axios.get<ArrayBuffer>(audio.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
                maxContentLength: 8 * 1024 * 1024,
            });
            const buf = Buffer.from(res.data);
            const name = audio.name && audio.name.length > 0 ? audio.name : "audio.mp3";
            files.push(new AttachmentBuilder(buf, { name }));
        } catch (error) {
            logger.warn(
                `confession: failed to download audio for attachment: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return files;
}

export async function sendAnonymousConfessionToChannel(
    channel: TextChannel,
    confessionNumber: number,
    content: string,
    image: IConfessionImage | null,
    audio: IConfessionAudio | null,
    isVip = false,
    mongoId?: string,
    tag?: string | null
): Promise<{ messageId: string } | { error: true }> {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content, tag)
            : buildPublicConfessionEmbed(confessionNumber, content, tag);
        if (audio) {
            const guildLocale = await resolveGuildLocale(channel.guildId);
            const audioLabel = t(guildLocale, "confession.audio_label");
            const currentDesc = embed.data.description ?? content;
            embed.setDescription(`${audioLabel}\n\n${currentDesc}`);
        }
        const files = await buildConfessionAttachmentFiles(image, audio);
        const components = mongoId ? [buildConfessionInteractionRow(mongoId)] : [];
        const msg = await channel.send({
            embeds: [embed],
            files: files.length ? files : undefined,
            components: components.length ? components : undefined,
        });

        const capturedAttachments = files.map((f, i) => {
            const att = (f as { attachment?: unknown }).attachment;
            const name = (f as { name?: unknown }).name;
            return {
                url: typeof att === "string" ? att : "inline",
                name: typeof name === "string" ? name : `file-${i}`,
            };
        });
        BotOutputAudit.record({
            source: "confession_post",
            targetType: "channel",
            targetId: channel.id,
            guildId: channel.guildId,
            isEphemeral: false,
            content: undefined,
            embeds: [embed.toJSON()],
            components: components.map((row) => row.toJSON()),
            attachments: capturedAttachments,
            capturedAt: new Date(),
        });

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
    audio?: IConfessionAudio | null;
    publicMessageId: string;
    isVip?: boolean;
    tag?: string | null;
}): Promise<ConfessionDoc> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        audio: input.audio ?? null,
        isVip: input.isVip ?? false,
        tag: input.tag ?? null,
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
    audio?: IConfessionAudio | null;
    isVip?: boolean;
    tag?: string | null;
}): Promise<ConfessionDoc> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        audio: input.audio ?? null,
        isVip: input.isVip ?? false,
        tag: input.tag ?? null,
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
    if (!isObjectIdString(rawId)) {
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
    const sendResult = await sendAnonymousConfessionToChannel(
        textChannel,
        doc.number,
        doc.content,
        doc.image,
        doc.audio,
        doc.isVip,
        rawId,
        doc.tag
    );
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
    if (!isObjectIdString(rawId)) {
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

// --- Confession Ban ---

export async function checkConfessionBan(
    guildId: string,
    userId: string
): Promise<{ banned: true; expiresAt: Date | null } | { banned: false }> {
    const ban = await ConfessionBanModel.findOne({ guildId, userId, active: true }).exec();
    if (!ban) return { banned: false };

    if (ban.expiresAt && ban.expiresAt <= new Date()) {
        ban.active = false;
        await ban.save();
        return { banned: false };
    }

    return { banned: true, expiresAt: ban.expiresAt };
}

export async function banConfessionUser(input: {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;
}): Promise<void> {
    await ConfessionBanModel.updateMany(
        { guildId: input.guildId, userId: input.userId, active: true },
        { active: false }
    ).exec();

    await ConfessionBanModel.create({
        guildId: input.guildId,
        userId: input.userId,
        moderatorId: input.moderatorId,
        reason: input.reason,
        expiresAt: input.expiresAt,
        active: true,
    });
}

export async function unbanConfessionUser(guildId: string, userId: string): Promise<boolean> {
    const result = await ConfessionBanModel.updateMany({ guildId, userId, active: true }, { active: false }).exec();
    return result.modifiedCount > 0;
}

// --- Keyword Filter ---

export async function addBlockedKeyword(
    guildId: string,
    keyword: string
): Promise<"added" | "duplicate" | "max_reached" | "not_configured"> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    if (!config) return "not_configured";

    const normalized = keyword.toLowerCase().trim().slice(0, CONFESSION_KEYWORD_MAX_LENGTH);
    if (config.blockedKeywords.includes(normalized)) return "duplicate";
    if (config.blockedKeywords.length >= CONFESSION_KEYWORDS_MAX_COUNT) return "max_reached";

    config.blockedKeywords.push(normalized);
    await config.save();
    return "added";
}

export async function removeBlockedKeyword(
    guildId: string,
    keyword: string
): Promise<"removed" | "not_found" | "not_configured"> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    if (!config) return "not_configured";

    const normalized = keyword.toLowerCase().trim();
    const idx = config.blockedKeywords.indexOf(normalized);
    if (idx === -1) return "not_found";

    config.blockedKeywords.splice(idx, 1);
    await config.save();
    return "removed";
}

export async function getBlockedKeywords(guildId: string): Promise<string[]> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    return config?.blockedKeywords ?? [];
}

export function checkKeywordFilter(content: string, blockedKeywords: string[]): boolean {
    if (blockedKeywords.length === 0) return false;
    const lower = content.toLowerCase();
    return blockedKeywords.some((kw) => lower.includes(kw));
}

export function buildConfessionInteractionRow(
    confessionMongoId: string,
    upvotes = 0,
    downvotes = 0
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_UPVOTE}:${confessionMongoId}`)
            .setLabel(`👍 ${upvotes}`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_DOWNVOTE}:${confessionMongoId}`)
            .setLabel(`👎 ${downvotes}`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_REPLY}:${confessionMongoId}`)
            .setLabel("💬 Reply")
            .setStyle(ButtonStyle.Primary)
    );
}

export type VoteResult =
    | { ok: true; upvotes: number; downvotes: number }
    | { ok: false; code: "invalid_id" | "not_found" | "own_confession" };

export async function handleConfessionVote(
    confessionMongoId: string,
    guildId: string,
    userId: string,
    voteType: "up" | "down"
): Promise<VoteResult> {
    if (!isObjectIdString(confessionMongoId)) {
        return { ok: false, code: "invalid_id" };
    }

    const doc = await ConfessionModel.findById(confessionMongoId).exec();
    if (!doc || doc.guildId !== guildId || doc.status !== "published") {
        return { ok: false, code: "not_found" };
    }

    if (doc.authorId === userId) {
        return { ok: false, code: "own_confession" };
    }

    const existing = await ConfessionVoteModel.findOne({
        confessionId: doc._id,
        userId,
    }).exec();

    if (!existing) {
        await ConfessionVoteModel.create({
            confessionId: doc._id,
            guildId,
            userId,
            vote: voteType,
        });
        const inc: UpdateQuery<IConfession>["$inc"] = voteType === "up" ? { upvotes: 1 } : { downvotes: 1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    } else if (existing.vote === voteType) {
        await ConfessionVoteModel.deleteOne({ _id: existing._id }).exec();
        const inc: UpdateQuery<IConfession>["$inc"] = voteType === "up" ? { upvotes: -1 } : { downvotes: -1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    } else {
        existing.vote = voteType;
        await existing.save();
        const inc: UpdateQuery<IConfession>["$inc"] =
            voteType === "up" ? { upvotes: 1, downvotes: -1 } : { upvotes: -1, downvotes: 1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    }

    const updated = await ConfessionModel.findById(confessionMongoId).select("upvotes downvotes").exec();
    return {
        ok: true,
        upvotes: updated?.upvotes ?? 0,
        downvotes: updated?.downvotes ?? 0,
    };
}

export function buildConfessionReplyModal(
    confessionMongoId: string,
    labels: { title: string; inputLabel: string }
): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(`${BUTTON_ID.CONFESSION_REPLY_MODAL}:${confessionMongoId}`)
        .setTitle(labels.title);

    const input = new TextInputBuilder()
        .setCustomId("reply_content")
        .setLabel(labels.inputLabel)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(CONFESSION_REPLY_MAX_LENGTH)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    return modal;
}

export type ReplyResult =
    | { ok: true; replyNumber: number }
    | { ok: false; code: "not_found" | "empty" | "insufficient_coin" | "thread_failed" | "send_failed" };

export async function handleConfessionReply(params: {
    confessionMongoId: string;
    guildId: string;
    userId: string;
    content: string;
    channel: TextChannel;
    publicMessageId: string;
    confessionNumber: number;
}): Promise<ReplyResult> {
    const { confessionMongoId, guildId, userId, content, channel, publicMessageId, confessionNumber } = params;

    const trimmed = content.trim();
    if (trimmed.length === 0) {
        return { ok: false, code: "empty" };
    }

    const existingCount = await ConfessionReplyModel.countDocuments({
        confessionId: confessionMongoId,
        authorId: userId,
    }).exec();

    if (existingCount > 0) {
        const CurrencyService = (await import("../../services/economy/currency.service")).default;
        try {
            await CurrencyService.deduct(userId, guildId, CONFESSION_REPLY_COST_COIN, 0, "confession_reply", {
                confessionNumber,
            });
        } catch (error) {
            const CurrSvc = (await import("../../services/economy/currency.service")).default;
            if (error instanceof CurrSvc.InsufficientFundsError) {
                return { ok: false, code: "insufficient_coin" };
            }
            throw error;
        }
    }

    const updated = await ConfessionModel.findByIdAndUpdate(
        confessionMongoId,
        { $inc: { replyCount: 1 } },
        { returnDocument: "after" }
    ).exec();
    if (!updated) {
        return { ok: false, code: "not_found" };
    }
    const replyNumber = updated.replyCount;

    let threadId = updated.threadId;
    if (threadId) {
        const thread = await channel.threads.fetch(threadId).catch(() => null);
        if (!thread) {
            threadId = null;
        }
    }

    if (!threadId) {
        try {
            const msg = await channel.messages.fetch(publicMessageId).catch(() => null);
            if (!msg) {
                return { ok: false, code: "thread_failed" };
            }
            const thread = await msg.startThread({
                name: `Confession #${confessionNumber} — Replies`,
                autoArchiveDuration: 1440,
            });
            threadId = thread.id;
            await ConfessionModel.findByIdAndUpdate(confessionMongoId, { threadId }).exec();
        } catch (error) {
            logger.error(
                `confession: failed to create reply thread: ${error instanceof Error ? error.message : String(error)}`
            );
            return { ok: false, code: "thread_failed" };
        }
    }

    try {
        const thread = await channel.threads.fetch(threadId!);
        if (!thread) {
            return { ok: false, code: "thread_failed" };
        }

        const replyEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setDescription(trimmed)
            .setFooter({ text: `Anonymous Reply #${replyNumber}` })
            .setTimestamp();

        const replyMsg = await thread.send({ embeds: [replyEmbed] });

        BotOutputAudit.record({
            source: "confession_reply",
            targetType: "channel",
            targetId: thread.id,
            guildId,
            isEphemeral: false,
            content: undefined,
            embeds: [replyEmbed.toJSON()],
            components: [],
            attachments: [],
            capturedAt: new Date(),
        });

        await ConfessionReplyModel.create({
            confessionId: confessionMongoId,
            guildId,
            authorId: userId,
            replyNumber,
            content: trimmed,
            messageId: replyMsg.id,
        });

        return { ok: true, replyNumber };
    } catch (error) {
        logger.error(`confession: failed to post reply: ${error instanceof Error ? error.message : String(error)}`);
        return { ok: false, code: "send_failed" };
    }
}
