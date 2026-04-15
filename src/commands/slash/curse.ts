import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import PrayService, { CurseResult } from "../../services/economy/pray.service";
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

const CURSE_TEXT_COUNT = 5;

function formatCurseEmbed(
    interaction: ChatInputCommandInteraction,
    result: CurseResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0x800080).setTimestamp();

    const flavorText = t(locale, "curse.texts." + Math.floor(Math.random() * CURSE_TEXT_COUNT));
    let description = t(locale, "curse.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";

    description += t(locale, "curse.reward_coin", { coin: result.userReward.coin }) + "\n";

    if (result.targetReward && result.targetId) {
        description +=
            t(locale, "curse.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("curse")
        .setDescription("Curse to receive coin (less than pray)")
        .setDescriptionLocalizations(descriptionLocales("cmd.curse.desc"))
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Curse someone")
                .setDescriptionLocalizations(descriptionLocales("cmd.curse.target.desc"))
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
                await interaction.editReply(t(locale, "curse.bot_error"));
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(t(locale, "curse.self_error"));
                return;
            }

            const result = await PrayService.curse(userId, guildId, targetUser?.id);
            const embed = formatCurseEmbed(interaction, result, locale);
            const gotStar = await tryStarDrop(userId, 0.05, "curse");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + t(locale, "star_drop.found"));
            }
            await Reply.embedEdit(interaction, embed);
            const questTrigger = targetUser ? "curse_target" : "curse";
            await QuestService.trackProgress(userId, guildId, questTrigger).catch(() => {});
        } catch (error) {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            if (error instanceof Error && error.message === "CURSE_COOLDOWN") {
                await interaction.editReply(t(locale, "curse.cooldown"));
                return;
            }
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
