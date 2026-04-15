import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import { checkAndUnlock, getByCategory } from "../../services/achievement/achievement.service";
import type { AchievementStatus } from "../../services/achievement/achievement.service";
import { CATEGORY_EMOJI, CATEGORY_ORDER } from "../../services/achievement/achievement.config";
import type { AchievementDef } from "../../services/achievement/achievement.config";

export default {
    data: new SlashCommandBuilder()
        .setName("achievements")
        .setDescription("View your achievement progress and unlocked rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.achievements.desc")),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guildId!;
            const result = await checkAndUnlock(userId, guildId);

            const byCategory = getByCategory(result.all);
            const pages = buildPages(interaction, locale, result.all, byCategory, result.newUnlocks);

            if (pages.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription(t(locale, "common.error")).setColor(0xed4245)],
                });
                return;
            }

            let pageIndex = 0;

            const buildRow = (disabled = false): ActionRowBuilder<ButtonBuilder> =>
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ach_prev")
                        .setLabel("◀")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId("ach_next")
                        .setLabel("▶")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || pageIndex === pages.length - 1)
                );

            const message = await interaction.editReply({ embeds: [pages[pageIndex]], components: [buildRow()] });

            while (true) {
                try {
                    const i = await message.awaitMessageComponent({
                        componentType: ComponentType.Button,
                        time: 60_000,
                        filter: (btn) => btn.user.id === interaction.user.id,
                    });
                    await i.deferUpdate();

                    if (i.customId === "ach_next") pageIndex = Math.min(pages.length - 1, pageIndex + 1);
                    else if (i.customId === "ach_prev") pageIndex = Math.max(0, pageIndex - 1);

                    await i.editReply({ embeds: [pages[pageIndex]], components: [buildRow()] });
                } catch {
                    break;
                }
            }

            await interaction.editReply({ embeds: [pages[pageIndex]], components: [buildRow(true)] }).catch(() => {});
        } catch {
            await interaction
                .editReply({
                    embeds: [new EmbedBuilder().setDescription(t(locale, "common.error")).setColor(0xed4245)],
                })
                .catch(() => {});
        }
    },
};

function formatReward(def: AchievementDef): string {
    const parts: string[] = [];
    if (def.reward.coin) parts.push(`+${def.reward.coin.toLocaleString()} coin`);
    if (def.reward.gem) parts.push(`+${def.reward.gem} gem`);
    if (def.reward.star) parts.push(`+${def.reward.star} ⭐`);
    return parts.join(", ");
}

function buildProgressBar(current: number, target: number): string {
    const filled = Math.min(10, Math.floor((current / target) * 10));
    return "█".repeat(filled) + "░".repeat(10 - filled);
}

function buildOverviewEmbed(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    all: AchievementStatus[],
    byCategory: Map<string, AchievementStatus[]>,
    newUnlocks: AchievementDef[]
): EmbedBuilder {
    const unlocked = all.filter((s) => s.unlocked).length;
    const total = all.length;

    const categoryLines = CATEGORY_ORDER.map((cat) => {
        const statuses = byCategory.get(cat) ?? [];
        const catUnlocked = statuses.filter((s) => s.unlocked).length;
        const catTotal = statuses.length;
        const emoji = CATEGORY_EMOJI[cat];
        const name = t(locale, `achievement.cat.${cat}`);
        return `${emoji} ${name}: ${catUnlocked}/${catTotal}`;
    });

    const totalCoin = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.coin ?? 0), 0);
    const totalGem = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.gem ?? 0), 0);
    const totalStar = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.star ?? 0), 0);

    const totalRewardsLine = t(locale, "achievement.total_rewards", {
        coin: totalCoin.toLocaleString(),
        gem: String(totalGem),
        star: String(totalStar),
    });

    let description = categoryLines.join("\n") + `\n\n${totalRewardsLine}`;

    if (newUnlocks.length > 0) {
        const unlockLines = newUnlocks.map((def) => `✅ ${t(locale, def.nameKey)} — ${formatReward(def)}`).join("\n");
        description = `🎉 ${t(locale, "achievement.new_unlocks")}\n${unlockLines}\n\n---\n${description}`;
    }

    return new EmbedBuilder()
        .setTitle(
            t(locale, "achievement.title", {
                username: interaction.user.username,
                unlocked: String(unlocked),
                total: String(total),
            })
        )
        .setDescription(description)
        .setColor(0xf1c40f)
        .setTimestamp();
}

function buildCategoryEmbed(
    locale: SupportedLocale,
    category: string,
    statuses: AchievementStatus[],
    newUnlocks: AchievementDef[],
    pageNumber: number,
    totalPages: number
): EmbedBuilder {
    const emoji = CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI] ?? "";
    const catName = t(locale, `achievement.cat.${category}`);
    const catUnlocked = statuses.filter((s) => s.unlocked).length;
    const catTotal = statuses.length;

    const lines = statuses.map((status) => {
        const name = t(locale, status.def.nameKey);
        const desc = t(locale, status.def.descKey);
        const reward = formatReward(status.def);

        if (status.unlocked) {
            return `✅ **${name}** — ${desc} (${reward})`;
        }

        if (status.progress) {
            const bar = buildProgressBar(status.progress.current, status.progress.target);
            return `⬜ **${name}** — ${desc} ${bar} ${status.progress.current}/${status.progress.target} (${reward})`;
        }

        return `⬜ **${name}** — ${desc} (${reward})`;
    });

    let description = lines.join("\n");

    const newInCategory = newUnlocks.filter((def) => def.category === category);
    if (newInCategory.length > 0) {
        const unlockLines = newInCategory
            .map((def) => `✅ ${t(locale, def.nameKey)} — ${formatReward(def)}`)
            .join("\n");
        description = `🎉 ${t(locale, "achievement.new_unlocks")}\n${unlockLines}\n\n---\n${description}`;
    }

    return new EmbedBuilder()
        .setTitle(`${emoji} ${catName} (${catUnlocked}/${catTotal})`)
        .setDescription(description)
        .setColor(0x5865f2)
        .setFooter({ text: `${pageNumber}/${totalPages}` })
        .setTimestamp();
}

function buildPages(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    all: AchievementStatus[],
    byCategory: Map<string, AchievementStatus[]>,
    newUnlocks: AchievementDef[]
): EmbedBuilder[] {
    const totalPages = 1 + CATEGORY_ORDER.length;
    const pages: EmbedBuilder[] = [];

    pages.push(buildOverviewEmbed(interaction, locale, all, byCategory, newUnlocks));

    CATEGORY_ORDER.forEach((cat, idx) => {
        const statuses = byCategory.get(cat) ?? [];
        pages.push(buildCategoryEmbed(locale, cat, statuses, newUnlocks, idx + 2, totalPages));
    });

    return pages;
}
