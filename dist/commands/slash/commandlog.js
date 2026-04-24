"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/commands/slash/commandlog.ts
const discord_js_1 = require("discord.js");
const commandLog_model_1 = __importDefault(require("../../models/commandLog.model"));
const index_1 = require("../../util/config/index");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
function isDevAuthorized(interaction) {
    return interaction.guildId === index_1.GUILD_ID && interaction.user.id === index_1.DEV_USER_ID;
}
function periodToDate(period) {
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
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("commandlog")
        .setDescription("Command usage logs (dev only)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.desc"))
        .addSubcommand((sub) => sub
        .setName("stats")
        .setDescription("View command usage statistics")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.stats.desc"))
        .addStringOption((opt) => opt
        .setName("period")
        .setDescription("Time period for stats")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.stats.period.desc"))
        .addChoices({ name: "Today", value: "today" }, { name: "7 days", value: "7d" }, { name: "30 days", value: "30d" }, { name: "All time", value: "all" })))
        .addSubcommand((sub) => sub
        .setName("user")
        .setDescription("View a user's command history")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.user.desc"))
        .addUserOption((opt) => opt
        .setName("target")
        .setDescription("User to look up")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.user.target.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("limit")
        .setDescription("Number of entries (1-25)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.user.limit.desc"))
        .setMinValue(1)
        .setMaxValue(25)))
        .addSubcommand((sub) => sub
        .setName("command")
        .setDescription("View usage history for a command")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.command.desc"))
        .addStringOption((opt) => opt
        .setName("name")
        .setDescription("Command name to look up")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.command.name.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("limit")
        .setDescription("Number of entries (1-25)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.commandlog.command.limit.desc"))
        .setMinValue(1)
        .setMaxValue(25))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand(true);
        switch (subcommand) {
            case "stats": {
                const period = interaction.options.getString("period") ?? "7d";
                const since = periodToDate(period);
                const match = since ? { createdAt: { $gte: since } } : {};
                const [topCommands, totalResult, errorResult, latencyResult] = await Promise.all([
                    commandLog_model_1.default.aggregate([
                        { $match: match },
                        { $group: { _id: "$commandName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ]),
                    commandLog_model_1.default.countDocuments(match),
                    commandLog_model_1.default.countDocuments({ ...match, success: false }),
                    commandLog_model_1.default.aggregate([
                        { $match: match },
                        { $group: { _id: null, avg: { $avg: "$latencyMs" } } },
                    ]),
                ]);
                const avgLatency = latencyResult[0]?.avg ?? 0;
                const topList = topCommands.map((c, i) => `${i + 1}. \`/${c._id}\` — **${c.count}** uses`).join("\n") || "No data";
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle(`Command Stats — ${period}`)
                    .setDescription(topList)
                    .addFields({ name: "Total", value: `${totalResult}`, inline: true }, { name: "Errors", value: `${errorResult}`, inline: true }, { name: "Avg Latency", value: `${Math.round(avgLatency)}ms`, inline: true })
                    .setColor(0x5865f2)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                break;
            }
            case "user": {
                const target = interaction.options.getUser("target", true);
                const limit = interaction.options.getInteger("limit") ?? 10;
                const logs = await commandLog_model_1.default.find({ userId: target.id })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();
                const lines = logs
                    .map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? "OK" : `ERR: ${log.errorMessage ?? "unknown"}`;
                    return `\`/${log.commandName}\` ${time} [${status}]`;
                })
                    .join("\n") || "No logs found.";
                const embed = new discord_js_1.EmbedBuilder()
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
                const logs = await commandLog_model_1.default.find({ commandName: name })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();
                const lines = logs
                    .map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? `${log.latencyMs}ms` : `ERR`;
                    return `**${log.username}** ${time} [${status}]`;
                })
                    .join("\n") || "No logs found.";
                const embed = new discord_js_1.EmbedBuilder()
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
