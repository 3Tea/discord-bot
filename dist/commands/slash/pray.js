"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const pray_service_1 = __importDefault(require("../../services/economy/pray.service"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const starDrop_1 = require("../../util/economy/starDrop");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const economyLog_service_1 = __importDefault(require("../../services/economy/economyLog.service"));
function fallbackLocale() {
    return "en";
}
const PRAY_TEXT_COUNT = 5;
function formatPrayEmbed(interaction, result, locale) {
    const embed = new discord_js_1.EmbedBuilder().setColor(0xffd700).setTimestamp();
    const flavorText = (0, t_1.t)(locale, "pray.texts." + Math.floor(Math.random() * PRAY_TEXT_COUNT));
    let description = (0, t_1.t)(locale, "pray.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";
    description += (0, t_1.t)(locale, "pray.reward_coin", { coin: result.userReward.coin });
    if (result.userReward.gem > 0) {
        description += (0, t_1.t)(locale, "pray.reward_gem", { gem: result.userReward.gem });
    }
    description += "\n";
    if (result.targetReward && result.targetId) {
        description +=
            (0, t_1.t)(locale, "pray.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }
    if (result.streakInfo.streak > 1) {
        description += "\n" + (0, t_1.t)(locale, "pray.streak", { streak: result.streakInfo.streak });
    }
    if (result.streakInfo.milestoneHit) {
        const m = result.streakInfo.milestoneHit;
        description += "\n" + (0, t_1.t)(locale, "pray.milestone", { days: m.days, bonusCoin: m.bonusCoin });
        if (m.bonusGem > 0) {
            description += (0, t_1.t)(locale, "pray.milestone_gem", { bonusGem: m.bonusGem });
        }
    }
    embed.setDescription(description);
    return embed;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("pray")
        .setDescription("Pray to receive coin")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pray.desc"))
        .addUserOption((option) => option
        .setName("target")
        .setDescription("Pray for another user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pray.target.desc"))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        try {
            const locale = await (0, locale_1.resolveLocale)(interaction);
            if (await economyAdmin_service_1.default.isFrozen(interaction.user.id, interaction.guildId)) {
                await interaction.editReply((0, t_1.t)(locale, "common.frozen"));
                return;
            }
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId;
            const userId = interaction.user.id;
            if (targetUser?.bot) {
                await interaction.editReply((0, t_1.t)(locale, "pray.bot_error"));
                return;
            }
            if (targetUser?.id === userId) {
                await interaction.editReply((0, t_1.t)(locale, "pray.self_error"));
                return;
            }
            const result = await pray_service_1.default.pray(userId, guildId, targetUser?.id);
            const embed = formatPrayEmbed(interaction, result, locale);
            const gotStar = await (0, starDrop_1.tryStarDrop)(userId, 0.05, "pray");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + (0, t_1.t)(locale, "star_drop.found"));
            }
            await reply_1.default.embedEdit(interaction, embed);
            const questTrigger = targetUser ? "pray_target" : "pray";
            await quest_service_1.default.trackProgress(userId, guildId, questTrigger).catch(() => { });
            economyLog_service_1.default.shouldLog(guildId, "coin_transaction", result.userReward.coin)
                .then((should) => {
                if (!should)
                    return;
                const targetSuffix = result.targetId ? ` (target: <@${result.targetId}>)` : "";
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle("Pray Reward")
                    .setDescription(`<@${userId}> earned **${result.userReward.coin}** coin from pray${targetSuffix}`)
                    .setColor(0xffd700)
                    .setTimestamp();
                economyLog_service_1.default.sendLog(guildId, logEmbed);
            })
                .catch(() => { });
        }
        catch (error) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
            if (error instanceof Error && error.message === "PRAY_COOLDOWN") {
                await interaction.editReply((0, t_1.t)(locale, "pray.cooldown"));
                return;
            }
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
