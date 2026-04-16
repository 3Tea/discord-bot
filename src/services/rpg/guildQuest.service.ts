// src/services/rpg/guildQuest.service.ts
import redis from "../../connector/redis";
import GuildMemberModel from "../../models/guildMember.model";
import CharacterService from "./character.service";
import GuildService from "./guild.service";
import {
    QUEST_TEMPLATES,
    REWARD_SCALING,
    BOARD_QUEST_RANKS,
    DAILY_BOARD_QUESTS,
    DAILY_PERSONAL_QUESTS,
    MAX_ACTIVE_QUESTS,
    ADVENTURER_RANKS,
    hashCode,
    mulberry32,
    type AdventurerRank,
    type QuestAction,
    type QuestTemplate,
} from "./guild.config";
import { MATERIALS, type CrateType } from "./rpg.config";

const QUEST_PROGRESS_TTL = 86400; // 24 hours

// --- Quest Types ---

export interface GuildQuest {
    id: string;
    type: "board" | "personal";
    action: QuestAction;
    target: number;
    rewards: {
        gold: number;
        exp: number;
        gp: number;
        materials: { key: string; qty: number }[];
        crate: CrateType | null;
    };
    rankRequirement: AdventurerRank;
}

// --- Deterministic Quest Generation ---

function getUTCDateString(): string {
    return new Date().toISOString().split("T")[0];
}

function pickFromArray<T>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
}

function randomInRangeSeeded(min: number, max: number, rng: () => number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function generateRewards(template: QuestTemplate, rank: AdventurerRank, rng: () => number): GuildQuest["rewards"] {
    const scale = REWARD_SCALING[rank];
    const gold = Math.floor(template.baseGold * scale.goldMultiplier);
    const exp = Math.floor(template.baseExp * scale.expMultiplier);
    const gp = scale.gpPerQuest;

    const materials: { key: string; qty: number }[] = [];
    if (rng() < scale.materialChance) {
        // Pick a material tier based on rank
        const rankIdx = ADVENTURER_RANKS.indexOf(rank);
        const maxMatIdx = Math.min(rankIdx, MATERIALS.length - 1);
        const matIdx = Math.floor(rng() * (maxMatIdx + 1));
        const mat = MATERIALS[MATERIALS.length - 1 - matIdx]; // MATERIALS is ordered high→low, so reverse
        materials.push({ key: mat.key, qty: randomInRangeSeeded(1, 3, rng) });
    }

    let crate: CrateType | null = null;
    if (rng() < scale.crateChance) {
        const rankIdx = ADVENTURER_RANKS.indexOf(rank);
        if (rankIdx >= 7) crate = "gold";       // SS+
        else if (rankIdx >= 4) crate = "silver"; // B-S
        else crate = "bronze";                    // F-A
    }

    return { gold, exp, gp, materials, crate };
}

function generateBoardQuests(date: string): GuildQuest[] {
    const seed = hashCode(`board_${date}`);
    const rng = mulberry32(seed);
    const quests: GuildQuest[] = [];

    for (let i = 0; i < DAILY_BOARD_QUESTS; i++) {
        const rank = BOARD_QUEST_RANKS[i];
        const template = pickFromArray(QUEST_TEMPLATES, rng);
        const targetRange = template.targetByRank[rank];
        const target = randomInRangeSeeded(targetRange.min, targetRange.max, rng);
        const rewards = generateRewards(template, rank, rng);

        quests.push({
            id: `board_${date}_${i}`,
            type: "board",
            action: template.action,
            target,
            rewards,
            rankRequirement: rank,
        });
    }

    return quests;
}

function generatePersonalQuests(userId: string, date: string, rank: AdventurerRank): GuildQuest[] {
    const seed = hashCode(`personal_${userId}_${date}`);
    const rng = mulberry32(seed);
    const quests: GuildQuest[] = [];

    for (let i = 0; i < DAILY_PERSONAL_QUESTS; i++) {
        const template = pickFromArray(QUEST_TEMPLATES, rng);
        const targetRange = template.targetByRank[rank];
        const target = randomInRangeSeeded(targetRange.min, targetRange.max, rng);
        const rewards = generateRewards(template, rank, rng);

        quests.push({
            id: `personal_${userId}_${date}_${i}`,
            type: "personal",
            action: template.action,
            target,
            rewards,
            rankRequirement: rank,
        });
    }

    return quests;
}

// --- Quest Accept / Progress / Claim ---

async function acceptQuest(userId: string, questId: string): Promise<boolean> {
    const member = await GuildService.requireMember(userId);
    if (member.activeQuests.length >= MAX_ACTIVE_QUESTS) return false;
    if (member.activeQuests.includes(questId)) return false;

    await GuildMemberModel.updateOne({ userId }, { $addToSet: { activeQuests: questId } });
    await redis.setJson(`guild_quest_progress:${userId}:${questId}`, 0, QUEST_PROGRESS_TTL);
    await redis.deleteKey(`guild_member:${userId}`);
    return true;
}

async function getProgress(userId: string, questId: string): Promise<number> {
    const val = await redis.getJson(`guild_quest_progress:${userId}:${questId}`);
    return (val as number) ?? 0;
}

async function trackProgress(userId: string, action: QuestAction, amount: number = 1): Promise<void> {
    const member = await GuildService.getMember(userId);
    if (!member || member.activeQuests.length === 0) return;

    const date = getUTCDateString();
    const boardQuests = generateBoardQuests(date);
    const personalQuests = generatePersonalQuests(userId, date, member.rank as AdventurerRank);
    const allQuests = [...boardQuests, ...personalQuests];

    for (const questId of member.activeQuests) {
        const quest = allQuests.find((q) => q.id === questId);
        if (!quest || quest.action !== action) continue;

        const key = `guild_quest_progress:${userId}:${questId}`;
        const current = ((await redis.getJson(key)) as number) ?? 0;
        await redis.setJson(key, current + amount, QUEST_PROGRESS_TTL);
    }
}

async function claimQuest(userId: string, questId: string): Promise<{
    rewards: GuildQuest["rewards"];
    rankUp: { rankedUp: boolean; oldRank: AdventurerRank; newRank: AdventurerRank };
    levelUp: { leveled: boolean; oldLevel: number; newLevel: number };
} | null> {
    const member = await GuildService.requireMember(userId);
    if (!member.activeQuests.includes(questId)) return null;

    const date = getUTCDateString();
    const boardQuests = generateBoardQuests(date);
    const personalQuests = generatePersonalQuests(userId, date, member.rank as AdventurerRank);
    const quest = [...boardQuests, ...personalQuests].find((q) => q.id === questId);
    if (!quest) return null;

    const progress = await getProgress(userId, questId);
    if (progress < quest.target) return null;

    // Award rewards
    await CharacterService.addGold(userId, quest.rewards.gold);
    const levelUp = await CharacterService.addExp(userId, quest.rewards.exp);

    if (quest.rewards.materials.length > 0) {
        await CharacterService.addMaterials(userId, quest.rewards.materials);
    }
    if (quest.rewards.crate) {
        await CharacterService.addCrate(userId, quest.rewards.crate);
    }

    // Add GP and check rank up
    const rankUp = await GuildService.addGP(userId, quest.rewards.gp);

    // Update member: remove quest, increment completed
    await GuildMemberModel.updateOne(
        { userId },
        { $pull: { activeQuests: questId }, $inc: { questsCompleted: 1 } }
    );
    await redis.deleteKey(`guild_member:${userId}`);
    await redis.deleteKey(`guild_quest_progress:${userId}:${questId}`);

    // Track meta-quest "complete_quests"
    await trackProgress(userId, "complete_quests", 1);

    return { rewards: quest.rewards, rankUp, levelUp };
}

function isQuestComplete(progress: number, target: number): boolean {
    return progress >= target;
}

const GuildQuestService = {
    generateBoardQuests,
    generatePersonalQuests,
    acceptQuest,
    getProgress,
    trackProgress,
    claimQuest,
    isQuestComplete,
    getUTCDateString,
};

export default GuildQuestService;
