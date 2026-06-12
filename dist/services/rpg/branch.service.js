"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/rpg/branch.service.ts
const redis_1 = __importDefault(require("../../connector/redis"));
const branchGuild_model_1 = __importDefault(require("../../models/branchGuild.model"));
const guildMember_model_1 = __importDefault(require("../../models/guildMember.model"));
const character_service_1 = __importDefault(require("./character.service"));
const guild_service_1 = __importDefault(require("./guild.service"));
const guild_config_1 = require("./guild.config");
const branch_config_1 = require("./branch.config");
const BRANCH_CACHE_TTL = 300; // 5 minutes
const MEMBER_COUNT_CACHE_TTL = 300; // 5 minutes
// --- Branch CRUD ---
async function getBranch(guildId) {
    const cacheKey = `branch_guild:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const doc = await branchGuild_model_1.default.findOne({ guildId });
    if (doc) {
        await redis_1.default.setJson(cacheKey, doc.toObject(), BRANCH_CACHE_TTL);
    }
    return doc;
}
async function createBranch(guildId, name) {
    const branch = await branchGuild_model_1.default.create({ guildId, name });
    await redis_1.default.deleteKey(`branch_guild:${guildId}`);
    return branch;
}
async function deleteBranch(guildId) {
    const result = await branchGuild_model_1.default.deleteOne({ guildId });
    await redis_1.default.deleteKey(`branch_guild:${guildId}`);
    await redis_1.default.deleteKey(`branch_member_count:${guildId}`);
    return result.deletedCount > 0;
}
async function setQuestChannel(guildId, channelId) {
    await branchGuild_model_1.default.updateOne({ guildId }, { questChannelId: channelId });
    await redis_1.default.deleteKey(`branch_guild:${guildId}`);
}
// --- Weekly Quest Generation (deterministic) ---
function pickFromArray(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}
function generateWeeklyQuests(weekKey) {
    const seed = (0, guild_config_1.hashCode)(`branch_weekly_${weekKey}`);
    const rng = (0, guild_config_1.mulberry32)(seed);
    const quests = [];
    const usedActions = new Set();
    for (let i = 0; i < branch_config_1.WEEKLY_QUESTS_COUNT; i++) {
        // Pick a unique action for each quest
        const available = branch_config_1.WEEKLY_QUEST_TEMPLATES.filter((t) => !usedActions.has(t.action));
        const template = available.length > 0 ? pickFromArray(available, rng) : pickFromArray(branch_config_1.WEEKLY_QUEST_TEMPLATES, rng);
        usedActions.add(template.action);
        quests.push({
            index: i,
            action: template.action,
            baseTarget: template.baseTarget,
            weekKey,
        });
    }
    return quests;
}
// --- Progress Tracking ---
function questProgressKey(guildId, weekKey, questIndex) {
    return `branch_quest:${guildId}:${weekKey}:${questIndex}`;
}
async function getWeeklyProgress(guildId, weekKey) {
    const progress = [];
    for (let i = 0; i < branch_config_1.WEEKLY_QUESTS_COUNT; i++) {
        const key = questProgressKey(guildId, weekKey, i);
        const val = await redis_1.default.getJson(key);
        progress.push(val ?? 0);
    }
    return progress;
}
async function trackBranchProgress(guildId, action, amount) {
    const branch = await getBranch(guildId);
    if (!branch)
        return;
    const weekKey = (0, branch_config_1.getWeekKey)();
    const quests = generateWeeklyQuests(weekKey);
    for (const quest of quests) {
        if (quest.action !== action)
            continue;
        const key = questProgressKey(guildId, weekKey, quest.index);
        const current = (await redis_1.default.getJson(key)) ?? 0;
        await redis_1.default.setJson(key, current + amount, branch_config_1.BRANCH_QUEST_TTL);
    }
    // Track monthly event progress
    await trackEventProgress(guildId, action, amount);
}
// --- Target Scaling ---
async function getMemberCountInServer(guildId) {
    const cacheKey = `branch_member_count:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached !== null)
        return cached;
    // Count GuildMember documents — all registered adventurers are potential branch contributors
    const total = await guildMember_model_1.default.countDocuments();
    // We cache a per-guild estimate; in practice this is the global adventurer count
    // The actual per-server count would require Discord API calls or a join table
    // For Phase 3A, we use a simpler heuristic: count all guild members as a baseline
    await redis_1.default.setJson(cacheKey, total, MEMBER_COUNT_CACHE_TTL);
    return total;
}
async function getScaledTarget(baseTarget, guildId) {
    const memberCount = await getMemberCountInServer(guildId);
    return (0, branch_config_1.scaleTarget)(baseTarget, memberCount);
}
// --- Reward Distribution ---
function rewardClaimedKey(userId, guildId, weekKey) {
    return `branch_reward_claimed:${guildId}:${weekKey}:${userId}`;
}
async function isRewardClaimed(userId, guildId, weekKey) {
    const val = await redis_1.default.getJson(rewardClaimedKey(userId, guildId, weekKey));
    return val === true;
}
async function claimWeeklyReward(userId, guildId, weekKey, completedCount) {
    // Check if already claimed
    if (await isRewardClaimed(userId, guildId, weekKey))
        return null;
    // Find matching reward tier (tiers sorted highest-first)
    const tier = branch_config_1.WEEKLY_REWARD_TIERS.find((t) => completedCount >= t.minCompleted);
    if (!tier)
        return null;
    // Mark as claimed first to prevent race conditions
    await redis_1.default.setJson(rewardClaimedKey(userId, guildId, weekKey), true, branch_config_1.BRANCH_QUEST_TTL);
    // Distribute rewards
    await character_service_1.default.addGold(userId, tier.gold);
    await character_service_1.default.addExp(userId, tier.exp);
    await guild_service_1.default.addGP(userId, tier.gp);
    if (tier.crate) {
        await character_service_1.default.addCrate(userId, tier.crate);
    }
    return { gold: tier.gold, exp: tier.exp, gp: tier.gp, crate: tier.crate };
}
// --- Monthly Event Functions ---
function eventScoreKey(guildId, monthKey) {
    return `branch_event:${guildId}:${monthKey}`;
}
function eventRewardClaimedKey(userId, guildId, monthKey) {
    return `event_reward_claimed:${guildId}:${monthKey}:${userId}`;
}
async function trackEventProgress(guildId, action, amount) {
    const theme = (0, branch_config_1.getCurrentEventTheme)();
    if (theme.action !== action)
        return;
    const monthKey = (0, branch_config_1.getMonthKey)();
    const key = eventScoreKey(guildId, monthKey);
    const current = (await redis_1.default.getJson(key)) ?? 0;
    await redis_1.default.setJson(key, current + amount, branch_config_1.EVENT_SCORE_TTL);
}
async function getEventScore(guildId, monthKey) {
    const key = eventScoreKey(guildId, monthKey);
    return (await redis_1.default.getJson(key)) ?? 0;
}
async function getEventRanking(monthKey) {
    const branches = await branchGuild_model_1.default.find().lean();
    const entries = [];
    for (const branch of branches) {
        const rawScore = await getEventScore(branch.guildId, monthKey);
        if (rawScore <= 0)
            continue;
        const memberCount = await getMemberCountInServer(branch.guildId);
        const safeCount = Math.max(1, memberCount);
        entries.push({
            guildId: branch.guildId,
            name: branch.name,
            rawScore,
            memberCount: safeCount,
            perCapita: Math.round((rawScore / safeCount) * 10) / 10,
        });
    }
    // Sort by perCapita desc, then rawScore desc as tiebreaker
    entries.sort((a, b) => b.perCapita - a.perCapita || b.rawScore - a.rawScore);
    return entries;
}
async function claimEventReward(userId, guildId, monthKey, rank) {
    if (await isEventRewardClaimed(userId, guildId, monthKey))
        return null;
    const tier = branch_config_1.EVENT_REWARD_TIERS.find((t) => rank <= t.maxRank);
    if (!tier)
        return null;
    // Mark as claimed first to prevent race conditions
    await redis_1.default.setJson(eventRewardClaimedKey(userId, guildId, monthKey), true, branch_config_1.EVENT_SCORE_TTL);
    // Distribute rewards
    await character_service_1.default.addGold(userId, tier.gold);
    await character_service_1.default.addExp(userId, tier.exp);
    await guild_service_1.default.addGP(userId, tier.gp);
    if (tier.crate) {
        await character_service_1.default.addCrate(userId, tier.crate);
    }
    return tier;
}
async function isEventRewardClaimed(userId, guildId, monthKey) {
    const val = await redis_1.default.getJson(eventRewardClaimedKey(userId, guildId, monthKey));
    return val === true;
}
function getPreviousMonthKey() {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 1);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function getPreviousEventTheme() {
    const d = new Date();
    const prevMonth = (d.getUTCMonth() + 11) % 12; // 0-11
    return branch_config_1.EVENT_THEMES[prevMonth % branch_config_1.EVENT_THEMES.length];
}
const BranchService = {
    getBranch,
    createBranch,
    deleteBranch,
    setQuestChannel,
    generateWeeklyQuests,
    getWeeklyProgress,
    trackBranchProgress,
    getScaledTarget,
    getMemberCountInServer,
    claimWeeklyReward,
    isRewardClaimed,
    getWeekKey: branch_config_1.getWeekKey,
    // Monthly events
    getEventScore,
    getEventRanking,
    claimEventReward,
    isEventRewardClaimed,
    getMonthKey: branch_config_1.getMonthKey,
    getPreviousMonthKey,
    getPreviousEventTheme,
};
exports.default = BranchService;
