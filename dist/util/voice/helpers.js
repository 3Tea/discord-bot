"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOwner = validateOwner;
exports.checkCooldown = checkCooldown;
exports.setCooldown = setCooldown;
exports.buildPanelEmbed = buildPanelEmbed;
exports.buildPanelRows = buildPanelRows;
exports.updatePanel = updatePanel;
exports.sendPanel = sendPanel;
exports.cleanupRedisKeys = cleanupRedisKeys;
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const index_1 = require("../config/index");
const button_1 = require("../config/button");
const locale_1 = require("../i18n/locale");
const t_1 = require("../i18n/t");
const TTL_12H = 60 * 60 * 12;
/**
 * Check if the interaction user is the owner of the voice channel.
 * Returns the voice channel if valid, or null (and replies with error) if not.
 */
async function replyOrEdit(interaction, content) {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
    }
    else {
        await interaction.reply({ content, flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
async function validateOwner(interaction, locale) {
    const resolvedLocale = locale ?? (await (0, locale_1.resolveLocale)(interaction));
    const member = interaction.member;
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
        await replyOrEdit(interaction, (0, t_1.t)(resolvedLocale, "voice.not_in_channel"));
        return null;
    }
    const ownerId = await redis_1.default.getJson(voiceChannel.id);
    if (ownerId !== interaction.user.id) {
        await replyOrEdit(interaction, (0, t_1.t)(resolvedLocale, "voice.not_owner"));
        return null;
    }
    return voiceChannel;
}
/**
 * Check cooldown for an action. Returns true if action is allowed, false if on cooldown.
 * If on cooldown, replies with ephemeral message.
 */
async function checkCooldown(interaction, redisKey, locale) {
    const resolvedLocale = locale ?? (await (0, locale_1.resolveLocale)(interaction));
    const ttl = await redis_1.default.ttlKey(redisKey);
    if (ttl > 0) {
        await replyOrEdit(interaction, (0, t_1.t)(resolvedLocale, "voice.cooldown", { seconds: ttl }));
        return false;
    }
    return true;
}
/**
 * Set cooldown for an action.
 */
async function setCooldown(redisKey, seconds) {
    await redis_1.default.setJson(redisKey, 1, seconds);
}
/**
 * Build the control panel embed showing owner and status.
 */
async function buildPanelEmbed(channelId, ownerId, locale) {
    const state = (await redis_1.default.getJson(`state:${channelId}`)) || "unlocked";
    const permitted = (await redis_1.default.getJson(`permitted:${channelId}`)) || [];
    const blocked = (await redis_1.default.getJson(`blocked:${channelId}`)) || [];
    const statusMap = {
        unlocked: (0, t_1.t)(locale, "voice.panel.status_unlocked"),
        locked: (0, t_1.t)(locale, "voice.panel.status_locked"),
        hidden: (0, t_1.t)(locale, "voice.panel.status_hidden"),
    };
    const statusText = statusMap[state] ?? (0, t_1.t)(locale, "voice.panel.status_unlocked");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "voice.panel.title"))
        .setColor("Random")
        .setTimestamp()
        .setDescription((0, t_1.t)(locale, "voice.panel.description", { ownerId, status: statusText }));
    if (index_1.FOOTER.text) {
        embed.setFooter({ text: index_1.FOOTER.text, iconURL: index_1.FOOTER.icon || undefined });
    }
    if (permitted.length > 0) {
        embed.addFields({
            name: (0, t_1.t)(locale, "voice.panel.permitted"),
            value: permitted.map((id) => `<@${id}>`).join(", "),
        });
    }
    if (blocked.length > 0) {
        embed.addFields({
            name: (0, t_1.t)(locale, "voice.panel.blocked"),
            value: blocked.map((id) => `<@${id}>`).join(", "),
        });
    }
    return embed;
}
/**
 * Build the button rows for the control panel.
 */
function buildPanelRows(locale) {
    const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_LOCK)
        .setEmoji("🔒")
        .setLabel((0, t_1.t)(locale, "voice.btn.lock"))
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_UNLOCK)
        .setEmoji("🔓")
        .setLabel((0, t_1.t)(locale, "voice.btn.unlock"))
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_HIDE)
        .setEmoji("👁️")
        .setLabel((0, t_1.t)(locale, "voice.btn.hide"))
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_RENAME)
        .setEmoji("✏️")
        .setLabel((0, t_1.t)(locale, "voice.btn.rename"))
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_LIMIT)
        .setEmoji("👥")
        .setLabel((0, t_1.t)(locale, "voice.btn.limit"))
        .setStyle(discord_js_1.ButtonStyle.Primary));
    const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_PERMIT)
        .setEmoji("✅")
        .setLabel((0, t_1.t)(locale, "voice.btn.permit"))
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_BLOCK)
        .setEmoji("🚫")
        .setLabel((0, t_1.t)(locale, "voice.btn.block"))
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_KICK)
        .setEmoji("👢")
        .setLabel((0, t_1.t)(locale, "voice.btn.kick"))
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.VOICE_TRANSFER)
        .setEmoji("🔄")
        .setLabel((0, t_1.t)(locale, "voice.btn.transfer"))
        .setStyle(discord_js_1.ButtonStyle.Primary));
    return [row1, row2];
}
/**
 * Update the control panel message in the voice channel.
 */
async function updatePanel(voiceChannel, locale) {
    const panelMessageId = await redis_1.default.getJson(`panel:${voiceChannel.id}`);
    if (!panelMessageId)
        return;
    const ownerId = await redis_1.default.getJson(voiceChannel.id);
    if (!ownerId)
        return;
    try {
        const message = await voiceChannel.messages.fetch(panelMessageId);
        const embed = await buildPanelEmbed(voiceChannel.id, ownerId, locale);
        await message.edit({ embeds: [embed], components: buildPanelRows(locale) });
    }
    catch {
        // Message may have been deleted, ignore
    }
}
/**
 * Send the control panel to the voice channel text chat, mention owner, pin it, and store the message ID.
 */
async function sendPanel(voiceChannel, ownerId, locale) {
    const embed = await buildPanelEmbed(voiceChannel.id, ownerId, locale);
    const rows = buildPanelRows(locale);
    const message = await voiceChannel.send({
        content: (0, t_1.t)(locale, "voice.panel.owner_mention", { ownerId }),
        embeds: [embed],
        components: rows,
    });
    await redis_1.default.setJson(`panel:${voiceChannel.id}`, message.id, TTL_12H);
    // Pin the panel and delete the "pinned a message" system message
    try {
        await message.pin();
        const messages = await voiceChannel.messages.fetch({ limit: 5 });
        const pinSystemMsg = messages.find((m) => m.type === discord_js_1.MessageType.ChannelPinnedMessage);
        if (pinSystemMsg)
            await pinSystemMsg.delete();
    }
    catch {
        // Ignore if pin fails (missing permissions)
    }
}
/**
 * Clean up all Redis keys for a voice channel.
 */
async function cleanupRedisKeys(channelId) {
    await Promise.all([
        redis_1.default.deleteKey(channelId),
        redis_1.default.deleteKey(`panel:${channelId}`),
        redis_1.default.deleteKey(`state:${channelId}`),
        redis_1.default.deleteKey(`blocked:${channelId}`),
        redis_1.default.deleteKey(`permitted:${channelId}`),
    ]);
}
