"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const userWallet_model_1 = __importDefault(require("../../models/userWallet.model"));
const userQuest_model_1 = __importDefault(require("../../models/userQuest.model"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const profileEmbed_1 = require("../../util/profile/profileEmbed");
const canvasProfile_1 = require("../../util/profile/canvasProfile");
const calculator_1 = require("../../util/xp/calculator");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const achievement_service_1 = __importDefault(require("../../services/achievement/achievement.service"));
function fallbackLocale() {
    return "en";
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("profile")
        .setDescription("View your profile card")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.profile.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to view")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.profile.user.desc"))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        try {
            const locale = await (0, locale_1.resolveLocale)(interaction);
            const guildId = interaction.guildId;
            const targetUser = interaction.options.getUser("user") ?? interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (!member) {
                await interaction.editReply((0, t_1.t)(locale, "common.error"));
                return;
            }
            // Fetch XP data first (rank count depends on it)
            const memberXP = await memberXP_model_1.default.findOne({ guildId, userId: targetUser.id });
            // Parallel fetch of remaining data + rank count
            const [economy, wallet, questDoc, premiumConfig, tier, rankCount, achievementCount] = await Promise.all([
                userEconomy_model_1.default.findOne({ guildId, userId: targetUser.id }),
                userWallet_model_1.default.findOne({ userId: targetUser.id }),
                userQuest_model_1.default.findOne({ userId: targetUser.id }).sort({ date: -1 }).lean(),
                premium_service_1.default.getConfig(targetUser.id),
                premium_service_1.default.getTier(targetUser.id),
                memberXP ? memberXP_model_1.default.countDocuments({ guildId, xp: { $gt: memberXP.xp } }) : Promise.resolve(0),
                achievement_service_1.default.getUnlockedCount(targetUser.id, guildId),
            ]);
            // Check if user has any data
            if (!memberXP && !economy) {
                await interaction.editReply((0, t_1.t)(locale, "profile.no_data"));
                return;
            }
            const xp = memberXP?.xp ?? 0;
            const level = memberXP?.level ?? 0;
            const progress = (0, calculator_1.progressToNextLevel)(xp);
            const serverRank = rankCount + 1;
            const profileData = {
                xp,
                level,
                messageCount: memberXP?.messageCount ?? 0,
                voiceMinutes: memberXP?.voiceMinutes ?? 0,
                reactionCount: memberXP?.reactionCount ?? 0,
                serverRank,
                coin: economy?.coin ?? 0,
                gem: economy?.gem ?? 0,
                star: wallet?.star ?? 0,
                prayStreak: economy?.prayStreak ?? 0,
                questStreak: questDoc?.questStreak ?? 0,
                member,
                premiumBadge: premiumConfig.badge,
                achievementCount,
            };
            // Route by premium tier: Star and Galaxy get canvas card
            if (tier === "star" || tier === "galaxy") {
                try {
                    const canvasBuffer = await (0, canvasProfile_1.renderProfileCard)({
                        username: targetUser.username,
                        avatarURL: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                        level,
                        xp,
                        xpForNextLevel: (0, calculator_1.xpForLevel)(level + 1),
                        percentage: progress.percentage,
                        serverRank,
                        coin: economy?.coin ?? 0,
                        gem: economy?.gem ?? 0,
                        star: wallet?.star ?? 0,
                        prayStreak: economy?.prayStreak ?? 0,
                        questStreak: questDoc?.questStreak ?? 0,
                        messageCount: memberXP?.messageCount ?? 0,
                        voiceMinutes: memberXP?.voiceMinutes ?? 0,
                        reactionCount: memberXP?.reactionCount ?? 0,
                        joinDate: member.joinedAt?.toISOString().slice(0, 10) ?? "Unknown",
                        premiumBadge: premiumConfig.badge,
                        rankCardTheme: premiumConfig.rankCardTheme,
                        achievementCount,
                    });
                    const attachment = new discord_js_1.AttachmentBuilder(canvasBuffer, { name: "profile.png" });
                    await interaction.editReply({ files: [attachment] });
                    return;
                }
                catch (error) {
                    // Canvas failed — fall back to embed
                    const msg = error instanceof Error ? error.message : "Unknown";
                    logger_mixed_1.logger.warn(`Profile canvas failed for ${targetUser.id}, falling back to embed: ${msg}`);
                }
            }
            // Free tier or canvas fallback
            const embed = (0, profileEmbed_1.buildProfileEmbed)(profileData, locale);
            await reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
