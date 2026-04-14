import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import QuestService from "../../services/quest/quest.service";
import WalletService, { DailyClaimResult, getMilestoneCount } from "../../services/economy/wallet.service";
import GlobalShopService from "../../services/economy/globalShop.service";
import TransactionModel from "../../models/transaction.model";
import UserEconomyModel from "../../models/userEconomy.model";

const GLOBAL_GUILD_ID = "global";
const HISTORY_PAGE_SIZE = 10;

export default {
    data: new SlashCommandBuilder()
        .setName("wallet")
        .setDescription("View your global wallet and claim daily star")
        .setDescriptionLocalizations(descriptionLocales("cmd.wallet.desc"))
        .addSubcommand((sub) => sub.setName("view").setDescription("View your global wallet balance"))
        .addSubcommand((sub) =>
            sub
                .setName("daily")
                .setDescription("Claim your daily star reward")
                .setDescriptionLocalizations(descriptionLocales("cmd.wallet.daily.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("history")
                .setDescription("View your global transaction history")
                .setDescriptionLocalizations(descriptionLocales("cmd.wallet.history.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("page")
                        .setDescription("Page number")
                        .setDescriptionLocalizations(descriptionLocales("cmd.wallet.history.page.desc"))
                        .setMinValue(1)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case "view":
                return handleView(interaction);
            case "daily":
                return handleDaily(interaction);
            case "history":
                return handleHistory(interaction);
        }
    },
};

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const balance = await WalletService.getBalance(userId);
        const invSummary = await GlobalShopService.getInventorySummary(userId);

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(t(locale, "wallet.title", { username: interaction.user.username }))
            .addFields(
                {
                    name: t(locale, "wallet.star"),
                    value: `**${balance.star.toLocaleString()}**`,
                    inline: true,
                },
                {
                    name: t(locale, "wallet.daily_streak"),
                    value: t(locale, "wallet.daily_streak_value", { count: balance.dailyStreak }),
                    inline: true,
                },
                {
                    name: t(locale, "wallet.milestones_claimed"),
                    value: t(locale, "wallet.milestones_value", {
                        count: balance.claimedMilestones.length,
                        total: getMilestoneCount(),
                    }),
                    inline: true,
                },
                {
                    name: t(locale, "wallet.inventory_overview"),
                    value: t(locale, "wallet.inventory_overview_value", {
                        items: String(invSummary.distinctItems),
                        quantity: String(invSummary.totalQuantity),
                    }),
                    inline: true,
                },
                {
                    name: t(locale, "wallet.spend_hint"),
                    value: t(locale, "wallet.spend_hint_value"),
                    inline: false,
                }
            )
            .setTimestamp();

        if (balance.lastDaily) {
            embed.addFields({
                name: t(locale, "wallet.last_daily"),
                value: `<t:${Math.floor(balance.lastDaily.getTime() / 1000)}:R>`,
                inline: true,
            });
        }

        await Reply.embedEdit(interaction, embed);
        await QuestService.trackProgress(userId, interaction.guildId!, "wallet_view").catch(() => {});
    } catch {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        await interaction.editReply(t(locale, "common.error"));
    }
}

async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const result = await WalletService.claimDaily(userId);

        // Check multi-server milestones
        const mutualGuildIds = await UserEconomyModel.distinct("guildId", { userId });
        const serverCount = mutualGuildIds.length;
        const serverMilestones = [3, 5, 10] as const;
        for (const threshold of serverMilestones) {
            if (serverCount >= threshold) {
                await WalletService.checkAndAwardMilestone(userId, `multi_server_${threshold}`);
            }
        }

        const embed = formatDailyEmbed(interaction, result, locale);
        await Reply.embedEdit(interaction, embed);
        await QuestService.trackProgress(userId, interaction.guildId!, "wallet_daily").catch(() => {});
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        if (error instanceof Error && error.message === "DAILY_COOLDOWN") {
            await interaction.editReply(t(locale, "wallet.daily.cooldown"));
            return;
        }
        await interaction.editReply(t(locale, "common.error"));
    }
}

function formatDailyEmbed(
    interaction: ChatInputCommandInteraction,
    result: DailyClaimResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();
    let description = t(locale, "wallet.daily.success", { username: interaction.user.username }) + "\n\n";
    description += t(locale, "wallet.daily.reward", { star: String(result.baseReward) }) + "\n";

    if (result.streak > 1) {
        description += "\n" + t(locale, "wallet.daily.streak", { streak: String(result.streak) });
    }

    if (result.premiumBonus > 0) {
        description += "\n" + t(locale, "wallet.daily.premium_bonus", { amount: String(result.premiumBonus) });
    }

    if (result.milestoneHit) {
        description +=
            "\n" +
            t(locale, "wallet.daily.milestone", {
                days: String(result.milestoneHit.days),
                bonus: String(result.milestoneHit.bonus),
            });
    }

    embed.setDescription(description);
    return embed;
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const page = interaction.options.getInteger("page") ?? 1;

        const totalCount = await TransactionModel.countDocuments({
            userId,
            guildId: GLOBAL_GUILD_ID,
        });
        const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
        const safePage = Math.min(page, totalPages);

        const transactions = await TransactionModel.find({
            userId,
            guildId: GLOBAL_GUILD_ID,
        })
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * HISTORY_PAGE_SIZE)
            .limit(HISTORY_PAGE_SIZE)
            .lean();

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(t(locale, "wallet.history.title", { username: interaction.user.username }))
            .setTimestamp();

        if (transactions.length === 0) {
            embed.setDescription(t(locale, "wallet.history.empty"));
        } else {
            const lines = transactions.map((tx) => {
                const sign = tx.coinDelta >= 0 ? "+" : "";
                const time = `<t:${Math.floor(tx.createdAt.getTime() / 1000)}:R>`;
                return `${time} \`${tx.type}\` ${sign}**${tx.coinDelta}** star`;
            });
            embed.setDescription(lines.join("\n"));
        }

        embed.setFooter({
            text: t(locale, "wallet.history.page", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });

        await Reply.embedEdit(interaction, embed);
    } catch {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        await interaction.editReply(t(locale, "common.error"));
    }
}
