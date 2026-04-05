import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { PrayResult } from "../../services/economy/pray.service";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

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
        .setDescriptionLocalizations({ vi: "Cầu nguyện để nhận coin" })
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Pray for another user")
                .setDescriptionLocalizations({ vi: "Cầu nguyện cho người khác" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
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
            await Reply.embedEdit(interaction, embed);
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
