"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/commands/slash/server-rank.ts
const discord_js_1 = require("discord.js");
const guildStats_model_1 = __importDefault(require("../../models/guildStats.model"));
const guildStatsSnapshot_model_1 = __importDefault(require("../../models/guildStatsSnapshot.model"));
const rankCard_1 = require("../../util/xp/rankCard");
const canvasServerRankCard_1 = require("../../util/xp/canvasServerRankCard");
const periodKey_1 = require("../../util/xp/periodKey");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
async function getServerPeriodStats(guildId) {
    const keys = (0, periodKey_1.getCurrentPeriodKeys)();
    const [daily, weekly, monthly] = await Promise.all([
        guildStatsSnapshot_model_1.default.findOne({ guildId, period: "daily", periodKey: keys.daily }).lean(),
        guildStatsSnapshot_model_1.default.findOne({ guildId, period: "weekly", periodKey: keys.weekly }).lean(),
        guildStatsSnapshot_model_1.default.findOne({ guildId, period: "monthly", periodKey: keys.monthly }).lean(),
    ]);
    return {
        daily: daily?.xp ?? 0,
        weekly: weekly?.xp ?? 0,
        monthly: monthly?.xp ?? 0,
    };
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("server-rank")
        .setDescription("View this server's XP stats and ranking")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.server-rank.desc")),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            return interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const guildId = interaction.guildId;
            const guild = interaction.guild;
            const stats = await guildStats_model_1.default.findOne({ guildId });
            // Calculate server rank
            let rank = 0;
            let totalServers = 0;
            if (stats) {
                const higherCount = await guildStats_model_1.default.countDocuments({
                    totalXP: { $gt: stats.totalXP },
                });
                rank = higherCount + 1;
            }
            totalServers = await guildStats_model_1.default.countDocuments();
            const periodStats = await getServerPeriodStats(guildId);
            // Try canvas render, fallback to embed
            try {
                const iconURL = guild.iconURL({ extension: "png", size: 256 });
                const pngBuffer = await (0, canvasServerRankCard_1.renderServerRankCard)({
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
                const attachment = new discord_js_1.AttachmentBuilder(pngBuffer, { name: "server-rank.png" });
                await interaction.editReply({ files: [attachment] });
            }
            catch {
                // Canvas failed — fallback to embed
                const embed = (0, rankCard_1.buildServerRankEmbed)(stats, guild.name, rank, totalServers, locale, periodStats);
                await interaction.editReply({ embeds: [embed] });
            }
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "server_rank.error"));
        }
    },
};
