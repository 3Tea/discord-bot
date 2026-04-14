import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import QuestService from "../../services/quest/quest.service";
import { getQuestCoinReward, getQuestTemplate, getTodayDateKey } from "../../services/quest/quest.config";
import PremiumService from "../../services/premium/premium.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

export default {
    data: new SlashCommandBuilder()
        .setName("quest")
        .setDescription("Daily quests — complete tasks for coin and star rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.quest.desc"))
        .addSubcommand((sub) =>
            sub.setName("view").setDescription("View today's quests and progress")
        )
        .addSubcommand((sub) =>
            sub.setName("claim").setDescription("Claim your all-quests-complete bonus")
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommand === "view") {
                await handleView(interaction, locale);
            } else {
                await handleClaim(interaction, locale);
            }
        } catch {
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};

async function handleView(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const userId = interaction.user.id;
    const doc = await QuestService.getOrCreateToday(userId);
    const tier = await PremiumService.getTier(userId);
    const date = getTodayDateKey();

    const lines = doc.quests.map((q) => {
        const template = getQuestTemplate(q.questId);
        if (!template) return "";
        const name = t(locale, template.nameKey);
        const reward = getQuestCoinReward(template.difficulty, tier);
        if (q.completed) {
            return t(locale, "quest.view.complete", {
                name,
                progress: String(q.progress),
                target: String(q.target),
                reward: String(reward),
            });
        }
        return t(locale, "quest.view.incomplete", {
            name,
            progress: String(q.progress),
            target: String(q.target),
            reward: String(reward),
        });
    });

    const completedCount = doc.quests.filter((q) => q.completed).length;
    const streakLine = doc.questStreak > 0
        ? t(locale, "quest.view.streak", { days: String(doc.questStreak) })
        : t(locale, "quest.view.no_streak");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "quest.view.title", { date }))
        .setDescription(lines.join("\n") + `\n\n${t(locale, "quest.view.progress", { done: String(completedCount) })} | ${streakLine}`)
        .setColor(completedCount === 3 ? 0x57f287 : 0xf39c12)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

async function handleClaim(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const userId = interaction.user.id;
    const result = await QuestService.claim(userId);

    if (result.notComplete) {
        await interaction.editReply(
            t(locale, "quest.claim.not_complete", { done: String(result.completedCount ?? 0) })
        );
        return;
    }

    if (result.alreadyClaimed) {
        await interaction.editReply(t(locale, "quest.claim.already"));
        return;
    }

    let description = t(locale, "quest.claim.success", { stars: String(result.starReward) });
    if (result.streakBonus) {
        description += "\n" + t(locale, "quest.claim.streak_bonus", {
            bonus: String(result.streakBonus),
            days: String(result.streakDays),
        });
    }

    const embed = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x57f287)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}
