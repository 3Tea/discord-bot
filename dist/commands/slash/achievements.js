"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const achievement_service_1 = require("../../services/achievement/achievement.service");
const achievement_config_1 = require("../../services/achievement/achievement.config");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("achievements")
        .setDescription("View your achievement progress and unlocked rewards")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.achievements.desc")),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const result = await (0, achievement_service_1.checkAndUnlock)(userId, guildId);
            const byCategory = (0, achievement_service_1.getByCategory)(result.all);
            const pages = buildPages(interaction, locale, result.all, byCategory, result.newUnlocks);
            if (pages.length === 0) {
                await interaction.editReply({
                    embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.error")).setColor(0xed4245)],
                });
                return;
            }
            let pageIndex = 0;
            const buildRow = (disabled = false) => new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId("ach_prev")
                .setLabel("◀")
                .setStyle(discord_js_1.ButtonStyle.Secondary)
                .setDisabled(disabled || pageIndex === 0), new discord_js_1.ButtonBuilder()
                .setCustomId("ach_next")
                .setLabel("▶")
                .setStyle(discord_js_1.ButtonStyle.Secondary)
                .setDisabled(disabled || pageIndex === pages.length - 1));
            const message = await interaction.editReply({ embeds: [pages[pageIndex]], components: [buildRow()] });
            while (true) {
                try {
                    const i = await message.awaitMessageComponent({
                        componentType: discord_js_1.ComponentType.Button,
                        time: 60_000,
                        filter: (btn) => btn.user.id === interaction.user.id,
                    });
                    await i.deferUpdate();
                    if (i.customId === "ach_next")
                        pageIndex = Math.min(pages.length - 1, pageIndex + 1);
                    else if (i.customId === "ach_prev")
                        pageIndex = Math.max(0, pageIndex - 1);
                    await i.editReply({ embeds: [pages[pageIndex]], components: [buildRow()] });
                }
                catch {
                    break;
                }
            }
            await interaction.editReply({ embeds: [pages[pageIndex]], components: [buildRow(true)] }).catch(() => { });
        }
        catch {
            await interaction
                .editReply({
                embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.error")).setColor(0xed4245)],
            })
                .catch(() => { });
        }
    },
};
function formatReward(def) {
    const parts = [];
    if (def.reward.coin)
        parts.push(`+${def.reward.coin.toLocaleString()} coin`);
    if (def.reward.gem)
        parts.push(`+${def.reward.gem} gem`);
    if (def.reward.star)
        parts.push(`+${def.reward.star} ⭐`);
    return parts.join(", ");
}
function buildProgressBar(current, target) {
    const filled = Math.min(10, Math.floor((current / target) * 10));
    return "█".repeat(filled) + "░".repeat(10 - filled);
}
function buildOverviewEmbed(interaction, locale, all, byCategory, newUnlocks) {
    const unlocked = all.filter((s) => s.unlocked).length;
    const total = all.length;
    const categoryLines = achievement_config_1.CATEGORY_ORDER.map((cat) => {
        const statuses = byCategory.get(cat) ?? [];
        const catUnlocked = statuses.filter((s) => s.unlocked).length;
        const catTotal = statuses.length;
        const emoji = achievement_config_1.CATEGORY_EMOJI[cat];
        const name = (0, t_1.t)(locale, `achievement.cat.${cat}`);
        return `${emoji} ${name}: ${catUnlocked}/${catTotal}`;
    });
    const totalCoin = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.coin ?? 0), 0);
    const totalGem = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.gem ?? 0), 0);
    const totalStar = all.filter((s) => s.unlocked).reduce((sum, s) => sum + (s.def.reward.star ?? 0), 0);
    const totalRewardsLine = (0, t_1.t)(locale, "achievement.total_rewards", {
        coin: totalCoin.toLocaleString(),
        gem: String(totalGem),
        star: String(totalStar),
    });
    let description = categoryLines.join("\n") + `\n\n${totalRewardsLine}`;
    if (newUnlocks.length > 0) {
        const unlockLines = newUnlocks.map((def) => `✅ ${(0, t_1.t)(locale, def.nameKey)} — ${formatReward(def)}`).join("\n");
        description = `🎉 ${(0, t_1.t)(locale, "achievement.new_unlocks")}\n${unlockLines}\n\n---\n${description}`;
    }
    return new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "achievement.title", {
        username: interaction.user.username,
        unlocked: String(unlocked),
        total: String(total),
    }))
        .setDescription(description)
        .setColor(0xf1c40f)
        .setTimestamp();
}
function buildCategoryEmbed(locale, category, statuses, newUnlocks, pageNumber, totalPages) {
    const emoji = achievement_config_1.CATEGORY_EMOJI[category] ?? "";
    const catName = (0, t_1.t)(locale, `achievement.cat.${category}`);
    const catUnlocked = statuses.filter((s) => s.unlocked).length;
    const catTotal = statuses.length;
    const lines = statuses.map((status) => {
        const name = (0, t_1.t)(locale, status.def.nameKey);
        const desc = (0, t_1.t)(locale, status.def.descKey);
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
            .map((def) => `✅ ${(0, t_1.t)(locale, def.nameKey)} — ${formatReward(def)}`)
            .join("\n");
        description = `🎉 ${(0, t_1.t)(locale, "achievement.new_unlocks")}\n${unlockLines}\n\n---\n${description}`;
    }
    return new discord_js_1.EmbedBuilder()
        .setTitle(`${emoji} ${catName} (${catUnlocked}/${catTotal})`)
        .setDescription(description)
        .setColor(0x5865f2)
        .setFooter({ text: `${pageNumber}/${totalPages}` })
        .setTimestamp();
}
function buildPages(interaction, locale, all, byCategory, newUnlocks) {
    const totalPages = 1 + achievement_config_1.CATEGORY_ORDER.length;
    const pages = [];
    pages.push(buildOverviewEmbed(interaction, locale, all, byCategory, newUnlocks));
    achievement_config_1.CATEGORY_ORDER.forEach((cat, idx) => {
        const statuses = byCategory.get(cat) ?? [];
        pages.push(buildCategoryEmbed(locale, cat, statuses, newUnlocks, idx + 2, totalPages));
    });
    return pages;
}
