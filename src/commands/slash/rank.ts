import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { buildRankEmbed } from "../../util/xp/rankCard";

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

            const embed = buildRankEmbed(member, target.username, rank);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Không thể tải rank card. Vui lòng thử lại sau.");
        }
    },
};
