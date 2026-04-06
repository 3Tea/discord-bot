import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildRankEmbed, getPeriodStats } from "../../util/xp/rankCard";
import { renderRankCard } from "../../util/xp/canvasRankCard";
import { getGlobalRank } from "../../util/xp/globalXP";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .setDescriptionLocalizations({ vi: "Xem rank card của bạn hoặc người khác" })
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to check rank for")
                .setDescriptionLocalizations({ vi: "Người dùng cần xem rank" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const member = await MemberXPModel.findOne({
                guildId,
                userId: target.id,
            });

            // Calculate guild rank
            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }

            // Calculate global rank
            const { rank: globalRank, totalPoint: globalXP } = await getGlobalRank(target.id);

            const periodStats = await getPeriodStats(target.id, interaction.guildId!);

            const progress = progressToNextLevel(member?.xp ?? 0);

            // Try canvas render, fallback to embed
            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await renderRankCard({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    globalRank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: xpForLevel(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                    totalXP: globalXP,
                    periodStats,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildRankEmbed(member, target.username, rank, globalRank, globalXP, locale, periodStats);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply(t(locale, "rank.error"));
        }
    },
};
