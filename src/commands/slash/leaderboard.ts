import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import client from "../../client";
import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed } from "../../util/xp/rankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const mode = interaction.options.getString("mode") ?? "server";

            if (mode === "global") {
                const topUsers = await UserModel.find().sort({ totalPoint: -1 }).limit(10);

                // Resolve display names (nickname > global name > username)
                const usernames = new Map<string, string>();
                await Promise.all(
                    topUsers.map(async (u) => {
                        try {
                            // Try guild nickname first
                            const member = await interaction.guild?.members.fetch(u.userID);
                            if (member) {
                                usernames.set(u.userID, member.displayName);
                                return;
                            }
                        } catch {
                            // Not in this guild — fall through
                        }
                        try {
                            const user = await client.users.fetch(u.userID);
                            usernames.set(u.userID, user.displayName);
                        } catch {
                            // User not fetchable — fallback handled in embed builder
                        }
                    })
                );

                const embed = buildGlobalLeaderboardEmbed(topUsers, usernames);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const guildId = interaction.guildId!;
                const topMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(10);

                const guildName = interaction.guild?.name ?? "Server";
                const embed = buildLeaderboardEmbed(topMembers, guildName);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply("Không thể tải bảng xếp hạng. Vui lòng thử lại sau.");
        }
    },
};
