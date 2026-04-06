import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";
import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { BUTTON_ID } from "../../util/config/button";
import {
    buildLeaderboardEmbed,
    buildGlobalLeaderboardEmbed,
    buildPeriodLeaderboardEmbed,
    buildServerLeaderboardEmbed,
    buildServerPeriodLeaderboardEmbed,
} from "../../util/xp/rankCard";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import { getCurrentPeriodKeys } from "../../util/xp/periodKey";
import type { Period } from "../../util/xp/periodKey";
import type { SupportedLocale } from "../../util/i18n/index";
import type { IUser } from "../../models/user.model";
import type { IMemberXP } from "../../models/memberXP.model";
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import type { IGuildStats } from "../../models/guildStats.model";
import type { IGuildStatsSnapshot } from "../../models/guildStatsSnapshot.model";

const PAGE_SIZE = 10;
const MAX_RESULTS = 100;
const IDLE_TIMEOUT = 60_000;

type LeaderboardPeriod = Period | "all";

const PERIOD_BUTTON_MAP: Record<string, LeaderboardPeriod> = {
    [BUTTON_ID.LEADERBOARD_PERIOD_DAILY]: "daily",
    [BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY]: "weekly",
    [BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY]: "monthly",
    [BUTTON_ID.LEADERBOARD_PERIOD_YEARLY]: "yearly",
    [BUTTON_ID.LEADERBOARD_PERIOD_ALL]: "all",
};

const PERIOD_LABEL_KEYS: Record<LeaderboardPeriod, string> = {
    daily: "leaderboard.period.daily",
    weekly: "leaderboard.period.weekly",
    monthly: "leaderboard.period.monthly",
    yearly: "leaderboard.period.yearly",
    all: "leaderboard.period.all",
};

function buildPeriodRow(
    activePeriod: LeaderboardPeriod,
    locale: SupportedLocale,
    disabled = false
): ActionRowBuilder<ButtonBuilder> {
    const periods: { id: string; period: LeaderboardPeriod }[] = [
        { id: BUTTON_ID.LEADERBOARD_PERIOD_ALL, period: "all" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_DAILY, period: "daily" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY, period: "weekly" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY, period: "monthly" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_YEARLY, period: "yearly" },
    ];

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        periods.map(({ id, period }) =>
            new ButtonBuilder()
                .setCustomId(id)
                .setLabel(t(locale, PERIOD_LABEL_KEYS[period]))
                .setStyle(period === activePeriod ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    );
}

function buildPageRow(
    page: number,
    totalPages: number,
    locale: SupportedLocale,
    disabled = false
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("lb_prev")
            .setLabel(`◀ ${t(locale, "leaderboard.prev")}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page <= 1),
        new ButtonBuilder()
            .setCustomId("lb_page")
            .setLabel(t(locale, "leaderboard.page_footer", { page, totalPages }))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("lb_next")
            .setLabel(`${t(locale, "leaderboard.next")} ▶`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages)
    );
}

function buildTitle(mode: string, period: LeaderboardPeriod, locale: SupportedLocale): string {
    const modeLabel = mode === "global" ? "🌐 Global" : mode === "servers" ? "🏆 Servers" : "🏆 Server";
    if (period === "all") {
        return t(locale, "leaderboard.period_title_all", { mode: modeLabel });
    }
    const periodLabel = t(locale, PERIOD_LABEL_KEYS[period]);
    const periodKeys = getCurrentPeriodKeys();
    const periodKey = periodKeys[period];
    return t(locale, "leaderboard.period_title", { mode: modeLabel, period: periodLabel, periodKey });
}

async function resolveUsernames(
    users: IUser[],
    interaction: ChatInputCommandInteraction,
    cache: Map<string, string>
): Promise<void> {
    await Promise.all(
        users.map(async (u) => {
            if (cache.has(u.userID)) return;
            try {
                const member = await interaction.guild?.members.fetch(u.userID);
                if (member) {
                    cache.set(u.userID, member.displayName);
                    return;
                }
            } catch {
                // Not in this guild
            }
            try {
                const user = await client.users.fetch(u.userID);
                cache.set(u.userID, user.displayName);
            } catch {
                // User not fetchable
            }
        })
    );
}

interface SnapshotEntry {
    userId: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

async function fetchPeriodData(period: Period, guildId: string | null): Promise<SnapshotEntry[]> {
    const periodKeys = getCurrentPeriodKeys();
    return XPSnapshotModel.find({
        guildId,
        period,
        periodKey: periodKeys[period],
    })
        .sort({ xp: -1 })
        .limit(MAX_RESULTS)
        .lean();
}

async function paginateLeaderboard(
    interaction: ChatInputCommandInteraction,
    mode: "server" | "global",
    locale: SupportedLocale
): Promise<void> {
    const guildId = interaction.guildId!;
    const guildName = interaction.guild?.name ?? "Server";
    const usernameCache = new Map<string, string>();

    let currentPeriod: LeaderboardPeriod = "all";
    let page = 1;

    async function fetchData(): Promise<{
        entries: SnapshotEntry[];
        allTimeGlobal?: IUser[];
        allTimeServer?: IMemberXP[];
    }> {
        if (currentPeriod === "all") {
            if (mode === "global") {
                const allUsers = await UserModel.find().sort({ totalPoint: -1 }).limit(MAX_RESULTS);
                return { entries: [], allTimeGlobal: allUsers };
            } else {
                const allMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(MAX_RESULTS);
                return { entries: [], allTimeServer: allMembers };
            }
        }
        const entries = await fetchPeriodData(currentPeriod, mode === "global" ? null : guildId);
        return { entries };
    }

    async function buildEmbed(data: Awaited<ReturnType<typeof fetchData>>, p: number, totalPages: number) {
        const title = buildTitle(mode, currentPeriod, locale);

        if (currentPeriod === "all") {
            if (mode === "global" && data.allTimeGlobal) {
                const pageData = data.allTimeGlobal.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                await resolveUsernames(pageData, interaction, usernameCache);
                return buildGlobalLeaderboardEmbed(pageData, usernameCache, locale, p, totalPages);
            }
            if (data.allTimeServer) {
                const pageData = data.allTimeServer.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                return buildLeaderboardEmbed(pageData, guildName, locale, p, totalPages);
            }
        }

        const pageData = data.entries.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
        return buildPeriodLeaderboardEmbed(
            pageData,
            title,
            locale,
            p,
            totalPages,
            mode === "global",
            interaction,
            usernameCache
        );
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
    const message = await interaction.editReply({ embeds: [embed!], components: [periodRow, pageRow] });

    // Interaction collector
    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
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
            } else if (i.customId === "lb_next") {
                page = Math.min(page + 1, totalPages);
            } else if (i.customId === "lb_prev") {
                page = Math.max(page - 1, 1);
            }

            const newEmbed = await buildEmbed(data, page, totalPages);
            const newPeriodRow = buildPeriodRow(currentPeriod, locale);
            const newPageRow = buildPageRow(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed!], components: [newPeriodRow, newPageRow] });
        } catch {
            // Timeout
            break;
        }
    }

    // Disable all buttons
    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction
        .editReply({ embeds: [finalEmbed!], components: [disabledPeriodRow, disabledPageRow] })
        .catch(() => {});
}

function resolveServerNames(guildIds: string[], cache: Map<string, string>): void {
    for (const guildId of guildIds) {
        if (cache.has(guildId)) continue;
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            cache.set(guildId, guild.name);
        }
    }
}

async function paginateServerLeaderboard(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const serverNameCache = new Map<string, string>();

    let currentPeriod: LeaderboardPeriod = "all";
    let page = 1;

    async function fetchData(): Promise<{ allTimeServers?: IGuildStats[]; periodServers?: IGuildStatsSnapshot[] }> {
        if (currentPeriod === "all") {
            const servers = await GuildStatsModel.find().sort({ totalXP: -1 }).limit(MAX_RESULTS);
            const filtered = servers.filter((s) => client.guilds.cache.has(s.guildId));
            return { allTimeServers: filtered };
        }
        const periodKeys = getCurrentPeriodKeys();
        const servers = await GuildStatsSnapshotModel.find({
            period: currentPeriod,
            periodKey: periodKeys[currentPeriod],
        })
            .sort({ xp: -1 })
            .limit(MAX_RESULTS);
        const filtered = servers.filter((s) => client.guilds.cache.has(s.guildId));
        return { periodServers: filtered };
    }

    async function buildEmbed(data: Awaited<ReturnType<typeof fetchData>>, p: number, totalPages: number) {
        const title = buildTitle("servers", currentPeriod, locale);

        if (currentPeriod === "all" && data.allTimeServers) {
            const pageData = data.allTimeServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            resolveServerNames(
                pageData.map((s) => s.guildId),
                serverNameCache
            );
            return buildServerLeaderboardEmbed(pageData, serverNameCache, locale, p, totalPages);
        }

        if (data.periodServers) {
            const pageData = data.periodServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            resolveServerNames(
                pageData.map((s) => s.guildId),
                serverNameCache
            );
            return buildServerPeriodLeaderboardEmbed(pageData, title, serverNameCache, locale, p, totalPages);
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
    const message = await interaction.editReply({ embeds: [embed!], components: [periodRow, pageRow] });

    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
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
            } else if (i.customId === "lb_next") {
                page = Math.min(page + 1, totalPages);
            } else if (i.customId === "lb_prev") {
                page = Math.max(page - 1, 1);
            }

            const newEmbed = await buildEmbed(data, page, totalPages);
            const newPeriodRow = buildPeriodRow(currentPeriod, locale);
            const newPageRow = buildPageRow(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed!], components: [newPeriodRow, newPageRow] });
        } catch {
            break;
        }
    }

    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction
        .editReply({ embeds: [finalEmbed!], components: [disabledPeriodRow, disabledPageRow] })
        .catch(() => {});
}

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .setDescriptionLocalizations({ vi: "Xem bảng xếp hạng XP" })
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .setDescriptionLocalizations({ vi: "Loại bảng xếp hạng" })
                .addChoices(
                    { name: "Server", value: "server" },
                    { name: "Global", value: "global" },
                    { name: "Servers", value: "servers" }
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const mode = (interaction.options.getString("mode") ?? "server") as "server" | "global" | "servers";
            if (mode === "servers") {
                await paginateServerLeaderboard(interaction, locale);
            } else {
                await paginateLeaderboard(interaction, mode, locale);
            }
        } catch {
            await interaction.editReply(t(locale, "leaderboard.error"));
        }
    },
};
