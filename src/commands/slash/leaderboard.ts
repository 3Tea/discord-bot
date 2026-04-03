import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { buildLeaderboardEmbed } from "../../util/xp/rankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server XP leaderboard"),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const guildId = interaction.guildId!;

            const topMembers = await MemberXPModel.find({ guildId })
                .sort({ xp: -1 })
                .limit(10);

            const guildName = interaction.guild?.name ?? "Server";
            const embed = buildLeaderboardEmbed(topMembers, guildName);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Không thể tải bảng xếp hạng. Vui lòng thử lại sau.");
        }
    },
};
