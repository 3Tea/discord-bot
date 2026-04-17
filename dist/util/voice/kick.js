"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleKick = handleKick;
const redis_1 = __importDefault(require("../../connector/redis"));
const locale_1 = require("../i18n/locale");
const t_1 = require("../i18n/t");
const helpers_1 = require("./helpers");
const TTL_12H = 60 * 60 * 12;
async function handleKick(interaction, block) {
    const locale = await (0, locale_1.resolveLocale)(interaction);
    const member = interaction.member;
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "voice.not_in_channel") });
        return;
    }
    const targetId = await redis_1.default.getJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    if (!targetId) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "voice.kick_expired") });
        return;
    }
    await redis_1.default.deleteKey(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    const targetMember = voiceChannel.members.get(targetId);
    if (targetMember) {
        await targetMember.voice.disconnect("Kicked by channel owner");
    }
    if (block) {
        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });
        const blocked = (await redis_1.default.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis_1.default.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }
    }
    await (0, helpers_1.setCooldown)(`cd:kick:${voiceChannel.id}`, 10);
    await (0, helpers_1.updatePanel)(voiceChannel, locale);
    const content = block
        ? (0, t_1.t)(locale, "voice.kicked_blocked", { userId: targetId })
        : (0, t_1.t)(locale, "voice.kicked", { userId: targetId });
    await interaction.editReply({ content, components: [] });
}
