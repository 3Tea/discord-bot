// src/services/rpg/branch.service.ts
import redis from "../../connector/redis";
import BranchGuildModel, { type IBranchGuild } from "../../models/branchGuild.model";
import GuildMemberModel from "../../models/guildMember.model";
import CharacterService from "./character.service";
import GuildService from "./guild.service";
import { hashCode, mulberry32, type QuestAction } from "./guild.config";
import {
    WEEKLY_QUEST_TEMPLATES,
    WEEKLY_QUESTS_COUNT,
    WEEKLY_REWARD_TIERS,
    BRANCH_QUEST_TTL,
    scaleTarget,
    getWeekKey,
    type WeeklyQuestTemplate,
} from "./branch.config";

const BRANCH_CACHE_TTL = 300; // 5 minutes
const MEMBER_COUNT_CACHE_TTL = 300; // 5 minutes

// --- Branch Quest Type ---

export interface BranchQuest {
    index: number;
    action: QuestAction;
    baseTarget: number;
    weekKey: string;
}

// --- Branch CRUD ---

async function getBranch(guildId: string): Promise<IBranchGuild | null> {
    const cacheKey = `branch_guild:${guildId}`;
    const cached = await redis.getJson<IBranchGuild>(cacheKey);
    if (cached) return cached;

    const doc = await BranchGuildModel.findOne({ guildId });
    if (doc) {
        await redis.setJson(cacheKey, doc.toObject(), BRANCH_CACHE_TTL);
    }
    return doc;
}

async function createBranch(guildId: string, name: string): Promise<IBranchGuild> {
    const branch = await BranchGuildModel.create({ guildId, name });
    await redis.deleteKey(`branch_guild:${guildId}`);
    return branch;
}

async function deleteBranch(guildId: string): Promise<boolean> {
    const result = await BranchGuildModel.deleteOne({ guildId });
    await redis.deleteKey(`branch_guild:${guildId}`);
    await redis.deleteKey(`branch_member_count:${guildId}`);
    return result.deletedCount > 0;
}

async function setQuestChannel(guildId: string, channelId: string): Promise<void> {
    await BranchGuildModel.updateOne({ guildId }, { questChannelId: channelId });
    await redis.deleteKey(`branch_guild:${guildId}`);
}

// --- Weekly Quest Generation (deterministic) ---

function pickFromArray<T>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
}

function generateWeeklyQuests(weekKey: string): BranchQuest[] {
    const seed = hashCode(`branch_weekly_${weekKey}`);
    const rng = mulberry32(seed);
    const quests: BranchQuest[] = [];
    const usedActions = new Set<QuestAction>();

    for (let i = 0; i < WEEKLY_QUESTS_COUNT; i++) {
        // Pick a unique action for each quest
        const available = WEEKLY_QUEST_TEMPLATES.filter((t) => !usedActions.has(t.action));
        const template: WeeklyQuestTemplate = available.length > 0
            ? pickFromArray(available, rng)
            : pickFromArray(WEEKLY_QUEST_TEMPLATES, rng);

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

function questProgressKey(guildId: string, weekKey: string, questIndex: number): string {
    return `branch_quest:${guildId}:${weekKey}:${questIndex}`;
}

async function getWeeklyProgress(guildId: string, weekKey: string): Promise<number[]> {
    const progress: number[] = [];
    for (let i = 0; i < WEEKLY_QUESTS_COUNT; i++) {
        const key = questProgressKey(guildId, weekKey, i);
        const val = await redis.getJson<number>(key);
        progress.push(val ?? 0);
    }
    return progress;
}

async function trackBranchProgress(guildId: string, action: QuestAction, amount: number): Promise<void> {
    const branch = await getBranch(guildId);
    if (!branch) return;

    const weekKey = getWeekKey();
    const quests = generateWeeklyQuests(weekKey);

    for (const quest of quests) {
        if (quest.action !== action) continue;

        const key = questProgressKey(guildId, weekKey, quest.index);
        const current = (await redis.getJson<number>(key)) ?? 0;
        await redis.setJson(key, current + amount, BRANCH_QUEST_TTL);
    }
}

// --- Target Scaling ---

async function getMemberCountInServer(guildId: string): Promise<number> {
    const cacheKey = `branch_member_count:${guildId}`;
    const cached = await redis.getJson<number>(cacheKey);
    if (cached !== null) return cached;

    // Count GuildMember documents — all registered adventurers are potential branch contributors
    const total = await GuildMemberModel.countDocuments();
    // We cache a per-guild estimate; in practice this is the global adventurer count
    // The actual per-server count would require Discord API calls or a join table
    // For Phase 3A, we use a simpler heuristic: count all guild members as a baseline
    await redis.setJson(cacheKey, total, MEMBER_COUNT_CACHE_TTL);
    return total;
}

async function getScaledTarget(baseTarget: number, guildId: string): Promise<number> {
    const memberCount = await getMemberCountInServer(guildId);
    return scaleTarget(baseTarget, memberCount);
}

// --- Reward Distribution ---

function rewardClaimedKey(userId: string, guildId: string, weekKey: string): string {
    return `branch_reward_claimed:${guildId}:${weekKey}:${userId}`;
}

async function isRewardClaimed(userId: string, guildId: string, weekKey: string): Promise<boolean> {
    const val = await redis.getJson<boolean>(rewardClaimedKey(userId, guildId, weekKey));
    return val === true;
}

async function claimWeeklyReward(
    userId: string,
    guildId: string,
    weekKey: string,
    completedCount: number,
): Promise<{ gold: number; exp: number; gp: number; crate: "silver" | null } | null> {
    // Check if already claimed
    if (await isRewardClaimed(userId, guildId, weekKey)) return null;

    // Find matching reward tier (tiers sorted highest-first)
    const tier = WEEKLY_REWARD_TIERS.find((t) => completedCount >= t.minCompleted);
    if (!tier) return null;

    // Mark as claimed first to prevent race conditions
    await redis.setJson(rewardClaimedKey(userId, guildId, weekKey), true, BRANCH_QUEST_TTL);

    // Distribute rewards
    await CharacterService.addGold(userId, tier.gold);
    await CharacterService.addExp(userId, tier.exp);
    await GuildService.addGP(userId, tier.gp);

    if (tier.crate) {
        await CharacterService.addCrate(userId, tier.crate);
    }

    return { gold: tier.gold, exp: tier.exp, gp: tier.gp, crate: tier.crate };
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
    getWeekKey,
};

export default BranchService;
