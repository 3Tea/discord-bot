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
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed } from "../../util/xp/rankCard";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import type { IUser } from "../../models/user.model";

const PAGE_SIZE = 10;
const MAX_RESULTS = 100;
const IDLE_TIMEOUT = 60_000;

function buildButtons(
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
                // Not in this guild — fall through
            }
            try {
                const user = await client.users.fetch(u.userID);
                cache.set(u.userID, user.displayName);
            } catch {
                // User not fetchable — fallback handled in embed builder
            }
        })
    );
}

async function paginateGlobal(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const allUsers = await UserModel.find().sort({ totalPoint: -1 }).limit(MAX_RESULTS);
    const totalPages = Math.max(1, Math.ceil(allUsers.length / PAGE_SIZE));
    let page = 1;

    const usernameCache = new Map<string, string>();
    const getPage = (p: number): IUser[] => allUsers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

    await resolveUsernames(getPage(page), interaction, usernameCache);

    const embed = buildGlobalLeaderboardEmbed(getPage(page), usernameCache, locale, page, totalPages);
    const row = buildButtons(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    while (totalPages > 1) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) =>
                    i.user.id === interaction.user.id && (i.customId === "lb_prev" || i.customId === "lb_next"),
            });

            await i.deferUpdate();

            if (i.customId === "lb_next") page = Math.min(page + 1, totalPages);
            else page = Math.max(page - 1, 1);

            await resolveUsernames(getPage(page), interaction, usernameCache);
            const newEmbed = buildGlobalLeaderboardEmbed(getPage(page), usernameCache, locale, page, totalPages);
            const newRow = buildButtons(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed], components: [newRow] });
        } catch {
            // Timeout — disable buttons
            break;
        }
    }

    const finalEmbed = buildGlobalLeaderboardEmbed(getPage(page), usernameCache, locale, page, totalPages);
    const disabledRow = buildButtons(page, totalPages, locale, true);
    await interaction.editReply({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
}

async function paginateServer(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const guildId = interaction.guildId!;
    const allMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(MAX_RESULTS);
    const totalPages = Math.max(1, Math.ceil(allMembers.length / PAGE_SIZE));
    let page = 1;

    const guildName = interaction.guild?.name ?? "Server";
    const getPage = (p: number) => allMembers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

    const embed = buildLeaderboardEmbed(getPage(page), guildName, locale, page, totalPages);
    const row = buildButtons(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    while (totalPages > 1) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) =>
                    i.user.id === interaction.user.id && (i.customId === "lb_prev" || i.customId === "lb_next"),
            });

            await i.deferUpdate();

            if (i.customId === "lb_next") page = Math.min(page + 1, totalPages);
            else page = Math.max(page - 1, 1);

            const newEmbed = buildLeaderboardEmbed(getPage(page), guildName, locale, page, totalPages);
            const newRow = buildButtons(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed], components: [newRow] });
        } catch {
            // Timeout — disable buttons
            break;
        }
    }

    const finalEmbed = buildLeaderboardEmbed(getPage(page), guildName, locale, page, totalPages);
    const disabledRow = buildButtons(page, totalPages, locale, true);
    await interaction.editReply({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
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
                .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const mode = interaction.options.getString("mode") ?? "server";

            if (mode === "global") {
                await paginateGlobal(interaction, locale);
            } else {
                await paginateServer(interaction, locale);
            }
        } catch {
            await interaction.editReply(t(locale, "leaderboard.error"));
        }
    },
};
