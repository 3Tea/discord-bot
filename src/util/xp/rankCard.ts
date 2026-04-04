import { EmbedBuilder } from "discord.js";
import type { IMemberXP } from "../../models/memberXP.model";
import type { IUser } from "../../models/user.model";
import { levelFromXP, progressToNextLevel, xpForLevel } from "./calculator";

const PROGRESS_BAR_LENGTH = 20;
const FILLED = "▓";
const EMPTY = "░";

function buildProgressBar(percentage: number): string {
    const filled = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH);
    const empty = PROGRESS_BAR_LENGTH - filled;
    return FILLED.repeat(filled) + EMPTY.repeat(empty);
}

function formatVoiceTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export function buildRankEmbed(
    member: IMemberXP | null,
    username: string,
    rank: number,
    globalRank: number,
    globalXP: number
): EmbedBuilder {
    if (!member) {
        return new EmbedBuilder()
            .setTitle(`📊 ${username} — Level 0`)
            .setDescription(
                [
                    "Chưa có xếp hạng",
                    "",
                    `${buildProgressBar(0)} 0%`,
                    `0 / ${xpForLevel(1)} XP`,
                    "",
                    "💬 0  ·  🎤 0m  ·  ❤️ 0",
                ].join("\n")
            )
            .setColor(0x2b2d31);
    }

    const progress = progressToNextLevel(member.xp);

    return new EmbedBuilder()
        .setTitle(`📊 ${username} — Level ${progress.level}`)
        .setDescription(
            [
                `Rank **#${rank}** trên server · 🌐 **#${globalRank || "—"}** toàn cầu`,
                "",
                `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
                `${member.xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()} XP`,
                `🌐 Tổng XP: **${globalXP.toLocaleString()}**`,
                "",
                `💬 ${member.messageCount.toLocaleString()}  ·  🎤 ${formatVoiceTime(member.voiceMinutes)}  ·  ❤️ ${member.reactionCount.toLocaleString()}`,
            ].join("\n")
        )
        .setColor(0x5865f2)
        .setTimestamp();
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function buildLeaderboardEmbed(
    members: IMemberXP[],
    guildName: string
): EmbedBuilder {
    if (members.length === 0) {
        return new EmbedBuilder()
            .setTitle("🏆 Bảng xếp hạng")
            .setDescription("Chưa có ai có XP!")
            .setColor(0xf0b132);
    }

    const lines = members.map((m, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        return `${prefix} <@${m.userId}> — Level ${m.level} (${m.xp.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle("🏆 Bảng xếp hạng")
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: guildName })
        .setTimestamp();
}

export function buildLevelUpEmbed(userId: string, newLevel: number, globalRank?: number): EmbedBuilder {
    const lines = [`🎉 <@${userId}> đã đạt **Level ${newLevel}**!`];
    if (globalRank) {
        lines.push(`🌐 Global Rank: **#${globalRank}**`);
    }

    return new EmbedBuilder()
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132);
}

export function buildGlobalLeaderboardEmbed(users: IUser[]): EmbedBuilder {
    if (users.length === 0) {
        return new EmbedBuilder()
            .setTitle("🌐 Bảng xếp hạng toàn cầu")
            .setDescription("Chưa có ai có XP!")
            .setColor(0xf0b132);
    }

    const lines = users.map((u, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        const level = levelFromXP(u.totalPoint);
        return `${prefix} <@${u.userID}> — Level ${level} (${u.totalPoint.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle("🌐 Bảng xếp hạng toàn cầu")
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: "Global" })
        .setTimestamp();
}
