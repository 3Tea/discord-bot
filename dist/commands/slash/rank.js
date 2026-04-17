"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const calculator_1 = require("../../util/xp/calculator");
const rankCard_1 = require("../../util/xp/rankCard");
const canvasRankCard_1 = require("../../util/xp/canvasRankCard");
const globalXP_1 = require("../../util/xp/globalXP");
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.rank.desc"))
        .addUserOption((option) => option
        .setName("user")
        .setDescription("User to check rank for")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.rank.user.desc"))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId;
            const member = await memberXP_model_1.default.findOne({
                guildId,
                userId: target.id,
            });
            // Calculate guild rank
            let rank = 0;
            if (member) {
                const higherCount = await memberXP_model_1.default.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }
            // Calculate global rank
            const { rank: globalRank, totalPoint: globalXP } = await (0, globalXP_1.getGlobalRank)(target.id);
            const periodStats = await (0, rankCard_1.getPeriodStats)(target.id, interaction.guildId);
            const progress = (0, calculator_1.progressToNextLevel)(member?.xp ?? 0);
            const tierConfig = await premium_service_1.default.getConfig(target.id);
            // Try canvas render, fallback to embed
            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await (0, canvasRankCard_1.renderRankCard)({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    globalRank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: (0, calculator_1.xpForLevel)(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                    totalXP: globalXP,
                    periodStats,
                    premiumBadge: tierConfig.badge,
                    rankCardTheme: tierConfig.rankCardTheme,
                });
                const attachment = new discord_js_1.AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            }
            catch {
                // Canvas failed — fallback to embed
                const embed = (0, rankCard_1.buildRankEmbed)(member, target.username, rank, globalRank, globalXP, locale, periodStats);
                await interaction.editReply({ embeds: [embed] });
            }
            await quest_service_1.default.trackProgress(interaction.user.id, guildId, "rank").catch(() => { });
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "rank.error"));
        }
    },
};
