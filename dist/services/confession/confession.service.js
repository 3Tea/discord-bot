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
exports.CONFESSION_TAGS = exports.CONFESSION_KEYWORDS_MAX_COUNT = exports.CONFESSION_KEYWORD_MAX_LENGTH = exports.CONFESSION_REPLY_MAX_LENGTH = exports.CONFESSION_REPLY_COST_COIN = exports.CONFESSION_SKIP_CD_COST_COIN = exports.CONFESSION_VIP_COST_GEM = exports.CONFESSION_COOLDOWN_DEFAULT = exports.CONFESSION_COOLDOWN_MAX = exports.CONFESSION_COOLDOWN_MIN = exports.CONFESSION_CONTENT_MAX = void 0;
exports.isObjectIdString = isObjectIdString;
exports.getGuildConfessionConfig = getGuildConfessionConfig;
exports.upsertGuildConfessionConfig = upsertGuildConfessionConfig;
exports.reserveNextConfessionNumber = reserveNextConfessionNumber;
exports.isConfessionOnCooldown = isConfessionOnCooldown;
exports.getConfessionCooldownRemainingSeconds = getConfessionCooldownRemainingSeconds;
exports.setConfessionCooldown = setConfessionCooldown;
exports.validateConfessionAttachment = validateConfessionAttachment;
exports.validateConfessionAudio = validateConfessionAudio;
exports.checkAndIncrementAudioLimit = checkAndIncrementAudioLimit;
exports.decrementAudioLimit = decrementAudioLimit;
exports.buildPublicConfessionEmbed = buildPublicConfessionEmbed;
exports.buildVipPublicConfessionEmbed = buildVipPublicConfessionEmbed;
exports.buildReviewConfessionEmbed = buildReviewConfessionEmbed;
exports.buildReviewResolvedEmbed = buildReviewResolvedEmbed;
exports.buildConfessionAttachmentFiles = buildConfessionAttachmentFiles;
exports.sendAnonymousConfessionToChannel = sendAnonymousConfessionToChannel;
exports.createPublishedConfessionRecord = createPublishedConfessionRecord;
exports.createPendingConfessionRecord = createPendingConfessionRecord;
exports.setConfessionReviewMessageId = setConfessionReviewMessageId;
exports.approveConfession = approveConfession;
exports.rejectConfession = rejectConfession;
exports.buildConfessionReviewComponents = buildConfessionReviewComponents;
exports.checkConfessionBan = checkConfessionBan;
exports.banConfessionUser = banConfessionUser;
exports.unbanConfessionUser = unbanConfessionUser;
exports.addBlockedKeyword = addBlockedKeyword;
exports.removeBlockedKeyword = removeBlockedKeyword;
exports.getBlockedKeywords = getBlockedKeywords;
exports.checkKeywordFilter = checkKeywordFilter;
exports.buildConfessionInteractionRow = buildConfessionInteractionRow;
exports.handleConfessionVote = handleConfessionVote;
exports.buildConfessionReplyModal = buildConfessionReplyModal;
exports.handleConfessionReply = handleConfessionReply;
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const mongoose_1 = require("mongoose");
const redis_1 = __importDefault(require("../../connector/redis"));
const utc_1 = require("../../util/date/utc");
const botOutputAudit_service_1 = require("../audit/botOutputAudit.service");
const confession_model_1 = __importDefault(require("../../models/confession.model"));
const guildConfessionConfig_model_1 = __importDefault(require("../../models/guildConfessionConfig.model"));
const confessionVote_model_1 = __importDefault(require("../../models/confessionVote.model"));
const confessionReply_model_1 = __importDefault(require("../../models/confessionReply.model"));
const confessionBan_model_1 = __importDefault(require("../../models/confessionBan.model"));
const index_1 = require("../../util/config/index");
const button_1 = require("../../util/config/button");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const constants_1 = require("./constants");
var constants_2 = require("./constants");
Object.defineProperty(exports, "CONFESSION_CONTENT_MAX", { enumerable: true, get: function () { return constants_2.CONFESSION_CONTENT_MAX; } });
Object.defineProperty(exports, "CONFESSION_COOLDOWN_MIN", { enumerable: true, get: function () { return constants_2.CONFESSION_COOLDOWN_MIN; } });
Object.defineProperty(exports, "CONFESSION_COOLDOWN_MAX", { enumerable: true, get: function () { return constants_2.CONFESSION_COOLDOWN_MAX; } });
Object.defineProperty(exports, "CONFESSION_COOLDOWN_DEFAULT", { enumerable: true, get: function () { return constants_2.CONFESSION_COOLDOWN_DEFAULT; } });
var constants_3 = require("./constants");
Object.defineProperty(exports, "CONFESSION_VIP_COST_GEM", { enumerable: true, get: function () { return constants_3.CONFESSION_VIP_COST_GEM; } });
Object.defineProperty(exports, "CONFESSION_SKIP_CD_COST_COIN", { enumerable: true, get: function () { return constants_3.CONFESSION_SKIP_CD_COST_COIN; } });
var constants_4 = require("./constants");
Object.defineProperty(exports, "CONFESSION_REPLY_COST_COIN", { enumerable: true, get: function () { return constants_4.CONFESSION_REPLY_COST_COIN; } });
Object.defineProperty(exports, "CONFESSION_REPLY_MAX_LENGTH", { enumerable: true, get: function () { return constants_4.CONFESSION_REPLY_MAX_LENGTH; } });
var constants_5 = require("./constants");
Object.defineProperty(exports, "CONFESSION_KEYWORD_MAX_LENGTH", { enumerable: true, get: function () { return constants_5.CONFESSION_KEYWORD_MAX_LENGTH; } });
Object.defineProperty(exports, "CONFESSION_KEYWORDS_MAX_COUNT", { enumerable: true, get: function () { return constants_5.CONFESSION_KEYWORDS_MAX_COUNT; } });
Object.defineProperty(exports, "CONFESSION_TAGS", { enumerable: true, get: function () { return constants_5.CONFESSION_TAGS; } });
// Narrows `unknown` to `string` and guards against Mongoose v9's `isValidObjectId`
// which rejects (and throws on) non-string inputs.
function isObjectIdString(value) {
    return typeof value === "string" && (0, mongoose_1.isValidObjectId)(value);
}
function applyConfessionFooter(embed) {
    if (index_1.FOOTER.text) {
        embed.setFooter({
            text: index_1.FOOTER.text,
            ...(index_1.FOOTER.icon ? { iconURL: index_1.FOOTER.icon } : {}),
        });
    }
}
async function getGuildConfessionConfig(guildId) {
    return guildConfessionConfig_model_1.default.findOne({ guildId }).exec();
}
async function upsertGuildConfessionConfig(input) {
    if (input.mode === "review" && !input.reviewChannelId) {
        throw new Error("REVIEW_CHANNEL_REQUIRED");
    }
    const clamped = Math.min(constants_1.CONFESSION_COOLDOWN_MAX, Math.max(constants_1.CONFESSION_COOLDOWN_MIN, input.cooldownMinutes));
    const doc = await guildConfessionConfig_model_1.default.findOneAndUpdate({ guildId: input.guildId }, {
        $set: {
            enabled: input.enabled,
            mode: input.mode,
            publicChannelId: input.publicChannelId,
            reviewChannelId: input.reviewChannelId,
            cooldownMinutes: clamped,
        },
        $setOnInsert: { lastConfessionNumber: 0 },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).exec();
    if (!doc) {
        throw new Error("UPSERT_FAILED");
    }
    return doc;
}
async function reserveNextConfessionNumber(guildId) {
    const updated = await guildConfessionConfig_model_1.default.findOneAndUpdate({ guildId }, { $inc: { lastConfessionNumber: 1 } }, { returnDocument: "after" }).exec();
    if (!updated) {
        throw new Error("CONFIG_MISSING");
    }
    return updated.lastConfessionNumber;
}
async function isConfessionOnCooldown(guildId, userId) {
    const key = (0, constants_1.confessionCooldownRedisKey)(guildId, userId);
    const raw = await redis_1.default.getKey(key);
    if (raw)
        return true;
    const ttl = await redis_1.default.ttlKey(key);
    return ttl > 0;
}
async function getConfessionCooldownRemainingSeconds(guildId, userId) {
    const key = (0, constants_1.confessionCooldownRedisKey)(guildId, userId);
    return redis_1.default.ttlKey(key);
}
async function setConfessionCooldown(guildId, userId, cooldownMinutes) {
    const key = (0, constants_1.confessionCooldownRedisKey)(guildId, userId);
    const ttlSeconds = Math.max(1, Math.round(cooldownMinutes * 60));
    await redis_1.default.setKey(key, "1", ttlSeconds);
}
function validateConfessionAttachment(att) {
    if (!att)
        return { ok: true, image: null };
    const ct = att.contentType ?? "";
    if (!ct.startsWith("image/"))
        return { ok: false };
    return {
        ok: true,
        image: {
            url: att.url,
            name: att.name,
            contentType: att.contentType,
        },
    };
}
function validateConfessionAudio(att) {
    if (!att)
        return { ok: true, audio: null };
    const ct = att.contentType ?? "";
    if (!ct.startsWith("audio/"))
        return { ok: false };
    if (!constants_1.AUDIO_CONTENT_TYPES.includes(ct))
        return { ok: false };
    return {
        ok: true,
        audio: { url: att.url, name: att.name, contentType: att.contentType },
    };
}
async function checkAndIncrementAudioLimit(userId, dailyLimit) {
    if (!Number.isFinite(dailyLimit))
        return true;
    const key = (0, constants_1.confessionAudioRedisKey)(userId);
    const used = (await redis_1.default.getJson(key));
    if (used !== null && used >= dailyLimit)
        return false;
    await redis_1.default.setJson(key, (used ?? 0) + 1, (0, utc_1.secondsUntilUTCMidnight)());
    return true;
}
async function decrementAudioLimit(userId) {
    const key = (0, constants_1.confessionAudioRedisKey)(userId);
    const current = (await redis_1.default.getJson(key));
    if (current && current > 0) {
        await redis_1.default.setJson(key, current - 1, (0, utc_1.secondsUntilUTCMidnight)());
    }
}
function buildPublicConfessionEmbed(confessionNumber, content, tag) {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`Anonymous Confession (#${confessionNumber})`)
        .setDescription(desc.length > constants_1.CONFESSION_CONTENT_MAX ? desc.slice(0, constants_1.CONFESSION_CONTENT_MAX) : desc)
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
function buildVipPublicConfessionEmbed(confessionNumber, content, tag) {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✨ Confession (#${confessionNumber})`)
        .setDescription(desc.length > constants_1.CONFESSION_CONTENT_MAX ? desc.slice(0, constants_1.CONFESSION_CONTENT_MAX) : desc)
        .setTimestamp();
    embed.setFooter({
        text: "VIP Confession",
        ...(index_1.FOOTER.icon ? { iconURL: index_1.FOOTER.icon } : {}),
    });
    return embed;
}
function buildReviewConfessionEmbed(params) {
    const title = params.isVip
        ? `✨ Confession review (#${params.confessionNumber}) — VIP`
        : `Confession review (#${params.confessionNumber})`;
    const tagLine = params.tag ? `[🏷️ ${params.tag.charAt(0).toUpperCase() + params.tag.slice(1)}]\n` : "";
    const desc = tagLine + params.content;
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(params.isVip ? 0xf1c40f : 0xe67e22)
        .setTitle(title)
        .setDescription(desc.length > constants_1.CONFESSION_CONTENT_MAX ? desc.slice(0, constants_1.CONFESSION_CONTENT_MAX) : desc)
        .addFields({
        name: "Author (moderators only)",
        value: `<@${params.authorId}> — \`${params.authorId}\``,
    })
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
function buildReviewResolvedEmbed(kind, confessionNumber, contentPreview) {
    const status = kind === "approved" ? "Approved & published" : "Rejected";
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(kind === "approved" ? 0x2ecc71 : 0xe74c3c)
        .setTitle(`Confession #${confessionNumber} — ${status}`)
        .setDescription(contentPreview.slice(0, 500))
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
async function buildConfessionAttachmentFiles(image, audio) {
    const files = [];
    if (image) {
        try {
            const res = await axios_1.default.get(image.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
                maxContentLength: 8 * 1024 * 1024,
            });
            const buf = Buffer.from(res.data);
            const name = image.name && image.name.length > 0 ? image.name : "image.png";
            files.push(new discord_js_1.AttachmentBuilder(buf, { name }));
        }
        catch (error) {
            logger_mixed_1.logger.warn(`confession: failed to download image for attachment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (audio) {
        try {
            const res = await axios_1.default.get(audio.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
                maxContentLength: 8 * 1024 * 1024,
            });
            const buf = Buffer.from(res.data);
            const name = audio.name && audio.name.length > 0 ? audio.name : "audio.mp3";
            files.push(new discord_js_1.AttachmentBuilder(buf, { name }));
        }
        catch (error) {
            logger_mixed_1.logger.warn(`confession: failed to download audio for attachment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return files;
}
async function sendAnonymousConfessionToChannel(channel, confessionNumber, content, image, audio, isVip = false, mongoId, tag) {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content, tag)
            : buildPublicConfessionEmbed(confessionNumber, content, tag);
        if (audio) {
            const guildLocale = await (0, locale_1.resolveGuildLocale)(channel.guildId);
            const audioLabel = (0, t_1.t)(guildLocale, "confession.audio_label");
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
            const att = f.attachment;
            const name = f.name;
            return {
                url: typeof att === "string" ? att : "inline",
                name: typeof name === "string" ? name : `file-${i}`,
            };
        });
        botOutputAudit_service_1.BotOutputAudit.record({
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
    }
    catch (error) {
        logger_mixed_1.logger.error(`confession: sendAnonymousConfessionToChannel failed: ${error instanceof Error ? error.message : String(error)}`);
        return { error: true };
    }
}
async function createPublishedConfessionRecord(input) {
    return confession_model_1.default.create({
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
async function createPendingConfessionRecord(input) {
    return confession_model_1.default.create({
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
async function setConfessionReviewMessageId(confessionId, reviewMessageId) {
    await confession_model_1.default.findByIdAndUpdate(confessionId, { reviewMessageId }).exec();
}
async function approveConfession(interaction) {
    const rawId = interaction.customId.split(":")[1];
    if (!isObjectIdString(rawId)) {
        return { ok: false, code: "invalid_id" };
    }
    const guildId = interaction.guildId;
    if (!guildId || !interaction.guild) {
        return { ok: false, code: "not_found" };
    }
    const doc = await confession_model_1.default.findById(rawId).exec();
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
    const textChannel = ch;
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.audio, doc.isVip, rawId, doc.tag);
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
    }
    catch (error) {
        logger_mixed_1.logger.warn(`confession: failed to edit review message after approve: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { ok: true };
}
async function rejectConfession(interaction) {
    const rawId = interaction.customId.split(":")[1];
    if (!isObjectIdString(rawId)) {
        return { ok: false, code: "invalid_id" };
    }
    const guildId = interaction.guildId;
    if (!guildId) {
        return { ok: false, code: "not_found" };
    }
    const doc = await confession_model_1.default.findById(rawId).exec();
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
    }
    catch (error) {
        logger_mixed_1.logger.warn(`confession: failed to edit review message after reject: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { ok: true };
}
function buildConfessionReviewComponents(confessionMongoId, labels) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_APPROVE}:${confessionMongoId}`)
        .setLabel(labels.approve)
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_REJECT}:${confessionMongoId}`)
        .setLabel(labels.reject)
        .setStyle(discord_js_1.ButtonStyle.Danger));
}
// --- Confession Ban ---
async function checkConfessionBan(guildId, userId) {
    const ban = await confessionBan_model_1.default.findOne({ guildId, userId, active: true }).exec();
    if (!ban)
        return { banned: false };
    if (ban.expiresAt && ban.expiresAt <= new Date()) {
        ban.active = false;
        await ban.save();
        return { banned: false };
    }
    return { banned: true, expiresAt: ban.expiresAt };
}
async function banConfessionUser(input) {
    await confessionBan_model_1.default.updateMany({ guildId: input.guildId, userId: input.userId, active: true }, { active: false }).exec();
    await confessionBan_model_1.default.create({
        guildId: input.guildId,
        userId: input.userId,
        moderatorId: input.moderatorId,
        reason: input.reason,
        expiresAt: input.expiresAt,
        active: true,
    });
}
async function unbanConfessionUser(guildId, userId) {
    const result = await confessionBan_model_1.default.updateMany({ guildId, userId, active: true }, { active: false }).exec();
    return result.modifiedCount > 0;
}
// --- Keyword Filter ---
async function addBlockedKeyword(guildId, keyword) {
    const config = await guildConfessionConfig_model_1.default.findOne({ guildId }).exec();
    if (!config)
        return "not_configured";
    const normalized = keyword.toLowerCase().trim().slice(0, constants_1.CONFESSION_KEYWORD_MAX_LENGTH);
    if (config.blockedKeywords.includes(normalized))
        return "duplicate";
    if (config.blockedKeywords.length >= constants_1.CONFESSION_KEYWORDS_MAX_COUNT)
        return "max_reached";
    config.blockedKeywords.push(normalized);
    await config.save();
    return "added";
}
async function removeBlockedKeyword(guildId, keyword) {
    const config = await guildConfessionConfig_model_1.default.findOne({ guildId }).exec();
    if (!config)
        return "not_configured";
    const normalized = keyword.toLowerCase().trim();
    const idx = config.blockedKeywords.indexOf(normalized);
    if (idx === -1)
        return "not_found";
    config.blockedKeywords.splice(idx, 1);
    await config.save();
    return "removed";
}
async function getBlockedKeywords(guildId) {
    const config = await guildConfessionConfig_model_1.default.findOne({ guildId }).exec();
    return config?.blockedKeywords ?? [];
}
function checkKeywordFilter(content, blockedKeywords) {
    if (blockedKeywords.length === 0)
        return false;
    const lower = content.toLowerCase();
    return blockedKeywords.some((kw) => lower.includes(kw));
}
function buildConfessionInteractionRow(confessionMongoId, upvotes = 0, downvotes = 0) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_UPVOTE}:${confessionMongoId}`)
        .setLabel(`👍 ${upvotes}`)
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_DOWNVOTE}:${confessionMongoId}`)
        .setLabel(`👎 ${downvotes}`)
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_REPLY}:${confessionMongoId}`)
        .setLabel("💬 Reply")
        .setStyle(discord_js_1.ButtonStyle.Primary));
}
async function handleConfessionVote(confessionMongoId, guildId, userId, voteType) {
    if (!isObjectIdString(confessionMongoId)) {
        return { ok: false, code: "invalid_id" };
    }
    const doc = await confession_model_1.default.findById(confessionMongoId).exec();
    if (!doc || doc.guildId !== guildId || doc.status !== "published") {
        return { ok: false, code: "not_found" };
    }
    if (doc.authorId === userId) {
        return { ok: false, code: "own_confession" };
    }
    const existing = await confessionVote_model_1.default.findOne({
        confessionId: doc._id,
        userId,
    }).exec();
    if (!existing) {
        await confessionVote_model_1.default.create({
            confessionId: doc._id,
            guildId,
            userId,
            vote: voteType,
        });
        const inc = voteType === "up" ? { upvotes: 1 } : { downvotes: 1 };
        await confession_model_1.default.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    }
    else if (existing.vote === voteType) {
        await confessionVote_model_1.default.deleteOne({ _id: existing._id }).exec();
        const inc = voteType === "up" ? { upvotes: -1 } : { downvotes: -1 };
        await confession_model_1.default.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    }
    else {
        existing.vote = voteType;
        await existing.save();
        const inc = voteType === "up" ? { upvotes: 1, downvotes: -1 } : { upvotes: -1, downvotes: 1 };
        await confession_model_1.default.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    }
    const updated = await confession_model_1.default.findById(confessionMongoId).select("upvotes downvotes").exec();
    return {
        ok: true,
        upvotes: updated?.upvotes ?? 0,
        downvotes: updated?.downvotes ?? 0,
    };
}
function buildConfessionReplyModal(confessionMongoId, labels) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`${button_1.BUTTON_ID.CONFESSION_REPLY_MODAL}:${confessionMongoId}`)
        .setTitle(labels.title);
    const input = new discord_js_1.TextInputBuilder()
        .setCustomId("reply_content")
        .setLabel(labels.inputLabel)
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(constants_1.CONFESSION_REPLY_MAX_LENGTH)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(input));
    return modal;
}
async function handleConfessionReply(params) {
    const { confessionMongoId, guildId, userId, content, channel, publicMessageId, confessionNumber } = params;
    const trimmed = content.trim();
    if (trimmed.length === 0) {
        return { ok: false, code: "empty" };
    }
    const existingCount = await confessionReply_model_1.default.countDocuments({
        confessionId: confessionMongoId,
        authorId: userId,
    }).exec();
    if (existingCount > 0) {
        const CurrencyService = (await Promise.resolve().then(() => __importStar(require("../../services/economy/currency.service")))).default;
        try {
            await CurrencyService.deduct(userId, guildId, constants_1.CONFESSION_REPLY_COST_COIN, 0, "confession_reply", {
                confessionNumber,
            });
        }
        catch (error) {
            const CurrSvc = (await Promise.resolve().then(() => __importStar(require("../../services/economy/currency.service")))).default;
            if (error instanceof CurrSvc.InsufficientFundsError) {
                return { ok: false, code: "insufficient_coin" };
            }
            throw error;
        }
    }
    const updated = await confession_model_1.default.findByIdAndUpdate(confessionMongoId, { $inc: { replyCount: 1 } }, { returnDocument: "after" }).exec();
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
            await confession_model_1.default.findByIdAndUpdate(confessionMongoId, { threadId }).exec();
        }
        catch (error) {
            logger_mixed_1.logger.error(`confession: failed to create reply thread: ${error instanceof Error ? error.message : String(error)}`);
            return { ok: false, code: "thread_failed" };
        }
    }
    try {
        const thread = await channel.threads.fetch(threadId);
        if (!thread) {
            return { ok: false, code: "thread_failed" };
        }
        const replyEmbed = new discord_js_1.EmbedBuilder()
            .setColor(0x9b59b6)
            .setDescription(trimmed)
            .setFooter({ text: `Anonymous Reply #${replyNumber}` })
            .setTimestamp();
        const replyMsg = await thread.send({ embeds: [replyEmbed] });
        botOutputAudit_service_1.BotOutputAudit.record({
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
        await confessionReply_model_1.default.create({
            confessionId: confessionMongoId,
            guildId,
            authorId: userId,
            replyNumber,
            content: trimmed,
            messageId: replyMsg.id,
        });
        return { ok: true, replyNumber };
    }
    catch (error) {
        logger_mixed_1.logger.error(`confession: failed to post reply: ${error instanceof Error ? error.message : String(error)}`);
        return { ok: false, code: "send_failed" };
    }
}
