import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import PrayService, { PrayResult } from "../../services/economy/pray.service";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import { tryStarDrop } from "../../util/economy/starDrop";
import QuestService from "../../services/quest/quest.service";
import EconomyAdminService from "../../services/economy/economyAdmin.service";

function fallbackLocale(): SupportedLocale {
    return "en";
}

const PRAY_TEXT_COUNT = 5;

function formatPrayEmbed(
    interaction: ChatInputCommandInteraction,
    result: PrayResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();

    const flavorText = t(locale, "pray.texts." + Math.floor(Math.random() * PRAY_TEXT_COUNT));
    let description = t(locale, "pray.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";

    description += t(locale, "pray.reward_coin", { coin: result.userReward.coin });
    if (result.userReward.gem > 0) {
        description += t(locale, "pray.reward_gem", { gem: result.userReward.gem });
    }
    description += "\n";

    if (result.targetReward && result.targetId) {
        description +=
            t(locale, "pray.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }

    if (result.streakInfo.streak > 1) {
        description += "\n" + t(locale, "pray.streak", { streak: result.streakInfo.streak });
    }

    if (result.streakInfo.milestoneHit) {
        const m = result.streakInfo.milestoneHit;
        description += "\n" + t(locale, "pray.milestone", { days: m.days, bonusCoin: m.bonusCoin });
        if (m.bonusGem > 0) {
            description += t(locale, "pray.milestone_gem", { bonusGem: m.bonusGem });
        }
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("pray")
        .setDescription("Pray to receive coin")
        .setDescriptionLocalizations(descriptionLocales("cmd.pray.desc"))
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Pray for another user")
                .setDescriptionLocalizations(descriptionLocales("cmd.pray.target.desc"))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);

            if (await EconomyAdminService.isFrozen(interaction.user.id, interaction.guildId!)) {
                await interaction.editReply(t(locale, "common.frozen"));
                return;
            }

            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply(t(locale, "pray.bot_error"));
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(t(locale, "pray.self_error"));
                return;
            }

            const result = await PrayService.pray(userId, guildId, targetUser?.id);
            const embed = formatPrayEmbed(interaction, result, locale);
            const gotStar = await tryStarDrop(userId, 0.05, "pray");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + t(locale, "star_drop.found"));
            }
            await Reply.embedEdit(interaction, embed);
            const questTrigger = targetUser ? "pray_target" : "pray";
            await QuestService.trackProgress(userId, guildId, questTrigger).catch(() => {});
        } catch (error) {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            if (error instanceof Error && error.message === "PRAY_COOLDOWN") {
                await interaction.editReply(t(locale, "pray.cooldown"));
                return;
            }
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
