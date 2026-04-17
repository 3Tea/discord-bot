"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const wallet_service_1 = __importStar(require("../../services/economy/wallet.service"));
const globalShop_service_1 = __importDefault(require("../../services/economy/globalShop.service"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const GLOBAL_GUILD_ID = "global";
const HISTORY_PAGE_SIZE = 10;
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("wallet")
        .setDescription("View your global wallet and claim daily star")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.wallet.desc"))
        .addSubcommand((sub) => sub.setName("view").setDescription("View your global wallet balance"))
        .addSubcommand((sub) => sub
        .setName("daily")
        .setDescription("Claim your daily star reward")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.wallet.daily.desc")))
        .addSubcommand((sub) => sub
        .setName("history")
        .setDescription("View your global transaction history")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.wallet.history.desc"))
        .addIntegerOption((opt) => opt
        .setName("page")
        .setDescription("Page number")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.wallet.history.page.desc"))
        .setMinValue(1))),
    async execute(interaction) {
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
async function handleView(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const userId = interaction.user.id;
        const balance = await wallet_service_1.default.getBalance(userId);
        const invSummary = await globalShop_service_1.default.getInventorySummary(userId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xffd700)
            .setTitle((0, t_1.t)(locale, "wallet.title", { username: interaction.user.username }))
            .addFields({
            name: (0, t_1.t)(locale, "wallet.star"),
            value: `**${balance.star.toLocaleString()}**`,
            inline: true,
        }, {
            name: (0, t_1.t)(locale, "wallet.daily_streak"),
            value: (0, t_1.t)(locale, "wallet.daily_streak_value", { total: balance.dailyStreak }),
            inline: true,
        }, {
            name: (0, t_1.t)(locale, "wallet.milestones_claimed"),
            value: (0, t_1.t)(locale, "wallet.milestones_value", {
                claimed: balance.claimedMilestones.length,
                total: (0, wallet_service_1.getMilestoneCount)(),
            }),
            inline: true,
        }, {
            name: (0, t_1.t)(locale, "wallet.inventory_overview"),
            value: (0, t_1.t)(locale, "wallet.inventory_overview_value", {
                items: String(invSummary.distinctItems),
                quantity: String(invSummary.totalQuantity),
            }),
            inline: true,
        }, {
            name: (0, t_1.t)(locale, "wallet.spend_hint"),
            value: (0, t_1.t)(locale, "wallet.spend_hint_value"),
            inline: false,
        })
            .setTimestamp();
        if (balance.lastDaily) {
            embed.addFields({
                name: (0, t_1.t)(locale, "wallet.last_daily"),
                value: `<t:${Math.floor(balance.lastDaily.getTime() / 1000)}:R>`,
                inline: true,
            });
        }
        await reply_1.default.embedEdit(interaction, embed);
        if (interaction.guildId) {
            await quest_service_1.default.trackProgress(userId, interaction.guildId, "wallet_view").catch(() => { });
        }
    }
    catch {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
async function handleDaily(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const userId = interaction.user.id;
        const result = await wallet_service_1.default.claimDaily(userId);
        // Check multi-server milestones
        const mutualGuildIds = await userEconomy_model_1.default.distinct("guildId", { userId });
        const serverCount = mutualGuildIds.length;
        const serverMilestones = [3, 5, 10];
        for (const threshold of serverMilestones) {
            if (serverCount >= threshold) {
                await wallet_service_1.default.checkAndAwardMilestone(userId, `multi_server_${threshold}`);
            }
        }
        const embed = formatDailyEmbed(interaction, result, locale);
        await reply_1.default.embedEdit(interaction, embed);
        if (interaction.guildId) {
            await quest_service_1.default.trackProgress(userId, interaction.guildId, "wallet_daily").catch(() => { });
        }
    }
    catch (error) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (error instanceof Error && error.message === "DAILY_COOLDOWN") {
            await interaction.editReply((0, t_1.t)(locale, "wallet.daily.cooldown"));
            return;
        }
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
function formatDailyEmbed(interaction, result, locale) {
    const embed = new discord_js_1.EmbedBuilder().setColor(0xffd700).setTimestamp();
    let description = (0, t_1.t)(locale, "wallet.daily.success", { username: interaction.user.username }) + "\n\n";
    description += (0, t_1.t)(locale, "wallet.daily.reward", { star: String(result.baseReward) }) + "\n";
    if (result.streak > 1) {
        description += "\n" + (0, t_1.t)(locale, "wallet.daily.streak", { streak: String(result.streak) });
    }
    if (result.premiumBonus > 0) {
        description += "\n" + (0, t_1.t)(locale, "wallet.daily.premium_bonus", { amount: String(result.premiumBonus) });
    }
    if (result.milestoneHit) {
        description +=
            "\n" +
                (0, t_1.t)(locale, "wallet.daily.milestone", {
                    days: String(result.milestoneHit.days),
                    bonus: String(result.milestoneHit.bonus),
                });
    }
    embed.setDescription(description);
    return embed;
}
async function handleHistory(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const userId = interaction.user.id;
        const page = interaction.options.getInteger("page") ?? 1;
        const totalCount = await transaction_model_1.default.countDocuments({
            userId,
            guildId: GLOBAL_GUILD_ID,
        });
        const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
        const safePage = Math.min(page, totalPages);
        const transactions = await transaction_model_1.default.find({
            userId,
            guildId: GLOBAL_GUILD_ID,
        })
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * HISTORY_PAGE_SIZE)
            .limit(HISTORY_PAGE_SIZE)
            .lean();
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xffd700)
            .setTitle((0, t_1.t)(locale, "wallet.history.title", { username: interaction.user.username }))
            .setTimestamp();
        if (transactions.length === 0) {
            embed.setDescription((0, t_1.t)(locale, "wallet.history.empty"));
        }
        else {
            const lines = transactions.map((tx) => {
                const sign = tx.coinDelta >= 0 ? "+" : "";
                const time = `<t:${Math.floor(tx.createdAt.getTime() / 1000)}:R>`;
                return `${time} \`${tx.type}\` ${sign}**${tx.coinDelta}** star`;
            });
            embed.setDescription(lines.join("\n"));
        }
        embed.setFooter({
            text: (0, t_1.t)(locale, "wallet.history.page", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });
        await reply_1.default.embedEdit(interaction, embed);
    }
    catch {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
