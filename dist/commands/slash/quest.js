"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const quest_config_1 = require("../../services/quest/quest.config");
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("quest")
        .setDescription("Daily quests — complete tasks for coin and star rewards")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.quest.desc"))
        .addSubcommand((sub) => sub.setName("view").setDescription("View today's quests and progress"))
        .addSubcommand((sub) => sub.setName("claim").setDescription("Claim your all-quests-complete bonus")),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const subcommand = interaction.options.getSubcommand(true);
            if (subcommand === "view") {
                await handleView(interaction, locale);
            }
            else {
                await handleClaim(interaction, locale);
            }
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
async function handleView(interaction, locale) {
    const userId = interaction.user.id;
    const doc = await quest_service_1.default.getOrCreateToday(userId);
    const tier = await premium_service_1.default.getTier(userId);
    const date = (0, quest_config_1.getTodayDateKey)();
    const lines = doc.quests.map((q) => {
        const template = (0, quest_config_1.getQuestTemplate)(q.questId);
        if (!template)
            return "";
        const name = (0, t_1.t)(locale, template.nameKey);
        const reward = (0, quest_config_1.getQuestCoinReward)(template.difficulty, tier);
        if (q.completed) {
            return (0, t_1.t)(locale, "quest.view.complete", {
                name,
                progress: String(q.progress),
                target: String(q.target),
                reward: String(reward),
            });
        }
        return (0, t_1.t)(locale, "quest.view.incomplete", {
            name,
            progress: String(q.progress),
            target: String(q.target),
            reward: String(reward),
        });
    });
    const completedCount = doc.quests.filter((q) => q.completed).length;
    const streakLine = doc.questStreak > 0
        ? (0, t_1.t)(locale, "quest.view.streak", { days: String(doc.questStreak) })
        : (0, t_1.t)(locale, "quest.view.no_streak");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "quest.view.title", { date }))
        .setDescription(lines.join("\n") +
        `\n\n${(0, t_1.t)(locale, "quest.view.progress", { done: String(completedCount) })} | ${streakLine}`)
        .setColor(completedCount === 3 ? 0x57f287 : 0xf39c12)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
async function handleClaim(interaction, locale) {
    const userId = interaction.user.id;
    const result = await quest_service_1.default.claim(userId);
    if (result.notComplete) {
        await interaction.editReply((0, t_1.t)(locale, "quest.claim.not_complete", { done: String(result.completedCount ?? 0) }));
        return;
    }
    if (result.alreadyClaimed) {
        await interaction.editReply((0, t_1.t)(locale, "quest.claim.already"));
        return;
    }
    let description = (0, t_1.t)(locale, "quest.claim.success", { stars: String(result.starReward) });
    if (result.streakBonus) {
        description +=
            "\n" +
                (0, t_1.t)(locale, "quest.claim.streak_bonus", {
                    bonus: String(result.streakBonus),
                    days: String(result.streakDays),
                });
    }
    const embed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(0x57f287).setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
