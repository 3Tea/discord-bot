import { EmbedBuilder, GuildMember } from "discord.js";
import type { SupportedLocale } from "../i18n/index";
import { t } from "../i18n/t";
import { progressToNextLevel } from "../xp/calculator";

export interface ProfileData {
    // XP
    xp: number;
    level: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    serverRank: number;
    // Economy
    coin: number;
    gem: number;
    // Global
    star: number;
    // Streaks
    prayStreak: number;
    questStreak: number;
    // Meta
    member: GuildMember;
    premiumBadge: string | null;
    achievementCount?: { unlocked: number; total: number };
}

export function buildProfileEmbed(data: ProfileData, locale: SupportedLocale): EmbedBuilder {
    const {
        xp,
        level,
        messageCount,
        voiceMinutes,
        reactionCount,
        serverRank,
        coin,
        gem,
        star,
        prayStreak,
        questStreak,
        member,
        premiumBadge,
        achievementCount,
    } = data;

    const progress = progressToNextLevel(xp);
    const pct = progress.percentage;
    const filled = Math.floor(pct / 10);
    const progressBar = "█".repeat(filled) + "░".repeat(10 - filled);

    const voiceH = Math.floor(voiceMinutes / 60);
    const voiceM = voiceMinutes % 60;
    const voiceStr = `${voiceH}h ${voiceM}m`;

    const joinDate = member.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : "Unknown";

    const titleSuffix = premiumBadge ? ` ${premiumBadge}` : "";

    return new EmbedBuilder()
        .setAuthor({
            name: t(locale, "profile.title", { username: member.user.username }) + titleSuffix,
            iconURL: member.user.displayAvatarURL({ size: 128 }),
        })
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setColor(0x5865f2)
        .addFields(
            {
                name: t(locale, "profile.level_rank"),
                value: `${t(locale, "profile.level", { level: String(level) })}\n${progressBar} ${pct}%\n${t(locale, "profile.rank", { rank: String(serverRank) })}`,
                inline: true,
            },
            {
                name: t(locale, "profile.economy"),
                value: `${t(locale, "profile.coin", { amount: coin.toLocaleString() })}\n${t(locale, "profile.gem", { amount: gem.toLocaleString() })}\n${t(locale, "profile.star", { amount: star.toLocaleString() })}`,
                inline: true,
            },
            {
                name: t(locale, "profile.streaks"),
                value: `${t(locale, "profile.pray_streak", { days: String(prayStreak) })}\n${t(locale, "profile.quest_streak", { days: String(questStreak) })}`,
                inline: true,
            },
            {
                name: t(locale, "profile.activity"),
                value: `${t(locale, "profile.messages", { total: messageCount.toLocaleString() })}\n${t(locale, "profile.voice", { time: voiceStr })}\n${t(locale, "profile.reactions", { total: reactionCount.toLocaleString() })}`,
                inline: true,
            },
            ...(achievementCount
                ? [
                      {
                          name: t(locale, "profile.achievements"),
                          value: `${achievementCount.unlocked}/${achievementCount.total}`,
                          inline: true,
                      },
                  ]
                : [])
        )
        .setFooter({ text: t(locale, "profile.member_since", { date: joinDate }) })
        .setTimestamp();
}
