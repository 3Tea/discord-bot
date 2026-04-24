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
function fallbackLocale() {
    return "en";
}
const CURSE_TEXT_COUNT = 5;
function formatCurseEmbed(interaction, result, locale) {
    const embed = new discord_js_1.EmbedBuilder().setColor(0x800080).setTimestamp();
    const flavorText = (0, t_1.t)(locale, "curse.texts." + Math.floor(Math.random() * CURSE_TEXT_COUNT));
    let description = (0, t_1.t)(locale, "curse.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";
    description += (0, t_1.t)(locale, "curse.reward_coin", { coin: result.userReward.coin }) + "\n";
    if (result.targetReward && result.targetId) {
        description +=
            (0, t_1.t)(locale, "curse.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }
    embed.setDescription(description);
    return embed;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("curse")
        .setDescription("Curse to receive coin (less than pray)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.curse.desc"))
        .addUserOption((option) => option
        .setName("target")
        .setDescription("Curse someone")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.curse.target.desc"))),
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
                await interaction.editReply((0, t_1.t)(locale, "curse.bot_error"));
                return;
            }
            if (targetUser?.id === userId) {
                await interaction.editReply((0, t_1.t)(locale, "curse.self_error"));
                return;
            }
            const result = await pray_service_1.default.curse(userId, guildId, targetUser?.id);
            const embed = formatCurseEmbed(interaction, result, locale);
            const gotStar = await (0, starDrop_1.tryStarDrop)(userId, 0.05, "curse");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + (0, t_1.t)(locale, "star_drop.found"));
            }
            await reply_1.default.embedEdit(interaction, embed);
            const questTrigger = targetUser ? "curse_target" : "curse";
            await quest_service_1.default.trackProgress(userId, guildId, questTrigger).catch(() => { });
        }
        catch (error) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
            if (error instanceof Error && error.message === "CURSE_COOLDOWN") {
                await interaction.editReply((0, t_1.t)(locale, "curse.cooldown"));
                return;
            }
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
