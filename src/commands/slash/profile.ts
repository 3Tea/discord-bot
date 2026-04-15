import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import MemberXPModel from "../../models/memberXP.model";
import UserEconomyModel from "../../models/userEconomy.model";
import UserWalletModel from "../../models/userWallet.model";
import UserQuestModel from "../../models/userQuest.model";
import PremiumService from "../../services/premium/premium.service";
import { buildProfileEmbed } from "../../util/profile/profileEmbed";
import { renderProfileCard } from "../../util/profile/canvasProfile";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import { logger } from "../../util/log/logger.mixed";

function fallbackLocale(): SupportedLocale {
    return "en";
}

export default {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View your profile card")
        .setDescriptionLocalizations(descriptionLocales("cmd.profile.desc"))
        .addUserOption((opt) =>
            opt
                .setName("user")
                .setDescription("User to view")
                .setDescriptionLocalizations(descriptionLocales("cmd.profile.user.desc"))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const guildId = interaction.guildId!;
            const targetUser = interaction.options.getUser("user") ?? interaction.user;
            const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                await interaction.editReply(t(locale, "common.error"));
                return;
            }

            // Fetch XP data first (rank count depends on it)
            const memberXP = await MemberXPModel.findOne({ guildId, userId: targetUser.id });

            // Parallel fetch of remaining data + rank count
            const [economy, wallet, questDoc, premiumConfig, tier, rankCount] = await Promise.all([
                UserEconomyModel.findOne({ guildId, userId: targetUser.id }),
                UserWalletModel.findOne({ userId: targetUser.id }),
                UserQuestModel.findOne({ userId: targetUser.id }).sort({ date: -1 }).lean(),
                PremiumService.getConfig(targetUser.id),
                PremiumService.getTier(targetUser.id),
                memberXP
                    ? MemberXPModel.countDocuments({ guildId, xp: { $gt: memberXP.xp } })
                    : Promise.resolve(0),
            ]);

            // Check if user has any data
            if (!memberXP && !economy) {
                await interaction.editReply(t(locale, "profile.no_data"));
                return;
            }

            const xp = memberXP?.xp ?? 0;
            const level = memberXP?.level ?? 0;
            const progress = progressToNextLevel(xp);
            const serverRank = rankCount + 1;

            const profileData = {
                xp,
                level,
                messageCount: memberXP?.messageCount ?? 0,
                voiceMinutes: memberXP?.voiceMinutes ?? 0,
                reactionCount: memberXP?.reactionCount ?? 0,
                serverRank,
                coin: economy?.coin ?? 0,
                gem: economy?.gem ?? 0,
                star: wallet?.star ?? 0,
                prayStreak: economy?.prayStreak ?? 0,
                questStreak: questDoc?.questStreak ?? 0,
                member,
                premiumBadge: premiumConfig.badge,
            };

            // Route by premium tier: Star and Galaxy get canvas card
            if (tier === "star" || tier === "galaxy") {
                try {
                    const canvasBuffer = await renderProfileCard({
                        username: targetUser.username,
                        avatarURL: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                        level,
                        xp,
                        xpForNextLevel: xpForLevel(level + 1),
                        percentage: progress.percentage,
                        serverRank,
                        coin: economy?.coin ?? 0,
                        gem: economy?.gem ?? 0,
                        star: wallet?.star ?? 0,
                        prayStreak: economy?.prayStreak ?? 0,
                        questStreak: questDoc?.questStreak ?? 0,
                        messageCount: memberXP?.messageCount ?? 0,
                        voiceMinutes: memberXP?.voiceMinutes ?? 0,
                        reactionCount: memberXP?.reactionCount ?? 0,
                        joinDate: member.joinedAt?.toISOString().slice(0, 10) ?? "Unknown",
                        premiumBadge: premiumConfig.badge,
                        rankCardTheme: premiumConfig.rankCardTheme,
                    });
                    const attachment = new AttachmentBuilder(canvasBuffer, { name: "profile.png" });
                    await interaction.editReply({ files: [attachment] });
                    return;
                } catch (error) {
                    // Canvas failed — fall back to embed
                    const msg = error instanceof Error ? error.message : "Unknown";
                    logger.warn(`Profile canvas failed for ${targetUser.id}, falling back to embed: ${msg}`);
                }
            }

            // Free tier or canvas fallback
            const embed = buildProfileEmbed(profileData, locale);
            await Reply.embedEdit(interaction, embed);
        } catch {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
