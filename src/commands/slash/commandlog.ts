// src/commands/slash/commandlog.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import CommandLogModel from "../../models/commandLog.model";
import { DEV_USER_ID, GUILD_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";

function isDevAuthorized(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guildId === GUILD_ID && interaction.user.id === DEV_USER_ID;
}

function periodToDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
        case "today": {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            return start;
        }
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "all":
            return null;
        default:
            return null;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("commandlog")
        .setDescription("Command usage logs (dev only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("stats")
                .setDescription("View command usage statistics")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.stats.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("period")
                        .setDescription("Time period for stats")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.stats.period.desc"))
                        .addChoices(
                            { name: "Today", value: "today" },
                            { name: "7 days", value: "7d" },
                            { name: "30 days", value: "30d" },
                            { name: "All time", value: "all" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("user")
                .setDescription("View a user's command history")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("target")
                        .setDescription("User to look up")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.target.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("limit")
                        .setDescription("Number of entries (1-25)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.limit.desc"))
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("command")
                .setDescription("View usage history for a command")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("Command name to look up")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.name.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("limit")
                        .setDescription("Number of entries (1-25)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.limit.desc"))
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand(true);

        switch (subcommand) {
            case "stats": {
                const period = interaction.options.getString("period") ?? "7d";
                const since = periodToDate(period);
                const match = since ? { createdAt: { $gte: since } } : {};

                const [topCommands, totalResult, errorResult, latencyResult] = await Promise.all([
                    CommandLogModel.aggregate<{ _id: string; count: number }>([
                        { $match: match },
                        { $group: { _id: "$commandName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ]),
                    CommandLogModel.countDocuments(match),
                    CommandLogModel.countDocuments({ ...match, success: false }),
                    CommandLogModel.aggregate<{ _id: null; avg: number }>([
                        { $match: match },
                        { $group: { _id: null, avg: { $avg: "$latencyMs" } } },
                    ]),
                ]);

                const avgLatency = latencyResult[0]?.avg ?? 0;
                const topList = topCommands
                    .map((c, i) => `${i + 1}. \`/${c._id}\` — **${c.count}** uses`)
                    .join("\n") || "No data";

                const embed = new EmbedBuilder()
                    .setTitle(`Command Stats — ${period}`)
                    .setDescription(topList)
                    .addFields(
                        { name: "Total", value: `${totalResult}`, inline: true },
                        { name: "Errors", value: `${errorResult}`, inline: true },
                        { name: "Avg Latency", value: `${Math.round(avgLatency)}ms`, inline: true }
                    )
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case "user": {
                const target = interaction.options.getUser("target", true);
                const limit = interaction.options.getInteger("limit") ?? 10;

                const logs = await CommandLogModel.find({ userId: target.id })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                const lines = logs.map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? "OK" : `ERR: ${log.errorMessage ?? "unknown"}`;
                    return `\`/${log.commandName}\` ${time} [${status}]`;
                }).join("\n") || "No logs found.";

                const embed = new EmbedBuilder()
                    .setTitle(`Command History — ${target.username}`)
                    .setDescription(lines)
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case "command": {
                const name = interaction.options.getString("name", true);
                const limit = interaction.options.getInteger("limit") ?? 10;

                const logs = await CommandLogModel.find({ commandName: name })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                const lines = logs.map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? `${log.latencyMs}ms` : `ERR`;
                    return `**${log.username}** ${time} [${status}]`;
                }).join("\n") || "No logs found.";

                const embed = new EmbedBuilder()
                    .setTitle(`Usage History — /${name}`)
                    .setDescription(lines)
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            default:
                await interaction.editReply("Unknown subcommand.");
        }
    },
};
