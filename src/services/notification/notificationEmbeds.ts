import { EmbedBuilder, GuildMember, Guild } from "discord.js";
import type { SupportedLocale } from "../../util/i18n/index";
import { t } from "../../util/i18n/t";
import { progressToNextLevel } from "../../util/xp/calculator";

export function buildWelcomeEmbed(member: GuildMember, locale: SupportedLocale): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x57f287)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.welcome.title"))
        .setDescription(
            t(locale, "notification.welcome.description", {
                user: `<@${member.id}>`,
                server: member.guild.name,
                memberCount: String(member.guild.memberCount),
            })
        )
        .setTimestamp();
}

export function buildGoodbyeEmbed(member: GuildMember, locale: SupportedLocale): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xed4245)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.goodbye.title"))
        .setDescription(
            t(locale, "notification.goodbye.description", {
                username: member.user.username,
                server: member.guild.name,
            })
        )
        .setTimestamp();
}

export function buildLevelUpEmbed(
    userId: string,
    avatarURL: string,
    newLevel: number,
    totalXP: number,
    locale: SupportedLocale
): EmbedBuilder {
    const progress = progressToNextLevel(totalXP);
    const barLength = 10;
    const filled = Math.floor((progress.percentage / 100) * barLength);
    const progressBar = "\u2588".repeat(filled) + "\u2591".repeat(barLength - filled);

    return new EmbedBuilder()
        .setColor(0xfee75c)
        .setThumbnail(avatarURL)
        .setTitle(t(locale, "notification.level_up.title"))
        .setDescription(
            t(locale, "notification.level_up.description", {
                user: `<@${userId}>`,
                level: String(newLevel),
                progressBar,
                currentXP: String(progress.currentXP),
                requiredXP: String(progress.requiredXP),
            })
        )
        .setTimestamp();
}

export function buildBoostEmbed(member: GuildMember, locale: SupportedLocale): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xf47fff)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.boost.title"))
        .setDescription(
            t(locale, "notification.boost.description", {
                user: `<@${member.id}>`,
                boostCount: String(member.guild.premiumSubscriptionCount ?? 0),
            })
        )
        .setTimestamp();
}

export function buildMilestoneEmbed(guild: Guild, memberCount: number, locale: SupportedLocale): EmbedBuilder {
    const iconURL = guild.iconURL({ size: 256 });
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(t(locale, "notification.milestone.title"))
        .setDescription(
            t(locale, "notification.milestone.description", {
                server: guild.name,
                memberCount: String(memberCount),
            })
        )
        .setTimestamp();

    if (iconURL) embed.setThumbnail(iconURL);
    return embed;
}
