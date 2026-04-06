import { EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { IMemberXP } from "../../models/memberXP.model";
import type { IUser } from "../../models/user.model";
import client from "../../client";
import { levelFromXP, progressToNextLevel, xpForLevel } from "./calculator";
import { t } from "../i18n/t";
import type { SupportedLocale } from "../i18n/index";

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
    globalXP: number,
    locale: SupportedLocale
): EmbedBuilder {
    if (!member) {
        const globalLine = globalRank
            ? `🌐 **#${globalRank}** ${t(locale, "rank.global_line", { globalRank, globalXP: globalXP.toLocaleString() })}`
            : t(locale, "rank.no_rank");

        return new EmbedBuilder()
            .setTitle(`📊 ${username} — Level 0`)
            .setDescription(
                [
                    globalLine,
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
                `${t(locale, "rank.server_line", { rank, globalRank: globalRank || "—" })}`,
                "",
                `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
                `${member.xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()} XP`,
                `🌐 ${t(locale, "rank.total_xp", { globalXP: globalXP.toLocaleString() })}`,
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
    guildName: string,
    locale: SupportedLocale,
    page = 1,
    totalPages = 1
): EmbedBuilder {
    if (members.length === 0) {
        return new EmbedBuilder()
            .setTitle(`🏆 ${t(locale, "leaderboard.title")}`)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    const offset = (page - 1) * 10;
    const lines = members.map((m, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        return `${prefix} <@${m.userId}> — Level ${m.level} (${m.xp.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle(`🏆 ${t(locale, "leaderboard.title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `${guildName} · ${t(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}

export function buildLevelUpEmbed(
    userId: string,
    newLevel: number,
    locale: SupportedLocale,
    globalRank?: number
): EmbedBuilder {
    const lines = [t(locale, "rank.level_up", { userId, level: newLevel })];
    if (globalRank) {
        lines.push(`🌐 ${t(locale, "rank.global_rank", { globalRank })}`);
    }

    return new EmbedBuilder().setDescription(lines.join("\n")).setColor(0xf0b132);
}

export function buildGlobalLeaderboardEmbed(
    users: IUser[],
    usernames: Map<string, string>,
    locale: SupportedLocale,
    page = 1,
    totalPages = 1
): EmbedBuilder {
    if (users.length === 0) {
        return new EmbedBuilder()
            .setTitle(`🌐 ${t(locale, "leaderboard.global_title")}`)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    const offset = (page - 1) * 10;
    const lines = users.map((u, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const level = levelFromXP(u.totalPoint);
        const displayName = usernames.has(u.userID) ? `@${usernames.get(u.userID)}` : `<@${u.userID}>`;
        return `${prefix} ${displayName} — Level ${level} (${u.totalPoint.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle(`🌐 ${t(locale, "leaderboard.global_title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `Global · ${t(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}

interface PeriodEntry {
    userId: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

export async function buildPeriodLeaderboardEmbed(
    entries: PeriodEntry[],
    title: string,
    locale: SupportedLocale,
    page: number,
    totalPages: number,
    isGlobal: boolean,
    interaction: ChatInputCommandInteraction,
    usernameCache: Map<string, string>
): Promise<EmbedBuilder> {
    if (entries.length === 0) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    // Resolve usernames for global mode
    if (isGlobal) {
        await Promise.all(
            entries.map(async (e) => {
                if (usernameCache.has(e.userId)) return;
                try {
                    const member = await interaction.guild?.members.fetch(e.userId);
                    if (member) {
                        usernameCache.set(e.userId, member.displayName);
                        return;
                    }
                } catch {
                    // Not in guild
                }
                try {
                    const user = await client.users.fetch(e.userId);
                    usernameCache.set(e.userId, user.displayName);
                } catch {
                    // Not fetchable
                }
            })
        );
    }

    const offset = (page - 1) * 10;
    const lines = entries.map((e, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const display = isGlobal && usernameCache.has(e.userId)
            ? `@${usernameCache.get(e.userId)}`
            : `<@${e.userId}>`;
        return `${prefix} ${display} — ${e.xp.toLocaleString()} XP`;
    });

    const footerLabel = isGlobal ? "Global" : (interaction.guild?.name ?? "Server");

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `${footerLabel} · ${t(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}
