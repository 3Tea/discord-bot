"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const button_1 = require("../util/config/button");
const redis_1 = __importDefault(require("../connector/redis"));
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.VOICE_SELECT_KICK,
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
        const cdKey = `cd:kick:${voiceChannel.id}`;
        const ttl = await redis_1.default.ttlKey(cdKey);
        if (ttl > 0) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.cooldown", { seconds: ttl }) });
            return;
        }
        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "voice.kick_self") });
            return;
        }
        const targetMember = voiceChannel.members.get(targetId);
        if (!targetMember) {
            await interaction.editReply({
                content: (0, t_1.t)(locale, "voice.kick_not_in_channel"),
            });
            return;
        }
        // Store target for the confirmation handler (30s TTL)
        await redis_1.default.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, targetId, 30);
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(button_1.BUTTON_ID.VOICE_KICK_ONLY)
            .setLabel((0, t_1.t)(locale, "voice.btn.kick"))
            .setEmoji("👢")
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(button_1.BUTTON_ID.VOICE_KICK_BLOCK)
            .setLabel((0, t_1.t)(locale, "voice.btn.kick_block"))
            .setEmoji("🚫")
            .setStyle(discord_js_1.ButtonStyle.Danger));
        await interaction.editReply({
            content: (0, t_1.t)(locale, "voice.kick_confirm", { userId: targetId }),
            components: [row],
        });
    },
};
