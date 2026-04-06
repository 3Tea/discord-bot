// src/commands/slash/server-rank.ts
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";

import { buildServerRankEmbed } from "../../util/xp/rankCard";
import { renderServerRankCard } from "../../util/xp/canvasServerRankCard";
import { getCurrentPeriodKeys } from "../../util/xp/periodKey";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

async function getServerPeriodStats(
    guildId: string
): Promise<{ daily: number; weekly: number; monthly: number }> {
    const keys = getCurrentPeriodKeys();
    const [daily, weekly, monthly] = await Promise.all([
        GuildStatsSnapshotModel.findOne({ guildId, period: "daily", periodKey: keys.daily }).lean(),
        GuildStatsSnapshotModel.findOne({ guildId, period: "weekly", periodKey: keys.weekly }).lean(),
        GuildStatsSnapshotModel.findOne({ guildId, period: "monthly", periodKey: keys.monthly }).lean(),
    ]);
    return {
        daily: daily?.xp ?? 0,
        weekly: weekly?.xp ?? 0,
        monthly: monthly?.xp ?? 0,
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("server-rank")
        .setDescription("View this server's XP stats and ranking")
        .setDescriptionLocalizations({
            vi: "Xem thống kê XP và xếp hạng server",
            ja: "サーバーのXP統計とランキングを表示",
            ko: "서버 XP 통계 및 랭킹 보기",
            "zh-CN": "查看服务器XP统计和排名",
            id: "Lihat statistik XP dan peringkat server",
            "es-ES": "Ver estadísticas de XP y clasificación del servidor",
        }),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            return interaction.reply({ content: t(locale, "server_rank.guild_only"), ephemeral: true });
        }

        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const guildId = interaction.guildId;
            const guild = interaction.guild!;

            const stats = await GuildStatsModel.findOne({ guildId });

            // Calculate server rank
            let rank = 0;
            let totalServers = 0;
            if (stats) {
                const higherCount = await GuildStatsModel.countDocuments({
                    totalXP: { $gt: stats.totalXP },
                });
                rank = higherCount + 1;
            }
            totalServers = await GuildStatsModel.countDocuments();

            const periodStats = await getServerPeriodStats(guildId);

            // Try canvas render, fallback to embed
            try {
                const iconURL = guild.iconURL({ extension: "png", size: 256 });
                const pngBuffer = await renderServerRankCard({
                    guildName: guild.name,
                    guildIconURL: iconURL,
                    totalXP: stats?.totalXP ?? 0,
                    rank,
                    totalServers,
                    totalMessages: stats?.totalMessages ?? 0,
                    totalVoiceMinutes: stats?.totalVoiceMinutes ?? 0,
                    totalReactions: stats?.totalReactions ?? 0,
                    activeMembers: stats?.activeMembers ?? 0,
                    periodStats,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "server-rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildServerRankEmbed(stats, guild.name, rank, totalServers, locale, periodStats);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply(t(locale, "server_rank.error"));
        }
    },
};
