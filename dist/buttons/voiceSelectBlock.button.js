"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const button_1 = require("../util/config/button");
const redis_1 = __importDefault(require("../connector/redis"));
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const TTL_12H = 60 * 60 * 12;
exports.default = {
    id: button_1.BUTTON_ID.VOICE_SELECT_BLOCK,
    async execute(interaction) {
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const member = interaction.member;
        const voiceChannel = member?.voice.channel;
        if (!voiceChannel) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.not_in_channel") });
            return;
        }
        const ownerId = await redis_1.default.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.not_owner") });
            return;
        }
        const cdKey = `cd:block:${voiceChannel.id}`;
        const ttl = await redis_1.default.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.cooldown", { seconds: ttl }) });
            return;
        }
        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.block_self") });
            return;
        }
        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });
        const blocked = (await redis_1.default.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis_1.default.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }
        // Remove from permitted if present
        const permitted = (await redis_1.default.getJson(`permitted:${voiceChannel.id}`)) || [];
        const permIndex = permitted.indexOf(targetId);
        if (permIndex !== -1) {
            permitted.splice(permIndex, 1);
            await redis_1.default.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
        }
        // Disconnect user if in channel
        const targetMember = voiceChannel.members.get(targetId);
        if (targetMember) {
            await targetMember.voice.disconnect("Blocked by channel owner");
        }
        await (0, helpers_1.setCooldown)(cdKey, 5);
        await (0, helpers_1.updatePanel)(voiceChannel, locale);
        await interaction.editReply({ content: (0, t_1.t)(locale, "voice.blocked", { userId: targetId }) });
    },
};
