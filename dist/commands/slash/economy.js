"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const economyBulk_service_1 = __importDefault(require("../../services/economy/economyBulk.service"));
const economyLog_service_1 = __importDefault(require("../../services/economy/economyLog.service"));
const economySnapshot_model_1 = __importDefault(require("../../models/economySnapshot.model"));
const economyLogConfig_model_1 = __importDefault(require("../../models/economyLogConfig.model"));
const guildEconomyRewardConfig_model_1 = __importDefault(require("../../models/guildEconomyRewardConfig.model"));
const guildGamblingConfig_model_1 = __importDefault(require("../../models/guildGamblingConfig.model"));
const guildWorkConfig_model_1 = __importDefault(require("../../models/guildWorkConfig.model"));
const guildSocialConfig_model_1 = __importDefault(require("../../models/guildSocialConfig.model"));
const activityReward_1 = require("../../util/economy/activityReward");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
function fallbackLocale() {
    return "en";
}
async function handleBalance(interaction, subcommand, locale, guildId) {
    switch (subcommand) {
        case "set-coin": {
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            const updated = await currency_service_1.default.setCoin(target.id, guildId, amount);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.set_coin", { userId: target.id, amount: updated.coin.toLocaleString() }))
                .setColor(0x5865f2);
        }
        case "add-coin": {
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            const updated = await currency_service_1.default.addCoin(target.id, guildId, amount, "admin", {
                action: "add-coin",
            });
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.add_coin", {
                userId: target.id,
                amount: amount.toLocaleString(),
                total: updated.coin.toLocaleString(),
            }))
                .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
        }
        case "set-gem": {
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            const updated = await currency_service_1.default.setGem(target.id, guildId, amount);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.set_gem", { userId: target.id, amount: updated.gem.toLocaleString() }))
                .setColor(0x5865f2);
        }
        case "add-gem": {
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            const updated = await currency_service_1.default.addGem(target.id, guildId, amount, "admin", {
                action: "add-gem",
            });
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.add_gem", {
                userId: target.id,
                amount: amount.toLocaleString(),
                total: updated.gem.toLocaleString(),
            }))
                .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
        }
        default:
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.unknown_subcommand")).setColor(0xed4245);
    }
}
async function handleConfig(interaction, subcommand, locale, guildId) {
    switch (subcommand) {
        case "reward-view": {
            const config = await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            const milestones = config.gemMilestones instanceof Map
                ? config.gemMilestones
                : new Map(Object.entries(config.gemMilestones ?? {}));
            const milestoneStr = [...milestones.entries()]
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([lvl, gems]) => `Lv.${lvl} → ${gems} 💎`)
                .join("\n") || "None";
            return new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "economy.reward_config.title"))
                .addFields({
                name: (0, t_1.t)(locale, "economy.reward_config.enabled"),
                value: config.enabled ? "✅" : "❌",
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "economy.reward_config.level_base"),
                value: String(config.levelUpCoinBase),
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "economy.reward_config.level_per"),
                value: String(config.levelUpCoinPerLevel),
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "economy.reward_config.voice_interval"),
                value: `${config.voiceCoinInterval} min`,
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "economy.reward_config.voice_reward"),
                value: String(config.voiceCoinReward),
                inline: true,
            }, { name: (0, t_1.t)(locale, "economy.reward_config.gem_milestones"), value: milestoneStr })
                .setColor(0x5865f2);
        }
        case "reward-toggle": {
            const config = await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            const newEnabled = !config.enabled;
            await guildEconomyRewardConfig_model_1.default.updateOne({ guildId }, { $set: { enabled: newEnabled } });
            await (0, activityReward_1.invalidateRewardConfigCache)(guildId);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, newEnabled ? "economy.reward_config.toggled_on" : "economy.reward_config.toggled_off"))
                .setColor(newEnabled ? 0x57f287 : 0xed4245);
        }
        case "reward-set": {
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);
            await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { [setting]: value }, $setOnInsert: { guildId } }, { upsert: true });
            await (0, activityReward_1.invalidateRewardConfigCache)(guildId);
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "economy.reward_config.updated")).setColor(0x57f287);
        }
        case "reward-milestone": {
            const level = interaction.options.getInteger("level", true);
            const gems = interaction.options.getInteger("gems", true);
            if (gems > 0) {
                await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { [`gemMilestones.${level}`]: gems }, $setOnInsert: { guildId } }, { upsert: true });
                await (0, activityReward_1.invalidateRewardConfigCache)(guildId);
                return new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.reward_config.milestone_set", {
                    level: String(level),
                    gems: String(gems),
                }))
                    .setColor(0x57f287);
            }
            else {
                await guildEconomyRewardConfig_model_1.default.findOneAndUpdate({ guildId }, { $unset: { [`gemMilestones.${level}`]: "" }, $setOnInsert: { guildId } }, { upsert: true });
                await (0, activityReward_1.invalidateRewardConfigCache)(guildId);
                return new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.reward_config.milestone_removed", { level: String(level) }))
                    .setColor(0xed4245);
            }
        }
        case "gambling-view": {
            const config = await guildGamblingConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            return new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "gambling_config.title"))
                .addFields({
                name: (0, t_1.t)(locale, "gambling_config.enabled"),
                value: config.enabled ? "✅" : "❌",
                inline: true,
            }, { name: (0, t_1.t)(locale, "gambling_config.min_bet"), value: String(config.minBet), inline: true }, { name: (0, t_1.t)(locale, "gambling_config.max_bet"), value: String(config.maxBet), inline: true })
                .setColor(0x5865f2);
        }
        case "gambling-toggle": {
            const config = await guildGamblingConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            const newEnabled = !config.enabled;
            await guildGamblingConfig_model_1.default.updateOne({ guildId }, { $set: { enabled: newEnabled } });
            await redis_1.default.deleteKey(`gambling_config:${guildId}`);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, newEnabled ? "gambling_config.toggled_on" : "gambling_config.toggled_off"))
                .setColor(newEnabled ? 0x57f287 : 0xed4245);
        }
        case "gambling-set": {
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);
            await guildGamblingConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { [setting]: value }, $setOnInsert: { guildId } }, { upsert: true });
            await redis_1.default.deleteKey(`gambling_config:${guildId}`);
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gambling_config.updated")).setColor(0x57f287);
        }
        case "work-view": {
            const wConfig = await guildWorkConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            return new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "work_config.title"))
                .addFields({
                name: (0, t_1.t)(locale, "work_config.enabled"),
                value: wConfig.enabled ? "✅" : "❌",
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "work_config.work_min"),
                value: String(wConfig.workMinReward),
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "work_config.work_max"),
                value: String(wConfig.workMaxReward),
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "work_config.fish_multiplier"),
                value: `×${wConfig.fishRewardMultiplier}`,
                inline: true,
            })
                .setColor(0x5865f2);
        }
        case "work-toggle": {
            const wConfig = await guildWorkConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            const newEnabled = !wConfig.enabled;
            await guildWorkConfig_model_1.default.updateOne({ guildId }, { $set: { enabled: newEnabled } });
            await redis_1.default.deleteKey(`work_config:${guildId}`);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, newEnabled ? "work_config.toggled_on" : "work_config.toggled_off"))
                .setColor(newEnabled ? 0x57f287 : 0xed4245);
        }
        case "work-set": {
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);
            await guildWorkConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { [setting]: value }, $setOnInsert: { guildId } }, { upsert: true });
            await redis_1.default.deleteKey(`work_config:${guildId}`);
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "work_config.updated")).setColor(0x57f287);
        }
        case "social-view": {
            const sConfig = await guildSocialConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            return new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "social_config.title"))
                .addFields({
                name: (0, t_1.t)(locale, "social_config.enabled"),
                value: sConfig.enabled ? "✅" : "❌",
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "social_config.gift_max"),
                value: String(sConfig.giftMaxAmount),
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "social_config.rob_success_rate"),
                value: `${Math.round(sConfig.robSuccessRate * 100)}%`,
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "social_config.rob_steal_range"),
                value: `${sConfig.robStealMinPct}-${sConfig.robStealMaxPct}%`,
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "social_config.rob_penalty_range"),
                value: `${sConfig.robPenaltyMinPct}-${sConfig.robPenaltyMaxPct}%`,
                inline: true,
            }, {
                name: (0, t_1.t)(locale, "social_config.rob_min_balance"),
                value: String(sConfig.robMinBalance),
                inline: true,
            })
                .setColor(0x5865f2);
        }
        case "social-toggle": {
            const sConfig = await guildSocialConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
            const newEnabled = !sConfig.enabled;
            await guildSocialConfig_model_1.default.updateOne({ guildId }, { $set: { enabled: newEnabled } });
            await redis_1.default.deleteKey(`social_config:${guildId}`);
            return new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, newEnabled ? "social_config.toggled_on" : "social_config.toggled_off"))
                .setColor(newEnabled ? 0x57f287 : 0xed4245);
        }
        case "social-set": {
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);
            await guildSocialConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { [setting]: value }, $setOnInsert: { guildId } }, { upsert: true });
            await redis_1.default.deleteKey(`social_config:${guildId}`);
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "social_config.updated")).setColor(0x57f287);
        }
        default:
            return new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.unknown_subcommand")).setColor(0xed4245);
    }
}
async function handleAdmin(interaction, subcommand, locale, guildId) {
    switch (subcommand) {
        case "dashboard": {
            const [circulation, flow, sources, sinks, wealth, weekComp, anomalies] = await Promise.all([
                economyAdmin_service_1.default.getCirculation(guildId),
                economyAdmin_service_1.default.getFlow24h(guildId),
                economyAdmin_service_1.default.getSourceBreakdown(guildId, "earn"),
                economyAdmin_service_1.default.getSourceBreakdown(guildId, "sink"),
                economyAdmin_service_1.default.getWealthDistribution(guildId),
                economyAdmin_service_1.default.getWeekComparison(guildId),
                economyAdmin_service_1.default.detectAnomalies(guildId),
            ]);
            const topRichestStr = circulation.topRichest.length > 0
                ? circulation.topRichest
                    .map((u, i) => `${i + 1}. <@${u.userId}> — ${u.coin.toLocaleString()} 🪙 | ${u.gem.toLocaleString()} 💎`)
                    .join("\n")
                : "—";
            const sourcesStr = sources.length > 0
                ? sources.map((s) => `${s.type}: **${s.total.toLocaleString()}** (${s.pct}%)`).join("\n")
                : "—";
            const sinksStr = sinks.length > 0
                ? sinks.map((s) => `${s.type}: **${s.total.toLocaleString()}** (${s.pct}%)`).join("\n")
                : "—";
            const wealthStr = wealth.length > 0 ? wealth.map((b) => `${b.label}: **${b.count}** users`).join("\n") : "—";
            const netDirection = flow.coinNet >= 0
                ? (0, t_1.t)(locale, "economy.admin.dashboard.inflationary")
                : (0, t_1.t)(locale, "economy.admin.dashboard.deflationary");
            const activeDelta = weekComp.thisWeekActive - weekComp.lastWeekActive;
            const activeDeltaStr = activeDelta >= 0 ? `+${activeDelta}` : String(activeDelta);
            const anomalyLines = anomalies.map((a) => {
                if (a.type === "earning_spike")
                    return (0, t_1.t)(locale, "economy.admin.dashboard.anomaly_earning", {
                        userId: a.userId,
                        value: String(a.value),
                        threshold: String(a.threshold),
                    });
                if (a.type === "gambling_abuse")
                    return (0, t_1.t)(locale, "economy.admin.dashboard.anomaly_gambling", {
                        userId: a.userId,
                        value: String(a.value),
                        threshold: String(a.threshold),
                    });
                return (0, t_1.t)(locale, "economy.admin.dashboard.anomaly_rob", {
                    userId: a.userId,
                    value: String(a.value),
                    threshold: String(a.threshold),
                });
            });
            const anomalyStr = anomalyLines.length > 0 ? anomalyLines.join("\n") : (0, t_1.t)(locale, "economy.admin.dashboard.no_anomalies");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "economy.admin.dashboard.title"))
                .addFields({
                name: (0, t_1.t)(locale, "economy.admin.dashboard.circulation"),
                value: (0, t_1.t)(locale, "economy.admin.dashboard.circulation_value", {
                    totalCoin: circulation.totalCoin.toLocaleString(),
                    totalGem: circulation.totalGem.toLocaleString(),
                    activeUsers: String(circulation.activeUsers),
                }),
                inline: false,
            }, {
                name: (0, t_1.t)(locale, "economy.admin.dashboard.flow_24h"),
                value: (0, t_1.t)(locale, "economy.admin.dashboard.flow_value", {
                    earned: flow.coinEarned.toLocaleString(),
                    spent: flow.coinSpent.toLocaleString(),
                    net: Math.abs(flow.coinNet).toLocaleString(),
                    direction: netDirection,
                }),
                inline: false,
            }, { name: (0, t_1.t)(locale, "economy.admin.dashboard.sources"), value: sourcesStr, inline: true }, { name: (0, t_1.t)(locale, "economy.admin.dashboard.sinks"), value: sinksStr, inline: true }, { name: (0, t_1.t)(locale, "economy.admin.dashboard.wealth"), value: wealthStr, inline: false }, {
                name: (0, t_1.t)(locale, "economy.admin.dashboard.week_compare"),
                value: (0, t_1.t)(locale, "economy.admin.dashboard.week_value", {
                    thisWeek: weekComp.thisWeekCoin.toLocaleString(),
                    changePct: String(weekComp.coinChangePct),
                    thisActive: String(weekComp.thisWeekActive),
                    activeDelta: activeDeltaStr,
                }),
                inline: false,
            }, { name: (0, t_1.t)(locale, "economy.admin.dashboard.top_richest"), value: topRichestStr, inline: false }, { name: (0, t_1.t)(locale, "economy.admin.dashboard.anomalies"), value: anomalyStr, inline: false })
                .setColor(0x5865f2)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "history": {
            const target = interaction.options.getUser("user", true);
            const type = interaction.options.getString("type") ?? "all";
            const minAmount = interaction.options.getInteger("min-amount") ?? undefined;
            let page = 0;
            const buildHistoryEmbed = async (currentPage) => {
                const result = await economyAdmin_service_1.default.getHistory({
                    userId: target.id,
                    guildId,
                    type,
                    minAmount,
                    page: currentPage,
                });
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)(locale, "economy.admin.history.title", { username: target.username }))
                    .setColor(0x5865f2);
                if (result.transactions.length === 0) {
                    embed.setDescription((0, t_1.t)(locale, "economy.admin.history.empty"));
                }
                else {
                    const lines = result.transactions.map((tx) => {
                        const coinStr = tx.coinDelta !== 0 ? ` ${tx.coinDelta > 0 ? "+" : ""}${tx.coinDelta} 🪙` : "";
                        const gemStr = tx.gemDelta !== 0 ? ` ${tx.gemDelta > 0 ? "+" : ""}${tx.gemDelta} 💎` : "";
                        const date = tx.createdAt.toISOString().slice(0, 10);
                        return `\`#${tx.shortId}\` **${tx.type}**${coinStr}${gemStr} — ${date}`;
                    });
                    embed.setDescription(lines.join("\n"));
                    embed.setFooter({
                        text: (0, t_1.t)(locale, "economy.admin.history.page", {
                            current: result.page + 1,
                            total: result.totalPages,
                            totalCount: result.totalCount,
                        }),
                    });
                }
                return { embed, hasNext: result.page + 1 < result.totalPages, hasPrev: result.page > 0 };
            };
            const buildRow = (hasPrev, hasNext, disabled = false) => {
                return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId("hist_prev")
                    .setLabel("◀")
                    .setStyle(discord_js_1.ButtonStyle.Secondary)
                    .setDisabled(disabled || !hasPrev), new discord_js_1.ButtonBuilder()
                    .setCustomId("hist_next")
                    .setLabel("▶")
                    .setStyle(discord_js_1.ButtonStyle.Secondary)
                    .setDisabled(disabled || !hasNext));
            };
            const { embed: firstEmbed, hasNext, hasPrev } = await buildHistoryEmbed(page);
            const row = buildRow(hasPrev, hasNext);
            const message = await interaction.editReply({ embeds: [firstEmbed], components: [row] });
            while (true) {
                try {
                    const i = await message.awaitMessageComponent({
                        componentType: discord_js_1.ComponentType.Button,
                        time: 60_000,
                        filter: (btn) => btn.user.id === interaction.user.id,
                    });
                    await i.deferUpdate();
                    if (i.customId === "hist_next")
                        page++;
                    else if (i.customId === "hist_prev")
                        page = Math.max(0, page - 1);
                    const { embed: nextEmbed, hasNext: hn, hasPrev: hp } = await buildHistoryEmbed(page);
                    await i.editReply({ embeds: [nextEmbed], components: [buildRow(hp, hn)] });
                }
                catch {
                    break;
                }
            }
            const { embed: finalEmbed, hasNext: fhn, hasPrev: fhp } = await buildHistoryEmbed(page);
            await interaction
                .editReply({ embeds: [finalEmbed], components: [buildRow(fhp, fhn, true)] })
                .catch(() => { });
            return;
        }
        case "reverse": {
            const shortId = interaction.options.getString("id", true);
            try {
                const result = await economyAdmin_service_1.default.reverseTransaction(shortId, guildId, interaction.user.id);
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.admin.reverse.success", {
                    shortId,
                    type: result.original.type,
                    coinDelta: String(result.original.coinDelta),
                    gemDelta: String(result.original.gemDelta),
                    reversedId: result.reversedId,
                }))
                    .setColor(0x57f287);
                await interaction.editReply({ embeds: [embed] });
                economyLog_service_1.default.shouldLog(guildId, "admin_action")
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle((0, t_1.t)("en", "economy.log.admin_action"))
                        .setDescription(`Admin <@${interaction.user.id}> reversed transaction \`#${shortId}\` (type: ${result.original.type}, coin: ${result.original.coinDelta}, gem: ${result.original.gemDelta}). Reverse ID: \`#${result.reversedId}\``)
                        .setColor(0xfee75c)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : "";
                let key = "common.error";
                if (msg === "TRANSACTION_NOT_FOUND")
                    key = "economy.admin.reverse.not_found";
                else if (msg === "AMBIGUOUS_ID")
                    key = "economy.admin.reverse.ambiguous";
                else if (msg === "ALREADY_REVERSED")
                    key = "economy.admin.reverse.already_reversed";
                else if (msg === "NOT_REVERSIBLE")
                    key = "economy.admin.reverse.not_reversible";
                await interaction.editReply({
                    embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, key)).setColor(0xed4245)],
                });
            }
            return;
        }
        case "freeze": {
            const target = interaction.options.getUser("user", true);
            const reason = interaction.options.getString("reason") ?? "";
            await economyAdmin_service_1.default.freeze(target.id, guildId, interaction.user.id, reason);
            const reasonSuffix = reason ? (0, t_1.t)(locale, "economy.admin.freeze.reason_suffix", { reason }) : "";
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.admin.freeze.success", { userId: target.id, reason: reasonSuffix }))
                .setColor(0xed4245);
            await interaction.editReply({ embeds: [embed] });
            economyLog_service_1.default.shouldLog(guildId, "freeze")
                .then((should) => {
                if (!should)
                    return;
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)("en", "economy.log.freeze"))
                    .setDescription(`Admin <@${interaction.user.id}> froze <@${target.id}>'s economy access.${reason ? ` Reason: ${reason}` : ""}`)
                    .setColor(0xed4245)
                    .setTimestamp();
                economyLog_service_1.default.sendLog(guildId, logEmbed);
            })
                .catch(() => { });
            return;
        }
        case "unfreeze": {
            const target = interaction.options.getUser("user", true);
            const wasFound = await economyAdmin_service_1.default.unfreeze(target.id, guildId);
            if (!wasFound) {
                await interaction.editReply({
                    embeds: [
                        new discord_js_1.EmbedBuilder()
                            .setDescription((0, t_1.t)(locale, "economy.admin.unfreeze.not_found"))
                            .setColor(0xed4245),
                    ],
                });
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.admin.unfreeze.success", { userId: target.id }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });
            economyLog_service_1.default.shouldLog(guildId, "freeze")
                .then((should) => {
                if (!should)
                    return;
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)("en", "economy.log.unfreeze"))
                    .setDescription(`Admin <@${interaction.user.id}> unfroze <@${target.id}>'s economy access.`)
                    .setColor(0x57f287)
                    .setTimestamp();
                economyLog_service_1.default.sendLog(guildId, logEmbed);
            })
                .catch(() => { });
            return;
        }
        case "reset": {
            const scope = interaction.options.getString("scope", true);
            const targetUser = interaction.options.getUser("target");
            const target = targetUser ? targetUser.id : "server";
            const targetLabel = targetUser ? `<@${targetUser.id}>` : "server";
            const affectedCount = await economyAdmin_service_1.default.countAffected(guildId, scope, target);
            const confirmEmbed = new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "economy.admin.reset.confirm_title"))
                .setDescription((0, t_1.t)(locale, "economy.admin.reset.confirm_desc", { scope, target: targetLabel, total: affectedCount }))
                .setColor(0xfee75c);
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("reset_confirm").setLabel("Confirm").setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId("reset_cancel").setLabel("Cancel").setStyle(discord_js_1.ButtonStyle.Secondary));
            const message = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
            try {
                const i = await message.awaitMessageComponent({
                    componentType: discord_js_1.ComponentType.Button,
                    time: 30_000,
                    filter: (btn) => btn.user.id === interaction.user.id,
                });
                await i.deferUpdate();
                if (i.customId === "reset_cancel") {
                    await i.editReply({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
                                .setDescription((0, t_1.t)(locale, "economy.admin.reset.cancelled"))
                                .setColor(0xed4245),
                        ],
                        components: [],
                    });
                    return;
                }
                const result = await economyAdmin_service_1.default.resetEconomy(guildId, scope, target, interaction.user.id);
                const successEmbed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.admin.reset.success", {
                    scope,
                    total: result.affectedCount,
                    snapshotId: result.snapshotId,
                }))
                    .setColor(0x57f287);
                await i.editReply({ embeds: [successEmbed], components: [] });
                economyLog_service_1.default.shouldLog(guildId, "reset")
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle((0, t_1.t)("en", "economy.log.reset"))
                        .setDescription(`Admin <@${interaction.user.id}> reset economy. Scope: ${scope}, Target: ${targetLabel}, Affected: ${result.affectedCount}, Snapshot: \`${result.snapshotId}\``)
                        .setColor(0xfee75c)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            catch {
                await interaction
                    .editReply({
                    embeds: [
                        new discord_js_1.EmbedBuilder()
                            .setDescription((0, t_1.t)(locale, "economy.admin.reset.timeout"))
                            .setColor(0xed4245),
                    ],
                    components: [],
                })
                    .catch(() => { });
            }
            return;
        }
        case "rollback": {
            const snapshotId = interaction.options.getString("id", true);
            const snapshot = await economySnapshot_model_1.default.findOne({ snapshotId, guildId, restoredAt: null }).lean();
            if (!snapshot) {
                await interaction.editReply({
                    embeds: [
                        new discord_js_1.EmbedBuilder()
                            .setDescription((0, t_1.t)(locale, "economy.admin.rollback.not_found"))
                            .setColor(0xed4245),
                    ],
                });
                return;
            }
            const snapDate = snapshot.createdAt.toISOString().slice(0, 10);
            const confirmEmbed = new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)(locale, "economy.admin.rollback.confirm_title"))
                .setDescription((0, t_1.t)(locale, "economy.admin.rollback.confirm_desc", {
                snapshotId,
                scope: snapshot.scope,
                date: snapDate,
                total: snapshot.data.length,
            }))
                .setColor(0xfee75c);
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("rb_confirm").setLabel("Confirm").setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId("rb_cancel").setLabel("Cancel").setStyle(discord_js_1.ButtonStyle.Secondary));
            const message = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
            try {
                const i = await message.awaitMessageComponent({
                    componentType: discord_js_1.ComponentType.Button,
                    time: 30_000,
                    filter: (btn) => btn.user.id === interaction.user.id,
                });
                await i.deferUpdate();
                if (i.customId === "rb_cancel") {
                    await i.editReply({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
                                .setDescription((0, t_1.t)(locale, "economy.admin.rollback.cancelled"))
                                .setColor(0xed4245),
                        ],
                        components: [],
                    });
                    return;
                }
                const result = await economyAdmin_service_1.default.rollbackSnapshot(snapshotId, guildId);
                const successEmbed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.admin.rollback.success", {
                    total: result.restoredCount,
                    scope: snapshot.scope,
                }))
                    .setColor(0x57f287);
                await i.editReply({ embeds: [successEmbed], components: [] });
                economyLog_service_1.default.shouldLog(guildId, "admin_action")
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle((0, t_1.t)("en", "economy.log.admin_action"))
                        .setDescription(`Admin <@${interaction.user.id}> rolled back snapshot \`${snapshotId}\`. Scope: ${snapshot.scope}, Restored: ${result.restoredCount} users.`)
                        .setColor(0xfee75c)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            catch {
                await interaction
                    .editReply({
                    embeds: [
                        new discord_js_1.EmbedBuilder()
                            .setDescription((0, t_1.t)(locale, "economy.admin.rollback.timeout"))
                            .setColor(0xed4245),
                    ],
                    components: [],
                })
                    .catch(() => { });
            }
            return;
        }
        case "log-setup": {
            const channel = interaction.options.getChannel("channel", true);
            const me = interaction.guild?.members.me;
            if (me) {
                const perms = channel.permissionsFor(me);
                if (!perms?.has([discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.EmbedLinks])) {
                    await interaction.editReply({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
                                .setDescription((0, t_1.t)(locale, "economy.admin.log.setup_invalid"))
                                .setColor(0xed4245),
                        ],
                    });
                    return;
                }
            }
            await economyLogConfig_model_1.default.findOneAndUpdate({ guildId }, { $set: { channelId: channel.id, enabled: true }, $setOnInsert: { guildId } }, { upsert: true });
            await economyLog_service_1.default.invalidateConfigCache(guildId);
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.admin.log.setup_success", { channelId: channel.id }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });
            economyLog_service_1.default.shouldLog(guildId, "admin_action")
                .then((should) => {
                if (!should)
                    return;
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)("en", "economy.log.admin_action"))
                    .setDescription(`Admin <@${interaction.user.id}> set economy log channel to <#${channel.id}>.`)
                    .setColor(0xfee75c)
                    .setTimestamp();
                economyLog_service_1.default.sendLog(guildId, logEmbed);
            })
                .catch(() => { });
            return;
        }
        case "log-config": {
            const logCfg = await economyLogConfig_model_1.default.findOne({ guildId });
            if (!logCfg) {
                await interaction.editReply({
                    embeds: [
                        new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "economy.admin.log.not_setup")).setColor(0xed4245),
                    ],
                });
                return;
            }
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);
            const booleanSettings = ["robSuccess", "adminActions", "bulkOperations"];
            const updateValue = booleanSettings.includes(setting) ? value > 0 : value;
            await economyLogConfig_model_1.default.updateOne({ guildId }, { $set: { [`thresholds.${setting}`]: updateValue } });
            await economyLog_service_1.default.invalidateConfigCache(guildId);
            const displayValue = booleanSettings.includes(setting)
                ? value > 0
                    ? "enabled"
                    : "disabled"
                : String(value);
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "economy.admin.log.config_updated", { setting, value: displayValue }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        default:
            await interaction.editReply((0, t_1.t)(locale, "common.unknown_subcommand"));
    }
}
async function handleBulk(interaction, subcommand, locale, guildId) {
    if (subcommand !== "distribute" && subcommand !== "tax") {
        await interaction.editReply((0, t_1.t)(locale, "common.unknown_subcommand"));
        return;
    }
    const cooldown = await economyBulk_service_1.default.checkCooldown(guildId);
    if (cooldown > 0) {
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "economy.bulk.cooldown", { seconds: String(cooldown) }))
                    .setColor(0xed4245),
            ],
        });
        return;
    }
    const amount = interaction.options.getInteger("amount", true);
    const currency = interaction.options.getString("currency", true);
    const role = interaction.options.getRole("role");
    if (!interaction.guild)
        return;
    // WARNING: Fetches all cached members. If GuildMembers intent is enabled, add chunking to prevent OOM.
    await interaction.guild.members.fetch();
    const allMembers = [...interaction.guild.members.cache.values()].filter((m) => !m.user.bot);
    const eligible = role ? allMembers.filter((m) => m.roles.cache.has(role.id)) : allMembers;
    if (eligible.length === 0) {
        await interaction.editReply({
            embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "economy.bulk.no_members")).setColor(0xed4245)],
        });
        return;
    }
    const actionLabel = subcommand === "distribute" ? "Distribute" : "Tax";
    const targetLabel = role ? `<@&${role.id}>` : "all";
    const currencyLabel = currency === "coin" ? "🪙 coin" : "💎 gem";
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "economy.bulk.confirm_title", { action: actionLabel }))
        .setDescription((0, t_1.t)(locale, "economy.bulk.confirm_desc", {
        action: actionLabel,
        amount: amount.toLocaleString(),
        currency: currencyLabel,
        target: targetLabel,
        total: eligible.length,
    }))
        .setColor(0xfee75c);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("bulk_confirm").setLabel("Confirm").setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId("bulk_cancel").setLabel("Cancel").setStyle(discord_js_1.ButtonStyle.Secondary));
    const message = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
    try {
        const i = await message.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button,
            time: 30_000,
            filter: (btn) => btn.user.id === interaction.user.id,
        });
        await i.deferUpdate();
        if (i.customId === "bulk_cancel") {
            await i.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "economy.bulk.cancelled")).setColor(0xed4245)],
                components: [],
            });
            return;
        }
        const roleId = role?.id;
        let result;
        if (subcommand === "distribute") {
            result = await economyBulk_service_1.default.distribute(guildId, eligible, amount, currency, interaction.user.id, roleId);
        }
        else {
            result = await economyBulk_service_1.default.tax(guildId, eligible, amount, currency, interaction.user.id, roleId);
        }
        const successKey = subcommand === "distribute" ? "economy.bulk.distribute_success" : "economy.bulk.tax_success";
        const successEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, successKey, {
            amount: amount.toLocaleString(),
            currency: currencyLabel,
            total: result.affectedCount,
        }))
            .setColor(0x57f287);
        await i.editReply({ embeds: [successEmbed], components: [] });
        economyLog_service_1.default.shouldLog(guildId, "bulk_operation")
            .then((should) => {
            if (!should)
                return;
            const logEmbed = new discord_js_1.EmbedBuilder()
                .setTitle((0, t_1.t)("en", "economy.log.bulk_op"))
                .setDescription(`Admin <@${interaction.user.id}> ran bulk **${subcommand}** of **${amount}** ${currency} to **${result.affectedCount}** members. Total: ${result.totalAmount}. Role: ${role ? `<@&${role.id}>` : "all"}.`)
                .setColor(0xfee75c)
                .setTimestamp();
            economyLog_service_1.default.sendLog(guildId, logEmbed);
        })
            .catch(() => { });
    }
    catch {
        await interaction
            .editReply({
            embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "economy.bulk.timeout")).setColor(0xed4245)],
            components: [],
        })
            .catch(() => { });
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("economy")
        .setDescription("Economy management (admin)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.desc"))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .addSubcommandGroup((group) => group
        .setName("balance")
        .setDescription("Manage user currency")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.balance.desc"))
        .addSubcommand((sub) => sub
        .setName("set-coin")
        .setDescription("Set a user's coin")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-coin.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-coin.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Coin amount")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-coin.amount.desc"))
        .setMinValue(0)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("add-coin")
        .setDescription("Add coin to a user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-coin.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-coin.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Coin to add")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-coin.amount.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("set-gem")
        .setDescription("Set a user's gem")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-gem.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-gem.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Gem amount")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.set-gem.amount.desc"))
        .setMinValue(0)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("add-gem")
        .setDescription("Add gem to a user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-gem.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-gem.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Gem to add")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.add-gem.amount.desc"))
        .setRequired(true))))
        .addSubcommandGroup((group) => group
        .setName("config")
        .setDescription("Manage server economy configuration")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.desc"))
        .addSubcommand((sub) => sub
        .setName("reward-view")
        .setDescription("View passive reward config")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.reward-view.desc")))
        .addSubcommand((sub) => sub
        .setName("reward-toggle")
        .setDescription("Enable/disable passive rewards")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.reward-toggle.desc")))
        .addSubcommand((sub) => sub
        .setName("reward-set")
        .setDescription("Set a reward config value")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.reward-set.desc"))
        .addStringOption((opt) => opt
        .setName("setting")
        .setDescription("Setting to change")
        .setRequired(true)
        .addChoices({ name: "level-coin-base", value: "levelUpCoinBase" }, { name: "level-coin-per-level", value: "levelUpCoinPerLevel" }, { name: "voice-interval", value: "voiceCoinInterval" }, { name: "voice-reward", value: "voiceCoinReward" }))
        .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("reward-milestone")
        .setDescription("Set/remove a gem milestone (gems=0 removes)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.reward-milestone.desc"))
        .addIntegerOption((opt) => opt
        .setName("level")
        .setDescription("Level for the milestone")
        .setMinValue(1)
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("gems")
        .setDescription("Gem reward (0 to remove)")
        .setMinValue(0)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("gambling-view")
        .setDescription("View gambling config")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.gambling-view.desc")))
        .addSubcommand((sub) => sub
        .setName("gambling-toggle")
        .setDescription("Enable/disable gambling")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.gambling-toggle.desc")))
        .addSubcommand((sub) => sub
        .setName("gambling-set")
        .setDescription("Set a gambling config value")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.gambling-set.desc"))
        .addStringOption((opt) => opt
        .setName("setting")
        .setDescription("Setting to change")
        .setRequired(true)
        .addChoices({ name: "min-bet", value: "minBet" }, { name: "max-bet", value: "maxBet" }))
        .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("work-view")
        .setDescription("View work & fish config")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.work-view.desc")))
        .addSubcommand((sub) => sub
        .setName("work-toggle")
        .setDescription("Enable/disable work & fish commands")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.work-toggle.desc")))
        .addSubcommand((sub) => sub
        .setName("work-set")
        .setDescription("Set a work/fish config value")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.work-set.desc"))
        .addStringOption((opt) => opt
        .setName("setting")
        .setDescription("Setting to change")
        .setRequired(true)
        .addChoices({ name: "work-min-reward", value: "workMinReward" }, { name: "work-max-reward", value: "workMaxReward" }))
        .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("social-view")
        .setDescription("View gift & rob config")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.social-view.desc")))
        .addSubcommand((sub) => sub
        .setName("social-toggle")
        .setDescription("Enable/disable gift & rob commands")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.social-toggle.desc")))
        .addSubcommand((sub) => sub
        .setName("social-set")
        .setDescription("Set a social config value")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.config.social-set.desc"))
        .addStringOption((opt) => opt
        .setName("setting")
        .setDescription("Setting to change")
        .setRequired(true)
        .addChoices({ name: "gift-max-amount", value: "giftMaxAmount" }, { name: "rob-min-balance", value: "robMinBalance" }))
        .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true))))
        // ─── admin group ───────────────────────────────────
        .addSubcommandGroup((group) => group
        .setName("admin")
        .setDescription("Admin tools: dashboard, audit, reset, logs")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.desc"))
        .addSubcommand((sub) => sub
        .setName("dashboard")
        .setDescription("View server economy dashboard")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.dashboard.desc")))
        .addSubcommand((sub) => sub
        .setName("history")
        .setDescription("View a user's transaction history")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.history.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to inspect")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.history.user.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Filter by type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.history.type.desc"))
        .addChoices({ name: "all", value: "all" }, { name: "pray", value: "pray" }, { name: "curse", value: "curse" }, { name: "work", value: "work" }, { name: "fish", value: "fish" }, { name: "gambling", value: "gambling" }, { name: "gift", value: "gift" }, { name: "rob", value: "rob" }, { name: "purchase", value: "purchase" }, { name: "admin", value: "admin" }))
        .addIntegerOption((opt) => opt
        .setName("min-amount")
        .setDescription("Minimum amount")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.history.min_amount.desc"))
        .setMinValue(1)))
        .addSubcommand((sub) => sub
        .setName("reverse")
        .setDescription("Reverse a specific transaction")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.reverse.desc"))
        .addStringOption((opt) => opt
        .setName("id")
        .setDescription("Transaction short ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.reverse.id.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("freeze")
        .setDescription("Freeze a user's economy access")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.freeze.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to freeze")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.freeze.user.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("reason")
        .setDescription("Reason")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.freeze.reason.desc"))))
        .addSubcommand((sub) => sub
        .setName("unfreeze")
        .setDescription("Unfreeze a user's economy access")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.unfreeze.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to unfreeze")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.unfreeze.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("reset")
        .setDescription("Reset economy (auto-snapshots)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.reset.desc"))
        .addStringOption((opt) => opt
        .setName("scope")
        .setDescription("What to reset")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.reset.scope.desc"))
        .setRequired(true)
        .addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }, { name: "streak", value: "streak" }, { name: "all", value: "all" }))
        .addUserOption((opt) => opt
        .setName("target")
        .setDescription("Specific user (blank = server)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.reset.target.desc"))))
        .addSubcommand((sub) => sub
        .setName("rollback")
        .setDescription("Restore from a snapshot")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.rollback.desc"))
        .addStringOption((opt) => opt
        .setName("id")
        .setDescription("Snapshot ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.rollback.id.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("log-setup")
        .setDescription("Set economy log channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.log_setup.desc"))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Log channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.log_setup.channel.desc"))
        .setRequired(true)
        .addChannelTypes(discord_js_1.ChannelType.GuildText)))
        .addSubcommand((sub) => sub
        .setName("log-config")
        .setDescription("Configure log thresholds")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.log_config.desc"))
        .addStringOption((opt) => opt
        .setName("setting")
        .setDescription("Setting to change")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.log_config.setting.desc"))
        .setRequired(true)
        .addChoices({ name: "coin-threshold", value: "coinTransaction" }, { name: "gem-threshold", value: "gemTransaction" }, { name: "gambling-threshold", value: "gamblingWin" }, { name: "rob-success", value: "robSuccess" }, { name: "admin-actions", value: "adminActions" }, { name: "bulk-operations", value: "bulkOperations" }))
        .addIntegerOption((opt) => opt
        .setName("value")
        .setDescription("New value (0 = off for boolean settings)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.admin.log_config.value.desc"))
        .setMinValue(0)
        .setRequired(true))))
        // ─── bulk group ────────────────────────────────────
        .addSubcommandGroup((group) => group
        .setName("bulk")
        .setDescription("Bulk currency operations")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.desc"))
        .addSubcommand((sub) => sub
        .setName("distribute")
        .setDescription("Distribute currency to members")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.distribute.desc"))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Amount per member")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.distribute.amount.desc"))
        .setMinValue(1)
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("currency")
        .setDescription("Currency type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.distribute.currency.desc"))
        .setRequired(true)
        .addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }))
        .addRoleOption((opt) => opt
        .setName("role")
        .setDescription("Target role (blank = all)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.distribute.role.desc"))))
        .addSubcommand((sub) => sub
        .setName("tax")
        .setDescription("Collect currency from members")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.tax.desc"))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("Amount per member")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.tax.amount.desc"))
        .setMinValue(1)
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("currency")
        .setDescription("Currency type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.tax.currency.desc"))
        .setRequired(true)
        .addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }))
        .addRoleOption((opt) => opt
        .setName("role")
        .setDescription("Target role (blank = all)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.economy.bulk.tax.role.desc"))))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        try {
            const locale = await (0, locale_1.resolveLocale)(interaction);
            const guildId = interaction.guildId;
            const group = interaction.options.getSubcommandGroup(true);
            const subcommand = interaction.options.getSubcommand(true);
            let embed;
            switch (group) {
                case "balance":
                    embed = await handleBalance(interaction, subcommand, locale, guildId);
                    break;
                case "config":
                    embed = await handleConfig(interaction, subcommand, locale, guildId);
                    break;
                case "admin":
                    await handleAdmin(interaction, subcommand, locale, guildId);
                    return;
                case "bulk":
                    await handleBulk(interaction, subcommand, locale, guildId);
                    return;
                default:
                    await interaction.editReply((0, t_1.t)(locale, "common.unknown_subcommand"));
                    return;
            }
            await interaction.editReply({ embeds: [embed] });
        }
        catch {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
