"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeriodStats = getPeriodStats;
exports.buildRankEmbed = buildRankEmbed;
exports.buildLeaderboardEmbed = buildLeaderboardEmbed;
exports.buildLevelUpEmbed = buildLevelUpEmbed;
exports.buildGlobalLeaderboardEmbed = buildGlobalLeaderboardEmbed;
exports.buildPeriodLeaderboardEmbed = buildPeriodLeaderboardEmbed;
exports.buildServerRankEmbed = buildServerRankEmbed;
exports.buildServerLeaderboardEmbed = buildServerLeaderboardEmbed;
exports.buildServerPeriodLeaderboardEmbed = buildServerPeriodLeaderboardEmbed;
const discord_js_1 = require("discord.js");
const xpSnapshot_model_1 = __importDefault(require("../../models/xpSnapshot.model"));
const client_1 = __importDefault(require("../../client"));
const calculator_1 = require("./calculator");
const periodKey_1 = require("./periodKey");
const t_1 = require("../i18n/t");
const PROGRESS_BAR_LENGTH = 20;
const FILLED = "▓";
const EMPTY = "░";
function buildProgressBar(percentage) {
    const filled = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH);
    const empty = PROGRESS_BAR_LENGTH - filled;
    return FILLED.repeat(filled) + EMPTY.repeat(empty);
}
function formatVoiceTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0)
        return `${hours}h ${mins}m`;
    return `${mins}m`;
}
async function getPeriodStats(userId, guildId) {
    const keys = (0, periodKey_1.getCurrentPeriodKeys)();
    const [daily, weekly, monthly] = await Promise.all([
        xpSnapshot_model_1.default.findOne({ userId, guildId, period: "daily", periodKey: keys.daily }).lean(),
        xpSnapshot_model_1.default.findOne({ userId, guildId, period: "weekly", periodKey: keys.weekly }).lean(),
        xpSnapshot_model_1.default.findOne({ userId, guildId, period: "monthly", periodKey: keys.monthly }).lean(),
    ]);
    return {
        daily: daily?.xp ?? 0,
        weekly: weekly?.xp ?? 0,
        monthly: monthly?.xp ?? 0,
    };
}
function buildRankEmbed(member, username, rank, globalRank, globalXP, locale, periodStats) {
    if (!member) {
        const globalLine = globalRank
            ? `🌐 **#${globalRank}** ${(0, t_1.t)(locale, "rank.global_line", { globalRank, globalXP: globalXP.toLocaleString() })}`
            : (0, t_1.t)(locale, "rank.no_rank");
        return new discord_js_1.EmbedBuilder()
            .setTitle(`📊 ${username} — Level 0`)
            .setDescription([
            globalLine,
            "",
            `${buildProgressBar(0)} 0%`,
            `0 / ${(0, calculator_1.xpForLevel)(1)} XP`,
            "",
            periodStats
                ? `📊 **${(0, t_1.t)(locale, "rank.recent_activity")}**\n${(0, t_1.t)(locale, "rank.today")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.daily.toLocaleString() })} | ${(0, t_1.t)(locale, "rank.this_week")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.weekly.toLocaleString() })} | ${(0, t_1.t)(locale, "rank.this_month")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.monthly.toLocaleString() })}`
                : "",
            "💬 0  ·  🎤 0m  ·  ❤️ 0",
        ]
            .filter(Boolean)
            .join("\n"))
            .setColor(0x2b2d31);
    }
    const progress = (0, calculator_1.progressToNextLevel)(member.xp);
    return new discord_js_1.EmbedBuilder()
        .setTitle(`📊 ${username} — Level ${progress.level}`)
        .setDescription([
        `${(0, t_1.t)(locale, "rank.server_line", { rank, globalRank: globalRank || "—" })}`,
        "",
        `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
        `${member.xp.toLocaleString()} / ${(0, calculator_1.xpForLevel)(progress.level + 1).toLocaleString()} XP`,
        `🌐 ${(0, t_1.t)(locale, "rank.total_xp", { globalXP: globalXP.toLocaleString() })}`,
        "",
        periodStats
            ? `📊 **${(0, t_1.t)(locale, "rank.recent_activity")}**\n${(0, t_1.t)(locale, "rank.today")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.daily.toLocaleString() })} | ${(0, t_1.t)(locale, "rank.this_week")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.weekly.toLocaleString() })} | ${(0, t_1.t)(locale, "rank.this_month")}: ${(0, t_1.t)(locale, "rank.period_xp", { xp: periodStats.monthly.toLocaleString() })}`
            : "",
        `💬 ${member.messageCount.toLocaleString()}  ·  🎤 ${formatVoiceTime(member.voiceMinutes)}  ·  ❤️ ${member.reactionCount.toLocaleString()}`,
    ]
        .filter(Boolean)
        .join("\n"))
        .setColor(0x5865f2)
        .setTimestamp();
}
const MEDALS = ["🥇", "🥈", "🥉"];
function buildLeaderboardEmbed(members, guildName, locale, page = 1, totalPages = 1) {
    if (members.length === 0) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(`🏆 ${(0, t_1.t)(locale, "leaderboard.title")}`)
            .setDescription((0, t_1.t)(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }
    const offset = (page - 1) * 10;
    const lines = members.map((m, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        return `${prefix} <@${m.userId}> — Level ${m.level} (${m.xp.toLocaleString()} XP)`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🏆 ${(0, t_1.t)(locale, "leaderboard.title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `${guildName} · ${(0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}
function buildLevelUpEmbed(userId, newLevel, locale, globalRank) {
    const lines = [(0, t_1.t)(locale, "rank.level_up", { userId, level: newLevel })];
    if (globalRank) {
        lines.push(`🌐 ${(0, t_1.t)(locale, "rank.global_rank", { globalRank })}`);
    }
    return new discord_js_1.EmbedBuilder().setDescription(lines.join("\n")).setColor(0xf0b132);
}
function buildGlobalLeaderboardEmbed(users, usernames, locale, page = 1, totalPages = 1) {
    if (users.length === 0) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(`🌐 ${(0, t_1.t)(locale, "leaderboard.global_title")}`)
            .setDescription((0, t_1.t)(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }
    const offset = (page - 1) * 10;
    const lines = users.map((u, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const level = (0, calculator_1.levelFromXP)(u.totalPoint);
        const displayName = usernames.has(u.userID) ? `@${usernames.get(u.userID)}` : `<@${u.userID}>`;
        return `${prefix} ${displayName} — Level ${level} (${u.totalPoint.toLocaleString()} XP)`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🌐 ${(0, t_1.t)(locale, "leaderboard.global_title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `Global · ${(0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}
async function buildPeriodLeaderboardEmbed(entries, title, locale, page, totalPages, isGlobal, interaction, usernameCache) {
    if (entries.length === 0) {
        return new discord_js_1.EmbedBuilder().setTitle(title).setDescription((0, t_1.t)(locale, "leaderboard.empty")).setColor(0xf0b132);
    }
    // Resolve usernames for global mode
    if (isGlobal) {
        await Promise.all(entries.map(async (e) => {
            if (usernameCache.has(e.userId))
                return;
            try {
                const member = await interaction.guild?.members.fetch(e.userId);
                if (member) {
                    usernameCache.set(e.userId, member.displayName);
                    return;
                }
            }
            catch {
                // Not in guild
            }
            try {
                const user = await client_1.default.users.fetch(e.userId);
                usernameCache.set(e.userId, user.displayName);
            }
            catch {
                // Not fetchable
            }
        }));
    }
    const offset = (page - 1) * 10;
    const lines = entries.map((e, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const display = isGlobal && usernameCache.has(e.userId) ? `@${usernameCache.get(e.userId)}` : `<@${e.userId}>`;
        return `${prefix} ${display} — ${e.xp.toLocaleString()} XP`;
    });
    const footerLabel = isGlobal ? "Global" : (interaction.guild?.name ?? "Server");
    return new discord_js_1.EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `${footerLabel} · ${(0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}
function buildServerRankEmbed(stats, guildName, rank, totalServers, locale, periodStats) {
    const totalXP = stats?.totalXP ?? 0;
    const level = (0, calculator_1.levelFromXP)(totalXP);
    const progress = (0, calculator_1.progressToNextLevel)(totalXP);
    const lines = [
        `🏅 ${(0, t_1.t)(locale, "server_rank.rank", { rank: rank || "—", total: totalServers })}`,
        "",
        `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
        `${totalXP.toLocaleString()} / ${(0, calculator_1.xpForLevel)(level + 1).toLocaleString()} XP`,
        "",
    ];
    if (periodStats) {
        lines.push(`📊 **${(0, t_1.t)(locale, "rank.recent_activity")}**`, `${(0, t_1.t)(locale, "server_rank.period_daily")}: +${periodStats.daily.toLocaleString()} | ${(0, t_1.t)(locale, "server_rank.period_weekly")}: +${periodStats.weekly.toLocaleString()} | ${(0, t_1.t)(locale, "server_rank.period_monthly")}: +${periodStats.monthly.toLocaleString()}`, "");
    }
    lines.push(`💬 ${(stats?.totalMessages ?? 0).toLocaleString()}  ·  🎤 ${formatVoiceTime(stats?.totalVoiceMinutes ?? 0)}  ·  ❤️ ${(stats?.totalReactions ?? 0).toLocaleString()}  ·  👥 ${(stats?.activeMembers ?? 0).toLocaleString()}`);
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🏆 ${guildName} — Level ${level}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setTimestamp();
}
function buildServerLeaderboardEmbed(servers, serverNames, locale, page, totalPages) {
    if (servers.length === 0) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(`🏆 ${(0, t_1.t)(locale, "leaderboard.servers_title")}`)
            .setDescription((0, t_1.t)(locale, "leaderboard.servers_empty"))
            .setColor(0xf0b132);
    }
    const offset = (page - 1) * 10;
    const lines = servers.map((s, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const name = serverNames.get(s.guildId) ?? "Unknown Server";
        return `${prefix} ${name} — ${s.totalXP.toLocaleString()} XP (👥 ${s.activeMembers})`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🏆 ${(0, t_1.t)(locale, "leaderboard.servers_title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: (0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages }) })
        .setTimestamp();
}
function buildServerPeriodLeaderboardEmbed(snapshots, title, serverNames, locale, page, totalPages) {
    if (snapshots.length === 0) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription((0, t_1.t)(locale, "leaderboard.servers_empty"))
            .setColor(0xf0b132);
    }
    const offset = (page - 1) * 10;
    const lines = snapshots.map((s, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const name = serverNames.get(s.guildId) ?? "Unknown Server";
        return `${prefix} ${name} — ${s.xp.toLocaleString()} XP (👥 ${s.activeMembers})`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: (0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages }) })
        .setTimestamp();
}
