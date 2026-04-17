"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProfileEmbed = buildProfileEmbed;
const discord_js_1 = require("discord.js");
const t_1 = require("../i18n/t");
const calculator_1 = require("../xp/calculator");
function buildProfileEmbed(data, locale) {
    const { xp, level, messageCount, voiceMinutes, reactionCount, serverRank, coin, gem, star, prayStreak, questStreak, member, premiumBadge, achievementCount, } = data;
    const progress = (0, calculator_1.progressToNextLevel)(xp);
    const pct = progress.percentage;
    const filled = Math.floor(pct / 10);
    const progressBar = "█".repeat(filled) + "░".repeat(10 - filled);
    const voiceH = Math.floor(voiceMinutes / 60);
    const voiceM = voiceMinutes % 60;
    const voiceStr = `${voiceH}h ${voiceM}m`;
    const joinDate = member.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : "Unknown";
    const titleSuffix = premiumBadge ? ` ${premiumBadge}` : "";
    return new discord_js_1.EmbedBuilder()
        .setAuthor({
        name: (0, t_1.t)(locale, "profile.title", { username: member.user.username }) + titleSuffix,
        iconURL: member.user.displayAvatarURL({ size: 128 }),
    })
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setColor(0x5865f2)
        .addFields({
        name: (0, t_1.t)(locale, "profile.level_rank"),
        value: `${(0, t_1.t)(locale, "profile.level", { level: String(level) })}\n${progressBar} ${pct}%\n${(0, t_1.t)(locale, "profile.rank", { rank: String(serverRank) })}`,
        inline: true,
    }, {
        name: (0, t_1.t)(locale, "profile.economy"),
        value: `${(0, t_1.t)(locale, "profile.coin", { amount: coin.toLocaleString() })}\n${(0, t_1.t)(locale, "profile.gem", { amount: gem.toLocaleString() })}\n${(0, t_1.t)(locale, "profile.star", { amount: star.toLocaleString() })}`,
        inline: true,
    }, {
        name: (0, t_1.t)(locale, "profile.streaks"),
        value: `${(0, t_1.t)(locale, "profile.pray_streak", { days: String(prayStreak) })}\n${(0, t_1.t)(locale, "profile.quest_streak", { days: String(questStreak) })}`,
        inline: true,
    }, {
        name: (0, t_1.t)(locale, "profile.activity"),
        value: `${(0, t_1.t)(locale, "profile.messages", { total: messageCount.toLocaleString() })}\n${(0, t_1.t)(locale, "profile.voice", { time: voiceStr })}\n${(0, t_1.t)(locale, "profile.reactions", { total: reactionCount.toLocaleString() })}`,
        inline: true,
    }, ...(achievementCount
        ? [
            {
                name: (0, t_1.t)(locale, "profile.achievements"),
                value: `${achievementCount.unlocked}/${achievementCount.total}`,
                inline: true,
            },
        ]
        : []))
        .setFooter({ text: (0, t_1.t)(locale, "profile.member_since", { date: joinDate }) })
        .setTimestamp();
}
