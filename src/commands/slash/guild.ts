// src/commands/slash/guild.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import CharacterService from "../../services/rpg/character.service";
import GuildService, { GuildMemberNotFoundError, AlreadyRegisteredError } from "../../services/rpg/guild.service";
import GuildQuestService from "../../services/rpg/guildQuest.service";
import type { GuildQuest } from "../../services/rpg/guildQuest.service";
import GuildMemberModel from "../../models/guildMember.model";
import redis from "../../connector/redis";
import {
    ADVENTURER_RANKS,
    MAX_ACTIVE_QUESTS,
    RANK_CONFIG,
    type AdventurerRank,
} from "../../services/rpg/guild.config";
import { CRATES, MATERIALS, type CrateType } from "../../services/rpg/rpg.config";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

// --- Helpers ---

function buildProgressBar(current: number, target: number, length: number = 5): string {
    const filled = Math.min(length, Math.floor((current / target) * length));
    return "\u2588".repeat(filled) + "\u2591".repeat(length - filled);
}

function formatRewards(locale: SupportedLocale, rewards: GuildQuest["rewards"]): string {
    const parts: string[] = [];
    parts.push(`${rewards.gold}G`);
    parts.push(`${rewards.exp} EXP`);
    parts.push(`${rewards.gp} GP`);
    if (rewards.materials.length > 0) {
        for (const m of rewards.materials) {
            const mat = MATERIALS.find((mt) => mt.key === m.key);
            parts.push(`${mat?.emoji ?? ""} \u00d7${m.qty}`);
        }
    }
    if (rewards.crate) {
        parts.push(`${CRATES[rewards.crate].emoji} \u00d71`);
    }
    return parts.join(" + ");
}

function getQuestDescription(locale: SupportedLocale, quest: GuildQuest): string {
    return t(locale, `guild.quest.action.${quest.action}`, { target: String(quest.target) });
}

function getRankLabel(locale: SupportedLocale, rank: AdventurerRank): string {
    return t(locale, `guild.rank.${rank}`);
}

// --- /guild register ---

async function handleRegister(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Character gate
    const char = await CharacterService.getCharacter(interaction.user.id);
    if (!char) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.require_character"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    try {
        await GuildService.register(interaction.user.id);
    } catch (error) {
        if (error instanceof AlreadyRegisteredError) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "guild.already_registered"))
                .setColor(0xed4245);
            await Reply.embedEdit(interaction, embed);
            return;
        }
        throw error;
    }

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "guild.register.title"))
        .setDescription(t(locale, "guild.register.desc"))
        .setColor(0x57f287)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

// --- /guild profile ---

async function handleProfile(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const member = await GuildService.requireMember(interaction.user.id);
    const char = await CharacterService.requireCharacter(interaction.user.id);

    const rank = member.rank as AdventurerRank;
    const rankDef = RANK_CONFIG[rank];
    const nextRank = GuildService.getNextRank(rank);

    // GP progress
    let gpDisplay: string;
    if (nextRank) {
        const nextDef = RANK_CONFIG[nextRank];
        gpDisplay = t(locale, "guild.profile.gp_progress", {
            current: String(member.gp),
            required: String(nextDef.gpRequired),
            next: getRankLabel(locale, nextRank),
        });
    } else {
        gpDisplay = t(locale, "guild.profile.gp_max", { current: String(member.gp) });
    }

    // Active quests
    const date = GuildQuestService.getUTCDateString();
    const boardQuests = GuildQuestService.generateBoardQuests(date);
    const personalQuests = GuildQuestService.generatePersonalQuests(interaction.user.id, date, rank);
    const allQuests = [...boardQuests, ...personalQuests];

    let activeQuestsDisplay = t(locale, "guild.profile.no_active");
    if (member.activeQuests.length > 0) {
        const lines: string[] = [];
        for (const questId of member.activeQuests) {
            const quest = allQuests.find((q) => q.id === questId);
            if (!quest) continue;
            const progress = await GuildQuestService.getProgress(interaction.user.id, questId);
            const complete = GuildQuestService.isQuestComplete(progress, quest.target);
            if (complete) {
                lines.push(`${t(locale, "guild.quests.complete")} ${getQuestDescription(locale, quest)}`);
            } else {
                const bar = buildProgressBar(progress, quest.target);
                lines.push(`[${bar}] ${progress}/${quest.target} — ${getQuestDescription(locale, quest)}`);
            }
        }
        if (lines.length > 0) activeQuestsDisplay = lines.join("\n");
    }

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "guild.profile.title", { username: interaction.user.displayName }))
        .setDescription(`${rankDef.emoji} ${getRankLabel(locale, rank)}`)
        .addFields(
            { name: t(locale, "guild.profile.gp"), value: gpDisplay, inline: true },
            { name: t(locale, "guild.profile.quests_completed"), value: String(member.questsCompleted), inline: true },
            { name: t(locale, "guild.profile.boss_kills"), value: String(char.bossKills ?? 0), inline: true },
            { name: t(locale, "guild.profile.active_quests"), value: activeQuestsDisplay }
        )
        .setColor(0x3498db)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

// --- /guild board ---

async function handleBoard(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const member = await GuildService.requireMember(interaction.user.id);
    const rank = member.rank as AdventurerRank;
    const rankIdx = ADVENTURER_RANKS.indexOf(rank);

    const date = GuildQuestService.getUTCDateString();
    const quests = GuildQuestService.generateBoardQuests(date);

    const questLines: string[] = [];
    const buttons: ButtonBuilder[] = [];

    for (let i = 0; i < quests.length; i++) {
        const quest = quests[i];
        const reqRankIdx = ADVENTURER_RANKS.indexOf(quest.rankRequirement);
        const reqDef = RANK_CONFIG[quest.rankRequirement];
        const alreadyAccepted = member.activeQuests.includes(quest.id);
        const atLimit = member.activeQuests.length >= MAX_ACTIVE_QUESTS;
        const rankTooLow = rankIdx < reqRankIdx;

        const desc = getQuestDescription(locale, quest);
        const rewards = formatRewards(locale, quest.rewards);

        let line = t(locale, "guild.board.quest", {
            rankEmoji: reqDef.emoji,
            rank: getRankLabel(locale, quest.rankRequirement),
            desc,
            rewards,
        });

        if (rankTooLow) {
            line += `\n${t(locale, "guild.board.locked", { rank: getRankLabel(locale, quest.rankRequirement) })}`;
        } else if (alreadyAccepted) {
            line += `\n${t(locale, "guild.board.accepted")}`;
        } else if (atLimit) {
            line += `\n${t(locale, "guild.board.full", { current: String(member.activeQuests.length), max: String(MAX_ACTIVE_QUESTS) })}`;
        }

        questLines.push(line);

        const btn = new ButtonBuilder()
            .setCustomId(`guild_board_accept_${i}`)
            .setLabel(`#${i + 1}`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(rankTooLow || alreadyAccepted || atLimit);
        buttons.push(btn);
    }

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "guild.board.title"))
        .setDescription(questLines.join("\n\n"))
        .setColor(0xf39c12)
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    // Await button interaction (60s)
    const btnInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("guild_board_accept_"),
            time: 60_000,
        })
        .catch(() => null);

    if (!btnInteraction) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const questIndex = parseInt(btnInteraction.customId.replace("guild_board_accept_", ""), 10);
    const selectedQuest = quests[questIndex];

    const accepted = await GuildQuestService.acceptQuest(interaction.user.id, selectedQuest.id);

    if (accepted) {
        const successEmbed = new EmbedBuilder()
            .setDescription(`${t(locale, "guild.board.accept_success")}\n${getQuestDescription(locale, selectedQuest)}`)
            .setColor(0x57f287);
        await btnInteraction.update({ embeds: [successEmbed], components: [] });
    } else {
        const failEmbed = new EmbedBuilder()
            .setDescription(t(locale, "guild.board.full", { current: String(MAX_ACTIVE_QUESTS), max: String(MAX_ACTIVE_QUESTS) }))
            .setColor(0xed4245);
        await btnInteraction.update({ embeds: [failEmbed], components: [] });
    }
}

// --- /guild quests ---

async function handleQuests(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const member = await GuildService.requireMember(interaction.user.id);
    const rank = member.rank as AdventurerRank;

    const date = GuildQuestService.getUTCDateString();
    const boardQuests = GuildQuestService.generateBoardQuests(date);
    const personalQuests = GuildQuestService.generatePersonalQuests(interaction.user.id, date, rank);
    const allQuests = [...boardQuests, ...personalQuests];

    // Active quests section
    const activeLines: string[] = [];
    const claimButtons: ButtonBuilder[] = [];

    for (const questId of member.activeQuests) {
        const quest = allQuests.find((q) => q.id === questId);
        if (!quest) continue;

        const progress = await GuildQuestService.getProgress(interaction.user.id, questId);
        const complete = GuildQuestService.isQuestComplete(progress, quest.target);
        const desc = getQuestDescription(locale, quest);

        if (complete) {
            activeLines.push(`${t(locale, "guild.quests.complete")} ${desc}`);
            claimButtons.push(
                new ButtonBuilder()
                    .setCustomId(`guild_claim_${questId}`)
                    .setLabel(desc.slice(0, 80))
                    .setStyle(ButtonStyle.Success)
            );
        } else {
            const bar = buildProgressBar(progress, quest.target);
            activeLines.push(
                t(locale, "guild.quests.progress", {
                    bar,
                    current: String(progress),
                    target: String(quest.target),
                }) + ` ${desc}`
            );
        }
    }

    // Personal quests section
    const personalLines: string[] = [];
    const acceptButtons: ButtonBuilder[] = [];

    for (let i = 0; i < personalQuests.length; i++) {
        const quest = personalQuests[i];
        const alreadyAccepted = member.activeQuests.includes(quest.id);
        const atLimit = member.activeQuests.length >= MAX_ACTIVE_QUESTS;
        const desc = getQuestDescription(locale, quest);
        const rewards = formatRewards(locale, quest.rewards);

        let line = `${desc}\nReward: ${rewards}`;
        if (alreadyAccepted) {
            line += ` ${t(locale, "guild.board.accepted")}`;
        }
        personalLines.push(line);

        if (!alreadyAccepted) {
            acceptButtons.push(
                new ButtonBuilder()
                    .setCustomId(`guild_personal_accept_${i}`)
                    .setLabel(`#${i + 1}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(atLimit)
            );
        }
    }

    // Build embed
    const sections: string[] = [];

    sections.push(`**${t(locale, "guild.quests.active", { current: String(member.activeQuests.length), max: String(MAX_ACTIVE_QUESTS) })}**`);
    sections.push(activeLines.length > 0 ? activeLines.join("\n") : t(locale, "guild.profile.no_active"));
    sections.push("");
    sections.push(`**${t(locale, "guild.quests.personal")}**`);
    sections.push(personalLines.length > 0 ? personalLines.join("\n\n") : t(locale, "guild.quests.no_personal"));

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "guild.quests.title"))
        .setDescription(sections.join("\n"))
        .setColor(0x3498db)
        .setTimestamp();

    // Build button rows (max 5 per row)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const allButtons = [...claimButtons, ...acceptButtons];
    if (allButtons.length > 0) {
        // Split into rows of max 5
        for (let i = 0; i < allButtons.length; i += 5) {
            rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(allButtons.slice(i, i + 5)));
        }
    }

    const message = await interaction.editReply({ embeds: [embed], components: rows });

    if (allButtons.length === 0) return;

    // Await button interaction (60s)
    const btnInteraction = await message
        .awaitMessageComponent({
            filter: (i) =>
                i.user.id === interaction.user.id &&
                (i.customId.startsWith("guild_claim_") || i.customId.startsWith("guild_personal_accept_")),
            time: 60_000,
        })
        .catch(() => null);

    if (!btnInteraction) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    if (btnInteraction.customId.startsWith("guild_claim_")) {
        const questId = btnInteraction.customId.replace("guild_claim_", "");
        const result = await GuildQuestService.claimQuest(interaction.user.id, questId);

        if (!result) {
            const failEmbed = new EmbedBuilder()
                .setDescription(t(locale, "common.error"))
                .setColor(0xed4245);
            await btnInteraction.update({ embeds: [failEmbed], components: [] });
            return;
        }

        const rewardDisplay = formatRewards(locale, result.rewards);
        const descLines = [t(locale, "guild.quests.claim_success"), "", rewardDisplay];

        if (result.rankUp.rankedUp) {
            descLines.push("");
            descLines.push(
                t(locale, "guild.rankup", {
                    oldRank: getRankLabel(locale, result.rankUp.oldRank),
                    newRank: getRankLabel(locale, result.rankUp.newRank),
                })
            );
        }

        if (result.levelUp.leveled) {
            descLines.push(
                t(locale, "dungeon.levelup", {
                    old: String(result.levelUp.oldLevel),
                    new: String(result.levelUp.newLevel),
                })
            );
        }

        const successEmbed = new EmbedBuilder()
            .setDescription(descLines.join("\n"))
            .setColor(0x57f287);
        await btnInteraction.update({ embeds: [successEmbed], components: [] });
    } else if (btnInteraction.customId.startsWith("guild_personal_accept_")) {
        const questIndex = parseInt(btnInteraction.customId.replace("guild_personal_accept_", ""), 10);
        const selectedQuest = personalQuests[questIndex];

        const accepted = await GuildQuestService.acceptQuest(interaction.user.id, selectedQuest.id);

        if (accepted) {
            const successEmbed = new EmbedBuilder()
                .setDescription(`${t(locale, "guild.board.accept_success")}\n${getQuestDescription(locale, selectedQuest)}`)
                .setColor(0x57f287);
            await btnInteraction.update({ embeds: [successEmbed], components: [] });
        } else {
            const failEmbed = new EmbedBuilder()
                .setDescription(t(locale, "guild.board.full", { current: String(MAX_ACTIVE_QUESTS), max: String(MAX_ACTIVE_QUESTS) }))
                .setColor(0xed4245);
            await btnInteraction.update({ embeds: [failEmbed], components: [] });
        }
    }
}

// --- /guild ranking ---

const RANKING_PAGE_SIZE = 10;
const RANK_ORDER_MAP: Record<string, number> = Object.fromEntries(
    ADVENTURER_RANKS.map((r, i) => [r, i])
);

type RankingType = "gp" | "rank" | "quests";

interface RankingPage {
    entries: { userId: string; gp: number; rank: AdventurerRank; questsCompleted: number }[];
    totalEntries: number;
    page: number;
    totalPages: number;
}

function getSortField(type: RankingType): Record<string, -1> {
    if (type === "quests") return { questsCompleted: -1 };
    return { gp: -1 };
}

function getTitleKey(type: RankingType): string {
    return `guild.ranking.title_${type}`;
}

async function fetchServerMemberIds(interaction: ChatInputCommandInteraction, guildId: string): Promise<string[]> {
    const cacheKey = `guild_members:${guildId}`;
    const cached = await redis.getJson(cacheKey) as string[] | null;
    if (cached) return cached;

    const members = await interaction.guild!.members.fetch();
    const ids = members.map((m) => m.id);
    await redis.setJson(cacheKey, ids, 300);
    return ids;
}

async function fetchRankingPage(
    type: RankingType,
    page: number,
    serverMemberIds?: string[]
): Promise<RankingPage> {
    const filter = serverMemberIds ? { userId: { $in: serverMemberIds } } : {};

    if (type === "rank") {
        // Aggregation to sort by rank ordinal (descending) then GP
        const pipeline = [
            ...(serverMemberIds ? [{ $match: { userId: { $in: serverMemberIds } } }] : []),
            {
                $addFields: {
                    rankOrder: {
                        $indexOfArray: [ADVENTURER_RANKS as unknown as string[], "$rank"],
                    },
                },
            },
            { $sort: { rankOrder: -1, gp: -1 } as Record<string, 1 | -1> },
            { $skip: page * RANKING_PAGE_SIZE },
            { $limit: RANKING_PAGE_SIZE },
            { $project: { userId: 1, gp: 1, rank: 1, questsCompleted: 1, _id: 0 } },
        ];

        const entries = await GuildMemberModel.aggregate<RankingPage["entries"][number]>(pipeline);
        const totalEntries = await GuildMemberModel.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(totalEntries / RANKING_PAGE_SIZE));

        return { entries, totalEntries, page, totalPages };
    }

    const sort = getSortField(type);
    const totalEntries = await GuildMemberModel.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalEntries / RANKING_PAGE_SIZE));

    const entries = await GuildMemberModel.find(filter)
        .sort(sort)
        .skip(page * RANKING_PAGE_SIZE)
        .limit(RANKING_PAGE_SIZE)
        .select("userId gp rank questsCompleted")
        .lean();

    return { entries, totalEntries, page, totalPages };
}

function formatRankingEntry(
    locale: SupportedLocale,
    type: RankingType,
    entry: RankingPage["entries"][number],
    position: number,
    username: string
): string {
    const rankDef = RANK_CONFIG[entry.rank];
    const rankLabel = getRankLabel(locale, entry.rank);

    if (type === "gp") {
        return t(locale, "guild.ranking.entry_gp", {
            pos: String(position),
            rankEmoji: rankDef.emoji,
            username,
            gp: String(entry.gp),
            rank: rankLabel,
        });
    }
    if (type === "rank") {
        return t(locale, "guild.ranking.entry_rank", {
            pos: String(position),
            rankEmoji: rankDef.emoji,
            username,
            rank: rankLabel,
            gp: String(entry.gp),
        });
    }
    return t(locale, "guild.ranking.entry_quests", {
        pos: String(position),
        username,
        quests: String(entry.questsCompleted),
    });
}

async function getUserPosition(
    userId: string,
    type: RankingType,
    serverMemberIds?: string[]
): Promise<{ position: number; value: string } | null> {
    const userMember = await GuildService.getMember(userId);
    if (!userMember) return null;

    const filter = serverMemberIds ? { userId: { $in: serverMemberIds } } : {};

    if (type === "rank") {
        const rankIdx = RANK_ORDER_MAP[userMember.rank] ?? 0;
        const ahead = await GuildMemberModel.countDocuments({
            ...filter,
            $or: [
                { rank: { $in: ADVENTURER_RANKS.filter((_, i) => i > rankIdx) } },
                { rank: userMember.rank, gp: { $gt: userMember.gp } },
            ],
        });
        return { position: ahead + 1, value: `${RANK_CONFIG[userMember.rank as AdventurerRank].emoji} ${getRankLabel("en", userMember.rank as AdventurerRank)}` };
    }

    if (type === "quests") {
        const ahead = await GuildMemberModel.countDocuments({
            ...filter,
            questsCompleted: { $gt: userMember.questsCompleted },
        });
        return { position: ahead + 1, value: `${userMember.questsCompleted} quests` };
    }

    // gp
    const ahead = await GuildMemberModel.countDocuments({
        ...filter,
        gp: { $gt: userMember.gp },
    });
    return { position: ahead + 1, value: `${userMember.gp} GP` };
}

function buildRankingButtons(
    locale: SupportedLocale,
    page: number,
    totalPages: number,
    serverMode: boolean,
    inGuild: boolean
): ActionRowBuilder<ButtonBuilder> {
    const prevBtn = new ButtonBuilder()
        .setCustomId("guild_ranking_prev")
        .setEmoji("\u25c0")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0);

    const nextBtn = new ButtonBuilder()
        .setCustomId("guild_ranking_next")
        .setEmoji("\u25b6")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1);

    const toggleBtn = new ButtonBuilder()
        .setCustomId("guild_ranking_toggle")
        .setLabel(serverMode ? t(locale, "guild.ranking.global") : t(locale, "guild.ranking.server"))
        .setStyle(serverMode ? ButtonStyle.Primary : ButtonStyle.Success)
        .setDisabled(!inGuild);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, nextBtn, toggleBtn);
}

async function buildRankingEmbed(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    type: RankingType,
    data: RankingPage,
    serverMode: boolean
): Promise<EmbedBuilder> {
    const lines: string[] = [];

    for (let i = 0; i < data.entries.length; i++) {
        const entry = data.entries[i];
        const position = data.page * RANKING_PAGE_SIZE + i + 1;
        const username = await interaction.client.users
            .fetch(entry.userId)
            .then((u) => u.username)
            .catch(() => "Unknown");
        lines.push(formatRankingEntry(locale, type, entry, position, username));
    }

    const description = lines.length > 0 ? lines.join("\n") : t(locale, "guild.ranking.empty");

    // User's own position
    const serverMemberIds = serverMode && interaction.guildId
        ? await fetchServerMemberIds(interaction, interaction.guildId)
        : undefined;
    const userPos = await getUserPosition(interaction.user.id, type, serverMemberIds);
    const userOnPage = userPos
        ? data.page * RANKING_PAGE_SIZE < userPos.position && userPos.position <= (data.page + 1) * RANKING_PAGE_SIZE
        : false;

    const sections = [description];
    if (userPos && !userOnPage) {
        sections.push("", t(locale, "guild.ranking.your_position", { pos: String(userPos.position), value: userPos.value }));
    }

    const modeLabel = serverMode ? t(locale, "guild.ranking.server") : t(locale, "guild.ranking.global");

    return new EmbedBuilder()
        .setTitle(t(locale, getTitleKey(type)))
        .setDescription(sections.join("\n"))
        .setFooter({ text: `${modeLabel} \u2022 ${t(locale, "guild.ranking.page", { current: String(data.page + 1), total: String(data.totalPages) })}` })
        .setColor(0xf1c40f)
        .setTimestamp();
}

async function handleRanking(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const type = (interaction.options.getString("type") ?? "gp") as RankingType;
    let page = 0;
    let serverMode = false;
    const inGuild = !!interaction.guildId;

    let serverMemberIds: string[] | undefined;
    if (serverMode && inGuild) {
        serverMemberIds = await fetchServerMemberIds(interaction, interaction.guildId!);
    }

    let data = await fetchRankingPage(type, page, serverMemberIds);
    let embed = await buildRankingEmbed(interaction, locale, type, data, serverMode);
    const row = buildRankingButtons(locale, page, data.totalPages, serverMode, inGuild);

    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("guild_ranking_"),
        idle: 60_000,
    });

    collector.on("collect", async (btnInteraction) => {
        if (btnInteraction.customId === "guild_ranking_prev") {
            page = Math.max(0, page - 1);
        } else if (btnInteraction.customId === "guild_ranking_next") {
            page = Math.min(data.totalPages - 1, page + 1);
        } else if (btnInteraction.customId === "guild_ranking_toggle") {
            serverMode = !serverMode;
            page = 0;
        }

        serverMemberIds = serverMode && inGuild
            ? await fetchServerMemberIds(interaction, interaction.guildId!)
            : undefined;

        data = await fetchRankingPage(type, page, serverMemberIds);
        embed = await buildRankingEmbed(interaction, locale, type, data, serverMode);
        const updatedRow = buildRankingButtons(locale, page, data.totalPages, serverMode, inGuild);

        await btnInteraction.update({ embeds: [embed], components: [updatedRow] });
    });

    collector.on("end", () => {
        interaction.editReply({ components: [] }).catch(() => {});
    });
}

// --- Command definition ---

export default {
    data: new SlashCommandBuilder()
        .setName("guild")
        .setDescription("Adventurer Guild — quests, ranking, and rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.guild.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("register")
                .setDescription("Join the Adventurer Guild")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild.register.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("profile")
                .setDescription("View your guild profile and rank")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild.profile.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("board")
                .setDescription("View daily quest board")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild.board.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("quests")
                .setDescription("View and manage your quests")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild.quests.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("ranking")
                .setDescription("View guild leaderboard")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild.ranking.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Leaderboard type")
                        .addChoices(
                            { name: "GP", value: "gp" },
                            { name: "Rank", value: "rank" },
                            { name: "Quests", value: "quests" }
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const subcommand = interaction.options.getSubcommand(true);

        try {
            switch (subcommand) {
                case "register":
                    await handleRegister(interaction, locale);
                    return;
                case "profile":
                    await handleProfile(interaction, locale);
                    return;
                case "board":
                    await handleBoard(interaction, locale);
                    return;
                case "quests":
                    await handleQuests(interaction, locale);
                    return;
                case "ranking":
                    await handleRanking(interaction, locale);
                    return;
                default: {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await Reply.embedEdit(interaction, embed);
                }
            }
        } catch (error) {
            if (error instanceof GuildMemberNotFoundError) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "guild.require_member"))
                    .setColor(0xed4245);
                await Reply.embedEdit(interaction, embed);
                return;
            }
            if (error instanceof CharacterService.CharacterNotFoundError) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "adventure.require_character"))
                    .setColor(0xed4245);
                await Reply.embedEdit(interaction, embed);
                return;
            }
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            await Reply.embedEdit(interaction, embed);
        }
    },
};
