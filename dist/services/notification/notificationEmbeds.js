"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWelcomeEmbed = buildWelcomeEmbed;
exports.buildGoodbyeEmbed = buildGoodbyeEmbed;
exports.buildLevelUpEmbed = buildLevelUpEmbed;
exports.buildBoostEmbed = buildBoostEmbed;
exports.buildMilestoneEmbed = buildMilestoneEmbed;
const discord_js_1 = require("discord.js");
const t_1 = require("../../util/i18n/t");
const calculator_1 = require("../../util/xp/calculator");
function buildWelcomeEmbed(member, locale) {
    return new discord_js_1.EmbedBuilder()
        .setColor(0x57f287)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle((0, t_1.t)(locale, "notification.welcome.title"))
        .setDescription((0, t_1.t)(locale, "notification.welcome.description", {
        user: `<@${member.id}>`,
        server: member.guild.name,
        memberCount: String(member.guild.memberCount),
    }))
        .setTimestamp();
}
function buildGoodbyeEmbed(member, locale) {
    return new discord_js_1.EmbedBuilder()
        .setColor(0xed4245)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle((0, t_1.t)(locale, "notification.goodbye.title"))
        .setDescription((0, t_1.t)(locale, "notification.goodbye.description", {
        username: member.user.username,
        server: member.guild.name,
    }))
        .setTimestamp();
}
function buildLevelUpEmbed(userId, avatarURL, newLevel, totalXP, locale) {
    const progress = (0, calculator_1.progressToNextLevel)(totalXP);
    const barLength = 10;
    const filled = Math.floor((progress.percentage / 100) * barLength);
    const progressBar = "\u2588".repeat(filled) + "\u2591".repeat(barLength - filled);
    return new discord_js_1.EmbedBuilder()
        .setColor(0xfee75c)
        .setThumbnail(avatarURL)
        .setTitle((0, t_1.t)(locale, "notification.level_up.title"))
        .setDescription((0, t_1.t)(locale, "notification.level_up.description", {
        user: `<@${userId}>`,
        level: String(newLevel),
        progressBar,
        currentXP: String(progress.currentXP),
        requiredXP: String(progress.requiredXP),
    }))
        .setTimestamp();
}
function buildBoostEmbed(member, locale) {
    return new discord_js_1.EmbedBuilder()
        .setColor(0xf47fff)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle((0, t_1.t)(locale, "notification.boost.title"))
        .setDescription((0, t_1.t)(locale, "notification.boost.description", {
        user: `<@${member.id}>`,
        boostCount: String(member.guild.premiumSubscriptionCount ?? 0),
    }))
        .setTimestamp();
}
function buildMilestoneEmbed(guild, memberCount, locale) {
    const iconURL = guild.iconURL({ size: 256 });
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle((0, t_1.t)(locale, "notification.milestone.title"))
        .setDescription((0, t_1.t)(locale, "notification.milestone.description", {
        server: guild.name,
        memberCount: String(memberCount),
    }))
        .setTimestamp();
    if (iconURL)
        embed.setThumbnail(iconURL);
    return embed;
}
