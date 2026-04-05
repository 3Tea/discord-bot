import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import client from "../../client";
import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed } from "../../util/xp/rankCard";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .setDescriptionLocalizations({ vi: "Xem bảng xếp hạng XP" })
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .setDescriptionLocalizations({ vi: "Loại bảng xếp hạng" })
                .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

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

                const embed = buildGlobalLeaderboardEmbed(topUsers, usernames, locale);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const guildId = interaction.guildId!;
                const topMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(10);

                const guildName = interaction.guild?.name ?? "Server";
                const embed = buildLeaderboardEmbed(topMembers, guildName, locale);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply(t(locale, "leaderboard.error"));
        }
    },
};
