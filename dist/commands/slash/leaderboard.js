"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = __importDefault(require("../../client"));
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const wallet_service_1 = __importDefault(require("../../services/economy/wallet.service"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const xpSnapshot_model_1 = __importDefault(require("../../models/xpSnapshot.model"));
const button_1 = require("../../util/config/button");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const rankCard_1 = require("../../util/xp/rankCard");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const periodKey_1 = require("../../util/xp/periodKey");
const guildStats_model_1 = __importDefault(require("../../models/guildStats.model"));
const guildStatsSnapshot_model_1 = __importDefault(require("../../models/guildStatsSnapshot.model"));
const PAGE_SIZE = 10;
const MAX_RESULTS = 100;
const IDLE_TIMEOUT = 60_000;
const PERIOD_BUTTON_MAP = {
    [button_1.BUTTON_ID.LEADERBOARD_PERIOD_DAILY]: "daily",
    [button_1.BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY]: "weekly",
    [button_1.BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY]: "monthly",
    [button_1.BUTTON_ID.LEADERBOARD_PERIOD_YEARLY]: "yearly",
    [button_1.BUTTON_ID.LEADERBOARD_PERIOD_ALL]: "all",
};
const PERIOD_LABEL_KEYS = {
    daily: "leaderboard.period.daily",
    weekly: "leaderboard.period.weekly",
    monthly: "leaderboard.period.monthly",
    yearly: "leaderboard.period.yearly",
    all: "leaderboard.period.all",
};
function buildPeriodRow(activePeriod, locale, disabled = false) {
    const periods = [
        { id: button_1.BUTTON_ID.LEADERBOARD_PERIOD_ALL, period: "all" },
        { id: button_1.BUTTON_ID.LEADERBOARD_PERIOD_DAILY, period: "daily" },
        { id: button_1.BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY, period: "weekly" },
        { id: button_1.BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY, period: "monthly" },
        { id: button_1.BUTTON_ID.LEADERBOARD_PERIOD_YEARLY, period: "yearly" },
    ];
    return new discord_js_1.ActionRowBuilder().addComponents(periods.map(({ id, period }) => new discord_js_1.ButtonBuilder()
        .setCustomId(id)
        .setLabel((0, t_1.t)(locale, PERIOD_LABEL_KEYS[period]))
        .setStyle(period === activePeriod ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary)
        .setDisabled(disabled)));
}
function buildPageRow(page, totalPages, locale, disabled = false) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("lb_prev")
        .setLabel(`◀ ${(0, t_1.t)(locale, "leaderboard.prev")}`)
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(disabled || page <= 1), new discord_js_1.ButtonBuilder()
        .setCustomId("lb_page")
        .setLabel((0, t_1.t)(locale, "leaderboard.page_footer", { page, totalPages }))
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(true), new discord_js_1.ButtonBuilder()
        .setCustomId("lb_next")
        .setLabel(`${(0, t_1.t)(locale, "leaderboard.next")} ▶`)
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(disabled || page >= totalPages));
}
function buildTitle(mode, period, locale) {
    const modeLabel = mode === "global" ? "🌐 Global" : mode === "servers" ? "🏆 Servers" : "🏆 Server";
    if (period === "all") {
        return (0, t_1.t)(locale, "leaderboard.period_title_all", { mode: modeLabel });
    }
    const periodLabel = (0, t_1.t)(locale, PERIOD_LABEL_KEYS[period]);
    const periodKeys = (0, periodKey_1.getCurrentPeriodKeys)();
    const periodKey = periodKeys[period];
    return (0, t_1.t)(locale, "leaderboard.period_title", { mode: modeLabel, period: periodLabel, periodKey });
}
async function resolveUsernames(users, interaction, cache) {
    await Promise.all(users.map(async (u) => {
        if (cache.has(u.userID))
            return;
        try {
            const member = await interaction.guild?.members.fetch(u.userID);
            if (member) {
                cache.set(u.userID, member.displayName);
                return;
            }
        }
        catch {
            // Not in this guild
        }
        try {
            const user = await client_1.default.users.fetch(u.userID);
            cache.set(u.userID, user.displayName);
        }
        catch {
            // User not fetchable
        }
    }));
}
async function fetchPeriodData(period, guildId) {
    const periodKeys = (0, periodKey_1.getCurrentPeriodKeys)();
    return xpSnapshot_model_1.default.find({
        guildId,
        period,
        periodKey: periodKeys[period],
    })
        .sort({ xp: -1 })
        .limit(MAX_RESULTS)
        .lean();
}
async function paginateLeaderboard(interaction, mode, locale) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild?.name ?? "Server";
    const usernameCache = new Map();
    let currentPeriod = "all";
    let page = 1;
    async function fetchData() {
        if (currentPeriod === "all") {
            if (mode === "global") {
                const allUsers = await user_model_1.default.find().sort({ totalPoint: -1 }).limit(MAX_RESULTS);
                return { entries: [], allTimeGlobal: allUsers };
            }
            else {
                const allMembers = await memberXP_model_1.default.find({ guildId }).sort({ xp: -1 }).limit(MAX_RESULTS);
                // Check global wallet leaderboard milestone
                const userRankIndex = allMembers.findIndex((m) => m.userId === interaction.user.id);
                if (userRankIndex >= 0 && userRankIndex < 3) {
                    await wallet_service_1.default.checkAndAwardMilestone(interaction.user.id, "leaderboard_top3");
                }
                return { entries: [], allTimeServer: allMembers };
            }
        }
        const entries = await fetchPeriodData(currentPeriod, mode === "global" ? null : guildId);
        return { entries };
    }
    async function buildEmbed(data, p, totalPages) {
        const title = buildTitle(mode, currentPeriod, locale);
        if (currentPeriod === "all") {
            if (mode === "global" && data.allTimeGlobal) {
                const pageData = data.allTimeGlobal.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                await resolveUsernames(pageData, interaction, usernameCache);
                return (0, rankCard_1.buildGlobalLeaderboardEmbed)(pageData, usernameCache, locale, p, totalPages);
            }
            if (data.allTimeServer) {
                const pageData = data.allTimeServer.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                return (0, rankCard_1.buildLeaderboardEmbed)(pageData, guildName, locale, p, totalPages);
            }
        }
        const pageData = data.entries.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
        return (0, rankCard_1.buildPeriodLeaderboardEmbed)(pageData, title, locale, p, totalPages, mode === "global", interaction, usernameCache);
    }
    let data = await fetchData();
    const getTotal = () => {
        if (currentPeriod === "all") {
            return data.allTimeGlobal?.length ?? data.allTimeServer?.length ?? 0;
        }
        return data.entries.length;
    };
    let totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
    page = 1;
    const embed = await buildEmbed(data, page, totalPages);
    const periodRow = buildPeriodRow(currentPeriod, locale);
    const pageRow = buildPageRow(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed], components: [periodRow, pageRow] });
    // Interaction collector
    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: discord_js_1.ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) => i.user.id === interaction.user.id,
            });
            await i.deferUpdate();
            // Check if period button
            if (i.customId in PERIOD_BUTTON_MAP) {
                const newPeriod = PERIOD_BUTTON_MAP[i.customId];
                if (newPeriod !== currentPeriod) {
                    currentPeriod = newPeriod;
                    data = await fetchData();
                    totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
                    page = 1;
                }
            }
            else if (i.customId === "lb_next") {
                page = Math.min(page + 1, totalPages);
            }
            else if (i.customId === "lb_prev") {
                page = Math.max(page - 1, 1);
            }
            const newEmbed = await buildEmbed(data, page, totalPages);
            const newPeriodRow = buildPeriodRow(currentPeriod, locale);
            const newPageRow = buildPageRow(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed], components: [newPeriodRow, newPageRow] });
        }
        catch {
            // Timeout
            break;
        }
    }
    // Disable all buttons
    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction
        .editReply({ embeds: [finalEmbed], components: [disabledPeriodRow, disabledPageRow] })
        .catch(() => { });
}
function resolveServerNames(guildIds, cache) {
    for (const guildId of guildIds) {
        if (cache.has(guildId))
            continue;
        const guild = client_1.default.guilds.cache.get(guildId);
        if (guild) {
            cache.set(guildId, guild.name);
        }
    }
}
async function paginateServerLeaderboard(interaction, locale) {
    const serverNameCache = new Map();
    const knownGuildIds = [...client_1.default.guilds.cache.keys()];
    let currentPeriod = "all";
    let page = 1;
    async function fetchData() {
        if (currentPeriod === "all") {
            const servers = await guildStats_model_1.default.find({ guildId: { $in: knownGuildIds } })
                .sort({ totalXP: -1 })
                .limit(MAX_RESULTS);
            return { allTimeServers: servers };
        }
        const periodKeys = (0, periodKey_1.getCurrentPeriodKeys)();
        const servers = await guildStatsSnapshot_model_1.default.find({
            guildId: { $in: knownGuildIds },
            period: currentPeriod,
            periodKey: periodKeys[currentPeriod],
        })
            .sort({ xp: -1 })
            .limit(MAX_RESULTS);
        return { periodServers: servers };
    }
    async function buildEmbed(data, p, totalPages) {
        const title = buildTitle("servers", currentPeriod, locale);
        if (currentPeriod === "all" && data.allTimeServers) {
            const pageData = data.allTimeServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            resolveServerNames(pageData.map((s) => s.guildId), serverNameCache);
            return (0, rankCard_1.buildServerLeaderboardEmbed)(pageData, serverNameCache, locale, p, totalPages);
        }
        if (data.periodServers) {
            const pageData = data.periodServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            resolveServerNames(pageData.map((s) => s.guildId), serverNameCache);
            return (0, rankCard_1.buildServerPeriodLeaderboardEmbed)(pageData, title, serverNameCache, locale, p, totalPages);
        }
        return null;
    }
    let data = await fetchData();
    const getTotal = () => {
        return data.allTimeServers?.length ?? data.periodServers?.length ?? 0;
    };
    let totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
    page = 1;
    const embed = await buildEmbed(data, page, totalPages);
    const periodRow = buildPeriodRow(currentPeriod, locale);
    const pageRow = buildPageRow(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed], components: [periodRow, pageRow] });
    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: discord_js_1.ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) => i.user.id === interaction.user.id,
            });
            await i.deferUpdate();
            if (i.customId in PERIOD_BUTTON_MAP) {
                const newPeriod = PERIOD_BUTTON_MAP[i.customId];
                if (newPeriod !== currentPeriod) {
                    currentPeriod = newPeriod;
                    data = await fetchData();
                    totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
                    page = 1;
                }
            }
            else if (i.customId === "lb_next") {
                page = Math.min(page + 1, totalPages);
            }
            else if (i.customId === "lb_prev") {
                page = Math.max(page - 1, 1);
            }
            const newEmbed = await buildEmbed(data, page, totalPages);
            const newPeriodRow = buildPeriodRow(currentPeriod, locale);
            const newPageRow = buildPageRow(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed], components: [newPeriodRow, newPageRow] });
        }
        catch {
            break;
        }
    }
    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction
        .editReply({ embeds: [finalEmbed], components: [disabledPeriodRow, disabledPageRow] })
        .catch(() => { });
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.leaderboard.desc"))
        .addStringOption((option) => option
        .setName("mode")
        .setDescription("Leaderboard type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.leaderboard.mode.desc"))
        .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" }, { name: "Servers", value: "servers" })),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const mode = (interaction.options.getString("mode") ?? "server");
            if (mode === "servers") {
                await paginateServerLeaderboard(interaction, locale);
            }
            else {
                await paginateLeaderboard(interaction, mode, locale);
            }
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "leaderboard.error"));
        }
    },
};
