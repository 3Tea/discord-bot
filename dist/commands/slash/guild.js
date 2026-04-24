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
// src/commands/slash/guild.ts
const discord_js_1 = require("discord.js");
const character_service_1 = __importDefault(require("../../services/rpg/character.service"));
const guild_service_1 = __importStar(require("../../services/rpg/guild.service"));
const guildQuest_service_1 = __importDefault(require("../../services/rpg/guildQuest.service"));
const branch_service_1 = __importDefault(require("../../services/rpg/branch.service"));
const branch_config_1 = require("../../services/rpg/branch.config");
const rpg_config_1 = require("../../services/rpg/rpg.config");
const guildMember_model_1 = __importDefault(require("../../models/guildMember.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const guild_config_1 = require("../../services/rpg/guild.config");
const rpg_config_2 = require("../../services/rpg/rpg.config");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
// --- Helpers ---
function buildProgressBar(current, target, length = 5) {
    const filled = Math.min(length, Math.floor((current / target) * length));
    return "\u2588".repeat(filled) + "\u2591".repeat(length - filled);
}
function formatRewards(locale, rewards) {
    const parts = [];
    parts.push(`${rewards.gold}G`);
    parts.push(`${rewards.exp} EXP`);
    parts.push(`${rewards.gp} GP`);
    if (rewards.materials.length > 0) {
        for (const m of rewards.materials) {
            const mat = rpg_config_2.MATERIALS.find((mt) => mt.key === m.key);
            parts.push(`${mat?.emoji ?? ""} \u00d7${m.qty}`);
        }
    }
    if (rewards.crate) {
        parts.push(`${rpg_config_2.CRATES[rewards.crate].emoji} \u00d71`);
    }
    return parts.join(" + ");
}
function getQuestDescription(locale, quest) {
    return (0, t_1.t)(locale, `guild.quest.action.${quest.action}`, { target: String(quest.target) });
}
function getRankLabel(locale, rank) {
    return (0, t_1.t)(locale, `guild.rank.${rank}`);
}
// --- /guild register ---
async function handleRegister(interaction, locale) {
    // Character gate
    const char = await character_service_1.default.getCharacter(interaction.user.id);
    if (!char) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.require_character")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    try {
        await guild_service_1.default.register(interaction.user.id);
    }
    catch (error) {
        if (error instanceof guild_service_1.AlreadyRegisteredError) {
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "guild.already_registered")).setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
            return;
        }
        throw error;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "guild.register.title"))
        .setDescription((0, t_1.t)(locale, "guild.register.desc"))
        .setColor(0x57f287)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /guild profile ---
async function handleProfile(interaction, locale) {
    const member = await guild_service_1.default.requireMember(interaction.user.id);
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const rank = member.rank;
    const rankDef = guild_config_1.RANK_CONFIG[rank];
    const nextRank = guild_service_1.default.getNextRank(rank);
    // GP progress
    let gpDisplay;
    if (nextRank) {
        const nextDef = guild_config_1.RANK_CONFIG[nextRank];
        gpDisplay = (0, t_1.t)(locale, "guild.profile.gp_progress", {
            current: String(member.gp),
            required: String(nextDef.gpRequired),
            next: getRankLabel(locale, nextRank),
        });
    }
    else {
        gpDisplay = (0, t_1.t)(locale, "guild.profile.gp_max", { current: String(member.gp) });
    }
    // Active quests
    const date = guildQuest_service_1.default.getUTCDateString();
    const boardQuests = guildQuest_service_1.default.generateBoardQuests(date);
    const personalQuests = guildQuest_service_1.default.generatePersonalQuests(interaction.user.id, date, rank);
    const allQuests = [...boardQuests, ...personalQuests];
    let activeQuestsDisplay = (0, t_1.t)(locale, "guild.profile.no_active");
    if (member.activeQuests.length > 0) {
        const lines = [];
        for (const questId of member.activeQuests) {
            const quest = allQuests.find((q) => q.id === questId);
            if (!quest)
                continue;
            const progress = await guildQuest_service_1.default.getProgress(interaction.user.id, questId);
            const complete = guildQuest_service_1.default.isQuestComplete(progress, quest.target);
            if (complete) {
                lines.push(`${(0, t_1.t)(locale, "guild.quests.complete")} ${getQuestDescription(locale, quest)}`);
            }
            else {
                const bar = buildProgressBar(progress, quest.target);
                lines.push(`[${bar}] ${progress}/${quest.target} — ${getQuestDescription(locale, quest)}`);
            }
        }
        if (lines.length > 0)
            activeQuestsDisplay = lines.join("\n");
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "guild.profile.title", { username: interaction.user.displayName }))
        .setDescription(`${rankDef.emoji} ${getRankLabel(locale, rank)}`)
        .addFields({ name: (0, t_1.t)(locale, "guild.profile.gp"), value: gpDisplay, inline: true }, { name: (0, t_1.t)(locale, "guild.profile.quests_completed"), value: String(member.questsCompleted), inline: true }, { name: (0, t_1.t)(locale, "guild.profile.boss_kills"), value: String(char.bossKills ?? 0), inline: true }, { name: (0, t_1.t)(locale, "guild.profile.active_quests"), value: activeQuestsDisplay })
        .setColor(0x3498db)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /guild board ---
async function handleBoard(interaction, locale) {
    const member = await guild_service_1.default.requireMember(interaction.user.id);
    const rank = member.rank;
    const rankIdx = guild_config_1.ADVENTURER_RANKS.indexOf(rank);
    const date = guildQuest_service_1.default.getUTCDateString();
    const quests = guildQuest_service_1.default.generateBoardQuests(date);
    const questLines = [];
    const buttons = [];
    for (let i = 0; i < quests.length; i++) {
        const quest = quests[i];
        const reqRankIdx = guild_config_1.ADVENTURER_RANKS.indexOf(quest.rankRequirement);
        const reqDef = guild_config_1.RANK_CONFIG[quest.rankRequirement];
        const alreadyAccepted = member.activeQuests.includes(quest.id);
        const atLimit = member.activeQuests.length >= guild_config_1.MAX_ACTIVE_QUESTS;
        const rankTooLow = rankIdx < reqRankIdx;
        const desc = getQuestDescription(locale, quest);
        const rewards = formatRewards(locale, quest.rewards);
        let line = (0, t_1.t)(locale, "guild.board.quest", {
            rankEmoji: reqDef.emoji,
            rank: getRankLabel(locale, quest.rankRequirement),
            desc,
            rewards,
        });
        if (rankTooLow) {
            line += `\n${(0, t_1.t)(locale, "guild.board.locked", { rank: getRankLabel(locale, quest.rankRequirement) })}`;
        }
        else if (alreadyAccepted) {
            line += `\n${(0, t_1.t)(locale, "guild.board.accepted")}`;
        }
        else if (atLimit) {
            line += `\n${(0, t_1.t)(locale, "guild.board.full", { current: String(member.activeQuests.length), max: String(guild_config_1.MAX_ACTIVE_QUESTS) })}`;
        }
        questLines.push(line);
        const btn = new discord_js_1.ButtonBuilder()
            .setCustomId(`guild_board_accept_${i}`)
            .setLabel(`#${i + 1}`)
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setDisabled(rankTooLow || alreadyAccepted || atLimit);
        buttons.push(btn);
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "guild.board.title"))
        .setDescription(questLines.join("\n\n"))
        .setColor(0xf39c12)
        .setTimestamp();
    const row = new discord_js_1.ActionRowBuilder().addComponents(buttons);
    const message = await interaction.editReply({ embeds: [embed], components: [row] });
    // Await button interaction (60s)
    const btnInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("guild_board_accept_"),
        time: 60_000,
    })
        .catch(() => null);
    if (!btnInteraction) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const questIndex = parseInt(btnInteraction.customId.replace("guild_board_accept_", ""), 10);
    const selectedQuest = quests[questIndex];
    const accepted = await guildQuest_service_1.default.acceptQuest(interaction.user.id, selectedQuest.id);
    if (accepted) {
        const successEmbed = new discord_js_1.EmbedBuilder()
            .setDescription(`${(0, t_1.t)(locale, "guild.board.accept_success")}\n${getQuestDescription(locale, selectedQuest)}`)
            .setColor(0x57f287);
        await btnInteraction.update({ embeds: [successEmbed], components: [] });
    }
    else {
        const failEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "guild.board.full", { current: String(guild_config_1.MAX_ACTIVE_QUESTS), max: String(guild_config_1.MAX_ACTIVE_QUESTS) }))
            .setColor(0xed4245);
        await btnInteraction.update({ embeds: [failEmbed], components: [] });
    }
}
// --- /guild quests ---
async function handleQuests(interaction, locale) {
    const member = await guild_service_1.default.requireMember(interaction.user.id);
    const rank = member.rank;
    const date = guildQuest_service_1.default.getUTCDateString();
    const boardQuests = guildQuest_service_1.default.generateBoardQuests(date);
    const personalQuests = guildQuest_service_1.default.generatePersonalQuests(interaction.user.id, date, rank);
    const allQuests = [...boardQuests, ...personalQuests];
    // Active quests section
    const activeLines = [];
    const claimButtons = [];
    for (const questId of member.activeQuests) {
        const quest = allQuests.find((q) => q.id === questId);
        if (!quest)
            continue;
        const progress = await guildQuest_service_1.default.getProgress(interaction.user.id, questId);
        const complete = guildQuest_service_1.default.isQuestComplete(progress, quest.target);
        const desc = getQuestDescription(locale, quest);
        if (complete) {
            activeLines.push(`${(0, t_1.t)(locale, "guild.quests.complete")} ${desc}`);
            claimButtons.push(new discord_js_1.ButtonBuilder()
                .setCustomId(`guild_claim_${questId}`)
                .setLabel(desc.slice(0, 80))
                .setStyle(discord_js_1.ButtonStyle.Success));
        }
        else {
            const bar = buildProgressBar(progress, quest.target);
            activeLines.push((0, t_1.t)(locale, "guild.quests.progress", {
                bar,
                current: String(progress),
                target: String(quest.target),
            }) + ` ${desc}`);
        }
    }
    // Personal quests section
    const personalLines = [];
    const acceptButtons = [];
    for (let i = 0; i < personalQuests.length; i++) {
        const quest = personalQuests[i];
        const alreadyAccepted = member.activeQuests.includes(quest.id);
        const atLimit = member.activeQuests.length >= guild_config_1.MAX_ACTIVE_QUESTS;
        const desc = getQuestDescription(locale, quest);
        const rewards = formatRewards(locale, quest.rewards);
        let line = `${desc}\nReward: ${rewards}`;
        if (alreadyAccepted) {
            line += ` ${(0, t_1.t)(locale, "guild.board.accepted")}`;
        }
        personalLines.push(line);
        if (!alreadyAccepted) {
            acceptButtons.push(new discord_js_1.ButtonBuilder()
                .setCustomId(`guild_personal_accept_${i}`)
                .setLabel(`#${i + 1}`)
                .setStyle(discord_js_1.ButtonStyle.Primary)
                .setDisabled(atLimit));
        }
    }
    // Build embed
    const sections = [];
    sections.push(`**${(0, t_1.t)(locale, "guild.quests.active", { current: String(member.activeQuests.length), max: String(guild_config_1.MAX_ACTIVE_QUESTS) })}**`);
    sections.push(activeLines.length > 0 ? activeLines.join("\n") : (0, t_1.t)(locale, "guild.profile.no_active"));
    sections.push("");
    sections.push(`**${(0, t_1.t)(locale, "guild.quests.personal")}**`);
    sections.push(personalLines.length > 0 ? personalLines.join("\n\n") : (0, t_1.t)(locale, "guild.quests.no_personal"));
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "guild.quests.title"))
        .setDescription(sections.join("\n"))
        .setColor(0x3498db)
        .setTimestamp();
    // Build button rows (max 5 per row)
    const rows = [];
    const allButtons = [...claimButtons, ...acceptButtons];
    if (allButtons.length > 0) {
        // Split into rows of max 5
        for (let i = 0; i < allButtons.length; i += 5) {
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(allButtons.slice(i, i + 5)));
        }
    }
    const message = await interaction.editReply({ embeds: [embed], components: rows });
    if (allButtons.length === 0)
        return;
    // Await button interaction (60s)
    const btnInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id &&
            (i.customId.startsWith("guild_claim_") || i.customId.startsWith("guild_personal_accept_")),
        time: 60_000,
    })
        .catch(() => null);
    if (!btnInteraction) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    if (btnInteraction.customId.startsWith("guild_claim_")) {
        const questId = btnInteraction.customId.replace("guild_claim_", "");
        const result = await guildQuest_service_1.default.claimQuest(interaction.user.id, questId);
        if (!result) {
            const failEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.error")).setColor(0xed4245);
            await btnInteraction.update({ embeds: [failEmbed], components: [] });
            return;
        }
        const rewardDisplay = formatRewards(locale, result.rewards);
        const descLines = [(0, t_1.t)(locale, "guild.quests.claim_success"), "", rewardDisplay];
        if (result.rankUp.rankedUp) {
            descLines.push("");
            descLines.push((0, t_1.t)(locale, "guild.rankup", {
                oldRank: getRankLabel(locale, result.rankUp.oldRank),
                newRank: getRankLabel(locale, result.rankUp.newRank),
            }));
        }
        if (result.levelUp.leveled) {
            descLines.push((0, t_1.t)(locale, "dungeon.levelup", {
                old: String(result.levelUp.oldLevel),
                new: String(result.levelUp.newLevel),
            }));
        }
        const successEmbed = new discord_js_1.EmbedBuilder().setDescription(descLines.join("\n")).setColor(0x57f287);
        await btnInteraction.update({ embeds: [successEmbed], components: [] });
    }
    else if (btnInteraction.customId.startsWith("guild_personal_accept_")) {
        const questIndex = parseInt(btnInteraction.customId.replace("guild_personal_accept_", ""), 10);
        const selectedQuest = personalQuests[questIndex];
        const accepted = await guildQuest_service_1.default.acceptQuest(interaction.user.id, selectedQuest.id);
        if (accepted) {
            const successEmbed = new discord_js_1.EmbedBuilder()
                .setDescription(`${(0, t_1.t)(locale, "guild.board.accept_success")}\n${getQuestDescription(locale, selectedQuest)}`)
                .setColor(0x57f287);
            await btnInteraction.update({ embeds: [successEmbed], components: [] });
        }
        else {
            const failEmbed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "guild.board.full", {
                current: String(guild_config_1.MAX_ACTIVE_QUESTS),
                max: String(guild_config_1.MAX_ACTIVE_QUESTS),
            }))
                .setColor(0xed4245);
            await btnInteraction.update({ embeds: [failEmbed], components: [] });
        }
    }
}
// --- /guild ranking ---
const RANKING_PAGE_SIZE = 10;
const RANK_ORDER_MAP = Object.fromEntries(guild_config_1.ADVENTURER_RANKS.map((r, i) => [r, i]));
function getSortField(type) {
    if (type === "quests")
        return { questsCompleted: -1 };
    return { gp: -1 };
}
function getTitleKey(type) {
    return `guild.ranking.title_${type}`;
}
async function fetchServerMemberIds(interaction, guildId) {
    const cacheKey = `guild_members:${guildId}`;
    const cached = (await redis_1.default.getJson(cacheKey));
    if (cached)
        return cached;
    const members = await interaction.guild.members.fetch();
    const ids = members.map((m) => m.id);
    await redis_1.default.setJson(cacheKey, ids, 300);
    return ids;
}
async function fetchRankingPage(type, page, serverMemberIds) {
    const filter = serverMemberIds ? { userId: { $in: serverMemberIds } } : {};
    if (type === "rank") {
        // Aggregation to sort by rank ordinal (descending) then GP
        const pipeline = [
            ...(serverMemberIds ? [{ $match: { userId: { $in: serverMemberIds } } }] : []),
            {
                $addFields: {
                    rankOrder: {
                        $indexOfArray: [guild_config_1.ADVENTURER_RANKS, "$rank"],
                    },
                },
            },
            { $sort: { rankOrder: -1, gp: -1 } },
            { $skip: page * RANKING_PAGE_SIZE },
            { $limit: RANKING_PAGE_SIZE },
            { $project: { userId: 1, gp: 1, rank: 1, questsCompleted: 1, _id: 0 } },
        ];
        const entries = await guildMember_model_1.default.aggregate(pipeline);
        const totalEntries = await guildMember_model_1.default.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(totalEntries / RANKING_PAGE_SIZE));
        return { entries, totalEntries, page, totalPages };
    }
    const sort = getSortField(type);
    const totalEntries = await guildMember_model_1.default.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalEntries / RANKING_PAGE_SIZE));
    const entries = await guildMember_model_1.default.find(filter)
        .sort(sort)
        .skip(page * RANKING_PAGE_SIZE)
        .limit(RANKING_PAGE_SIZE)
        .select("userId gp rank questsCompleted")
        .lean();
    return { entries, totalEntries, page, totalPages };
}
function formatRankingEntry(locale, type, entry, position, username) {
    const rankDef = guild_config_1.RANK_CONFIG[entry.rank];
    const rankLabel = getRankLabel(locale, entry.rank);
    if (type === "gp") {
        return (0, t_1.t)(locale, "guild.ranking.entry_gp", {
            pos: String(position),
            rankEmoji: rankDef.emoji,
            username,
            gp: String(entry.gp),
            rank: rankLabel,
        });
    }
    if (type === "rank") {
        return (0, t_1.t)(locale, "guild.ranking.entry_rank", {
            pos: String(position),
            rankEmoji: rankDef.emoji,
            username,
            rank: rankLabel,
            gp: String(entry.gp),
        });
    }
    return (0, t_1.t)(locale, "guild.ranking.entry_quests", {
        pos: String(position),
        username,
        quests: String(entry.questsCompleted),
    });
}
async function getUserPosition(userId, type, serverMemberIds) {
    const userMember = await guild_service_1.default.getMember(userId);
    if (!userMember)
        return null;
    const filter = serverMemberIds ? { userId: { $in: serverMemberIds } } : {};
    if (type === "rank") {
        const rankIdx = RANK_ORDER_MAP[userMember.rank] ?? 0;
        const ahead = await guildMember_model_1.default.countDocuments({
            ...filter,
            $or: [
                { rank: { $in: guild_config_1.ADVENTURER_RANKS.filter((_, i) => i > rankIdx) } },
                { rank: userMember.rank, gp: { $gt: userMember.gp } },
            ],
        });
        return {
            position: ahead + 1,
            value: `${guild_config_1.RANK_CONFIG[userMember.rank].emoji} ${getRankLabel("en", userMember.rank)}`,
        };
    }
    if (type === "quests") {
        const ahead = await guildMember_model_1.default.countDocuments({
            ...filter,
            questsCompleted: { $gt: userMember.questsCompleted },
        });
        return { position: ahead + 1, value: `${userMember.questsCompleted} quests` };
    }
    // gp
    const ahead = await guildMember_model_1.default.countDocuments({
        ...filter,
        gp: { $gt: userMember.gp },
    });
    return { position: ahead + 1, value: `${userMember.gp} GP` };
}
function buildRankingButtons(locale, page, totalPages, serverMode, inGuild) {
    const prevBtn = new discord_js_1.ButtonBuilder()
        .setCustomId("guild_ranking_prev")
        .setEmoji("\u25c0")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(page <= 0);
    const nextBtn = new discord_js_1.ButtonBuilder()
        .setCustomId("guild_ranking_next")
        .setEmoji("\u25b6")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1);
    const toggleBtn = new discord_js_1.ButtonBuilder()
        .setCustomId("guild_ranking_toggle")
        .setLabel(serverMode ? (0, t_1.t)(locale, "guild.ranking.global") : (0, t_1.t)(locale, "guild.ranking.server"))
        .setStyle(serverMode ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Success)
        .setDisabled(!inGuild);
    return new discord_js_1.ActionRowBuilder().addComponents(prevBtn, nextBtn, toggleBtn);
}
async function buildRankingEmbed(interaction, locale, type, data, serverMode) {
    const lines = [];
    for (let i = 0; i < data.entries.length; i++) {
        const entry = data.entries[i];
        const position = data.page * RANKING_PAGE_SIZE + i + 1;
        const username = await interaction.client.users
            .fetch(entry.userId)
            .then((u) => u.username)
            .catch(() => "Unknown");
        lines.push(formatRankingEntry(locale, type, entry, position, username));
    }
    const description = lines.length > 0 ? lines.join("\n") : (0, t_1.t)(locale, "guild.ranking.empty");
    // User's own position
    const serverMemberIds = serverMode && interaction.guildId ? await fetchServerMemberIds(interaction, interaction.guildId) : undefined;
    const userPos = await getUserPosition(interaction.user.id, type, serverMemberIds);
    const userOnPage = userPos
        ? data.page * RANKING_PAGE_SIZE < userPos.position && userPos.position <= (data.page + 1) * RANKING_PAGE_SIZE
        : false;
    const sections = [description];
    if (userPos && !userOnPage) {
        sections.push("", (0, t_1.t)(locale, "guild.ranking.your_position", { pos: String(userPos.position), value: userPos.value }));
    }
    const modeLabel = serverMode ? (0, t_1.t)(locale, "guild.ranking.server") : (0, t_1.t)(locale, "guild.ranking.global");
    return new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, getTitleKey(type)))
        .setDescription(sections.join("\n"))
        .setFooter({
        text: `${modeLabel} \u2022 ${(0, t_1.t)(locale, "guild.ranking.page", { current: String(data.page + 1), total: String(data.totalPages) })}`,
    })
        .setColor(0xf1c40f)
        .setTimestamp();
}
async function handleRanking(interaction, locale) {
    const type = (interaction.options.getString("type") ?? "gp");
    let page = 0;
    let serverMode = false;
    const inGuild = !!interaction.guildId;
    let serverMemberIds;
    if (serverMode && inGuild) {
        serverMemberIds = await fetchServerMemberIds(interaction, interaction.guildId);
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
        }
        else if (btnInteraction.customId === "guild_ranking_next") {
            page = Math.min(data.totalPages - 1, page + 1);
        }
        else if (btnInteraction.customId === "guild_ranking_toggle") {
            serverMode = !serverMode;
            page = 0;
        }
        serverMemberIds =
            serverMode && inGuild ? await fetchServerMemberIds(interaction, interaction.guildId) : undefined;
        data = await fetchRankingPage(type, page, serverMemberIds);
        embed = await buildRankingEmbed(interaction, locale, type, data, serverMode);
        const updatedRow = buildRankingButtons(locale, page, data.totalPages, serverMode, inGuild);
        await btnInteraction.update({ embeds: [embed], components: [updatedRow] });
    });
    collector.on("end", () => {
        interaction.editReply({ components: [] }).catch(() => { });
    });
}
// --- /guild branch ---
function getPreviousWeekKey() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / 86400000);
    const weekNum = Math.ceil((dayOfYear + yearStart.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
async function handleBranch(interaction, locale) {
    const guildId = interaction.guildId;
    if (!guildId) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.guild_only")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check branch exists
    const branch = await branch_service_1.default.getBranch(guildId);
    if (!branch) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.not_setup")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check user is guild member
    const member = await guild_service_1.default.getMember(interaction.user.id);
    if (!member) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "guild.require_member")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Get current week quests
    const weekKey = (0, branch_config_1.getWeekKey)();
    const quests = branch_service_1.default.generateWeeklyQuests(weekKey);
    const progress = await branch_service_1.default.getWeeklyProgress(guildId, weekKey);
    // Count members and sum GP
    const memberCount = await branch_service_1.default.getMemberCountInServer(guildId);
    const gpSum = await guildMember_model_1.default.aggregate([
        { $group: { _id: null, total: { $sum: "$gp" } } },
    ]).then((res) => res[0]?.total ?? 0);
    // Build quest lines
    const questLines = [];
    let completedCount = 0;
    for (const quest of quests) {
        const scaledTarget = await branch_service_1.default.getScaledTarget(quest.baseTarget, guildId);
        const current = progress[quest.index] ?? 0;
        const isComplete = current >= scaledTarget;
        if (isComplete)
            completedCount++;
        const desc = (0, t_1.t)(locale, `guild.quest.action.${quest.action}`, { target: String(scaledTarget) });
        const bar = buildProgressBar(current, scaledTarget, 10);
        questLines.push((0, t_1.t)(locale, "branch.weekly.quest", {
            index: String(quest.index + 1),
            desc,
            bar,
            current: String(Math.min(current, scaledTarget)),
            target: String(scaledTarget),
        }));
    }
    // Progress summary
    const progressLine = completedCount >= branch_config_1.WEEKLY_QUESTS_COUNT
        ? (0, t_1.t)(locale, "branch.weekly.complete")
        : (0, t_1.t)(locale, "branch.weekly.progress", { done: String(completedCount) });
    // Build embed sections
    const sections = [
        (0, t_1.t)(locale, "branch.info.members", { total: String(memberCount) }),
        (0, t_1.t)(locale, "branch.info.total_gp", { gp: String(gpSum) }),
        "",
        `\ud83d\udccb ${(0, t_1.t)(locale, "branch.weekly.title", { week: weekKey })}:`,
        ...questLines,
        "",
        progressLine,
    ];
    // Check for last week's unclaimed rewards
    const prevWeekKey = getPreviousWeekKey();
    const prevClaimed = await branch_service_1.default.isRewardClaimed(interaction.user.id, guildId, prevWeekKey);
    if (!prevClaimed) {
        // Calculate last week's completed count
        const prevQuests = branch_service_1.default.generateWeeklyQuests(prevWeekKey);
        const prevProgress = await branch_service_1.default.getWeeklyProgress(guildId, prevWeekKey);
        let prevCompleted = 0;
        for (const pq of prevQuests) {
            const scaledTarget = await branch_service_1.default.getScaledTarget(pq.baseTarget, guildId);
            if ((prevProgress[pq.index] ?? 0) >= scaledTarget)
                prevCompleted++;
        }
        // Auto-claim
        const reward = await branch_service_1.default.claimWeeklyReward(interaction.user.id, guildId, prevWeekKey, prevCompleted);
        if (reward) {
            let rewardLine = (0, t_1.t)(locale, "branch.weekly.reward_claimed", {
                week: prevWeekKey,
                done: String(prevCompleted),
                gold: String(reward.gold),
                exp: String(reward.exp),
                gp: String(reward.gp),
            });
            if (reward.crate) {
                rewardLine += (0, t_1.t)(locale, "branch.weekly.reward_crate");
            }
            sections.push("", rewardLine);
        }
        else if (prevCompleted === 0) {
            sections.push("", (0, t_1.t)(locale, "branch.weekly.no_reward"));
        }
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "branch.info.title", { name: branch.name }))
        .setDescription(sections.join("\n"))
        .setColor(0x3498db)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /guild event ---
function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, 1));
    return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function getMedalEmoji(rank) {
    if (rank === 1)
        return "🥇";
    if (rank === 2)
        return "🥈";
    if (rank === 3)
        return "🥉";
    return "  ";
}
async function handleEvent(interaction, locale) {
    const guildId = interaction.guildId;
    if (!guildId) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.guild_only")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check branch exists
    const branch = await branch_service_1.default.getBranch(guildId);
    if (!branch) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "guild.event.no_branch")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Current month event
    const theme = (0, branch_config_1.getCurrentEventTheme)();
    const monthKey = branch_service_1.default.getMonthKey();
    const monthLabel = getMonthLabel(monthKey);
    const daysRemaining = (0, branch_config_1.getDaysRemainingInMonth)();
    const ranking = await branch_service_1.default.getEventRanking(monthKey);
    const serverEntry = ranking.find((e) => e.guildId === guildId);
    const serverRank = serverEntry ? ranking.indexOf(serverEntry) + 1 : 0;
    const sections = [];
    // Server info
    sections.push((0, t_1.t)(locale, "guild.event.your_server", { name: branch.name }));
    if (serverEntry) {
        sections.push((0, t_1.t)(locale, "guild.event.score", {
            raw: String(serverEntry.rawScore),
            perCapita: String(serverEntry.perCapita),
        }));
        sections.push((0, t_1.t)(locale, "guild.event.rank", {
            rank: String(serverRank),
            total: String(ranking.length),
        }));
    }
    else {
        sections.push((0, t_1.t)(locale, "guild.event.no_data"));
    }
    // Top 5
    sections.push("");
    if (ranking.length > 0) {
        sections.push((0, t_1.t)(locale, "guild.event.top"));
        const top5 = ranking.slice(0, 5);
        for (let i = 0; i < top5.length; i++) {
            const entry = top5[i];
            const pos = i + 1;
            sections.push((0, t_1.t)(locale, "guild.event.entry", {
                pos: String(pos),
                medal: getMedalEmoji(pos),
                name: entry.name,
                perCapita: String(entry.perCapita),
                raw: String(entry.rawScore),
                members: String(entry.memberCount),
            }));
        }
    }
    else {
        sections.push((0, t_1.t)(locale, "guild.event.no_data"));
    }
    // Days remaining
    sections.push("");
    sections.push((0, t_1.t)(locale, "guild.event.remaining", { days: String(daysRemaining) }));
    // Lazy-claim previous month rewards
    const prevMonthKey = branch_service_1.default.getPreviousMonthKey();
    const prevClaimed = await branch_service_1.default.isEventRewardClaimed(interaction.user.id, guildId, prevMonthKey);
    if (!prevClaimed) {
        const prevRanking = await branch_service_1.default.getEventRanking(prevMonthKey);
        const prevEntry = prevRanking.find((e) => e.guildId === guildId);
        const prevRank = prevEntry ? prevRanking.indexOf(prevEntry) + 1 : 0;
        if (prevRank > 0 && prevRank <= 10) {
            const reward = await branch_service_1.default.claimEventReward(interaction.user.id, guildId, prevMonthKey, prevRank);
            if (reward) {
                const prevTheme = branch_service_1.default.getPreviousEventTheme();
                const prevMonthLabel = getMonthLabel(prevMonthKey);
                let rewardLine = (0, t_1.t)(locale, "guild.event.reward_claimed", {
                    month: prevMonthLabel,
                    theme: (0, t_1.t)(locale, `guild.event.theme.${prevTheme.key}`),
                    rank: String(prevRank),
                    medal: getMedalEmoji(prevRank),
                    gold: String(reward.gold),
                    exp: String(reward.exp),
                    gp: String(reward.gp),
                });
                if (reward.crate) {
                    rewardLine += (0, t_1.t)(locale, "guild.event.reward_crate", {
                        emoji: rpg_config_1.CRATES[reward.crate].emoji,
                        crate: reward.crate.charAt(0).toUpperCase() + reward.crate.slice(1),
                    });
                }
                sections.push("", rewardLine);
            }
        }
        else if (prevRank === 0 || prevRank > 10) {
            sections.push("", (0, t_1.t)(locale, "guild.event.no_rank"));
        }
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "guild.event.title", {
        emoji: theme.emoji,
        theme: (0, t_1.t)(locale, `guild.event.theme.${theme.key}`),
        month: monthLabel,
    }))
        .setDescription(sections.join("\n"))
        .setColor(0xf1c40f)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- Command definition ---
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("guild")
        .setDescription("Adventurer Guild — quests, ranking, and rewards")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.desc"))
        .addSubcommand((sub) => sub
        .setName("register")
        .setDescription("Join the Adventurer Guild")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.register.desc")))
        .addSubcommand((sub) => sub
        .setName("profile")
        .setDescription("View your guild profile and rank")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.profile.desc")))
        .addSubcommand((sub) => sub
        .setName("board")
        .setDescription("View daily quest board")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.board.desc")))
        .addSubcommand((sub) => sub
        .setName("quests")
        .setDescription("View and manage your quests")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.quests.desc")))
        .addSubcommand((sub) => sub
        .setName("ranking")
        .setDescription("View guild leaderboard")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.ranking.desc"))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Leaderboard type")
        .addChoices({ name: "GP", value: "gp" }, { name: "Rank", value: "rank" }, { name: "Quests", value: "quests" })))
        .addSubcommand((sub) => sub
        .setName("branch")
        .setDescription("View branch guild info and weekly quests")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.branch.desc")))
        .addSubcommand((sub) => sub
        .setName("event")
        .setDescription("View monthly competitive event and server ranking")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild.event.desc"))),
    async execute(interaction) {
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
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
                case "branch":
                    await handleBranch(interaction, locale);
                    return;
                case "event":
                    await handleEvent(interaction, locale);
                    return;
                default: {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await reply_1.default.embedEdit(interaction, embed);
                }
            }
        }
        catch (error) {
            if (error instanceof guild_service_1.GuildMemberNotFoundError) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "guild.require_member")).setColor(0xed4245);
                await reply_1.default.embedEdit(interaction, embed);
                return;
            }
            if (error instanceof character_service_1.default.CharacterNotFoundError) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "adventure.require_character"))
                    .setColor(0xed4245);
                await reply_1.default.embedEdit(interaction, embed);
                return;
            }
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
        }
    },
};
