import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildRankEmbed } from "../../util/xp/rankCard";
import { renderRankCard } from "../../util/xp/canvasRankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .addUserOption((option) =>
            option.setName("user").setDescription("User to check rank for")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const member = await MemberXPModel.findOne({
                guildId,
                userId: target.id,
            });

            // Calculate rank position
            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }

            const progress = progressToNextLevel(member?.xp ?? 0);

            // Try canvas render, fallback to embed
            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await renderRankCard({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: xpForLevel(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildRankEmbed(member, target.username, rank);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply("Không thể tải rank card. Vui lòng thử lại sau.");
        }
    },
};
