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
// src/services/rpg/guildQuest.service.ts
const redis_1 = __importDefault(require("../../connector/redis"));
const guildMember_model_1 = __importDefault(require("../../models/guildMember.model"));
const character_service_1 = __importDefault(require("./character.service"));
const guild_service_1 = __importDefault(require("./guild.service"));
const guild_config_1 = require("./guild.config");
const rpg_config_1 = require("./rpg.config");
const QUEST_PROGRESS_TTL = 86400; // 24 hours
// --- Deterministic Quest Generation ---
function getUTCDateString() {
    return new Date().toISOString().split("T")[0];
}
function pickFromArray(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}
function randomInRangeSeeded(min, max, rng) {
    return Math.floor(rng() * (max - min + 1)) + min;
}
function generateRewards(template, rank, rng) {
    const scale = guild_config_1.REWARD_SCALING[rank];
    const gold = Math.floor(template.baseGold * scale.goldMultiplier);
    const exp = Math.floor(template.baseExp * scale.expMultiplier);
    const gp = scale.gpPerQuest;
    const materials = [];
    if (rng() < scale.materialChance) {
        // Pick a material tier based on rank
        const rankIdx = guild_config_1.ADVENTURER_RANKS.indexOf(rank);
        const maxMatIdx = Math.min(rankIdx, rpg_config_1.MATERIALS.length - 1);
        const matIdx = Math.floor(rng() * (maxMatIdx + 1));
        const mat = rpg_config_1.MATERIALS[rpg_config_1.MATERIALS.length - 1 - matIdx]; // MATERIALS is ordered high→low, so reverse
        materials.push({ key: mat.key, qty: randomInRangeSeeded(1, 3, rng) });
    }
    let crate = null;
    if (rng() < scale.crateChance) {
        const rankIdx = guild_config_1.ADVENTURER_RANKS.indexOf(rank);
        if (rankIdx >= 7)
            crate = "gold"; // SS+
        else if (rankIdx >= 4)
            crate = "silver"; // B-S
        else
            crate = "bronze"; // F-A
    }
    return { gold, exp, gp, materials, crate };
}
function generateBoardQuests(date) {
    const seed = (0, guild_config_1.hashCode)(`board_${date}`);
    const rng = (0, guild_config_1.mulberry32)(seed);
    const quests = [];
    for (let i = 0; i < guild_config_1.DAILY_BOARD_QUESTS; i++) {
        const rank = guild_config_1.BOARD_QUEST_RANKS[i];
        const template = pickFromArray(guild_config_1.QUEST_TEMPLATES, rng);
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
function generatePersonalQuests(userId, date, rank) {
    const seed = (0, guild_config_1.hashCode)(`personal_${userId}_${date}`);
    const rng = (0, guild_config_1.mulberry32)(seed);
    const quests = [];
    for (let i = 0; i < guild_config_1.DAILY_PERSONAL_QUESTS; i++) {
        const template = pickFromArray(guild_config_1.QUEST_TEMPLATES, rng);
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
async function acceptQuest(userId, questId) {
    const member = await guild_service_1.default.requireMember(userId);
    if (member.activeQuests.length >= guild_config_1.MAX_ACTIVE_QUESTS)
        return false;
    if (member.activeQuests.includes(questId))
        return false;
    await guildMember_model_1.default.updateOne({ userId }, { $addToSet: { activeQuests: questId } });
    await redis_1.default.setJson(`guild_quest_progress:${userId}:${questId}`, 0, QUEST_PROGRESS_TTL);
    await redis_1.default.deleteKey(`guild_member:${userId}`);
    return true;
}
async function getProgress(userId, questId) {
    const val = await redis_1.default.getJson(`guild_quest_progress:${userId}:${questId}`);
    return val ?? 0;
}
async function trackProgress(userId, action, amount = 1, guildId) {
    const member = await guild_service_1.default.getMember(userId);
    if (member && member.activeQuests.length > 0) {
        const date = getUTCDateString();
        const boardQuests = generateBoardQuests(date);
        const personalQuests = generatePersonalQuests(userId, date, member.rank);
        const allQuests = [...boardQuests, ...personalQuests];
        for (const questId of member.activeQuests) {
            const quest = allQuests.find((q) => q.id === questId);
            if (!quest || quest.action !== action)
                continue;
            const key = `guild_quest_progress:${userId}:${questId}`;
            const current = (await redis_1.default.getJson(key)) ?? 0;
            await redis_1.default.setJson(key, current + amount, QUEST_PROGRESS_TTL);
        }
    }
    // Branch quest tracking (if guildId provided)
    if (guildId) {
        Promise.resolve().then(() => __importStar(require("./branch.service"))).then(({ default: BranchService }) => {
            BranchService.trackBranchProgress(guildId, action, amount).catch(() => { });
        })
            .catch(() => { });
    }
}
async function claimQuest(userId, questId) {
    const member = await guild_service_1.default.requireMember(userId);
    if (!member.activeQuests.includes(questId))
        return null;
    const date = getUTCDateString();
    const boardQuests = generateBoardQuests(date);
    const personalQuests = generatePersonalQuests(userId, date, member.rank);
    const quest = [...boardQuests, ...personalQuests].find((q) => q.id === questId);
    if (!quest)
        return null;
    const progress = await getProgress(userId, questId);
    if (progress < quest.target)
        return null;
    // Award rewards
    await character_service_1.default.addGold(userId, quest.rewards.gold);
    const levelUp = await character_service_1.default.addExp(userId, quest.rewards.exp);
    if (quest.rewards.materials.length > 0) {
        await character_service_1.default.addMaterials(userId, quest.rewards.materials);
    }
    if (quest.rewards.crate) {
        await character_service_1.default.addCrate(userId, quest.rewards.crate);
    }
    // Add GP and check rank up
    const rankUp = await guild_service_1.default.addGP(userId, quest.rewards.gp);
    // Update member: remove quest, increment completed
    await guildMember_model_1.default.updateOne({ userId }, { $pull: { activeQuests: questId }, $inc: { questsCompleted: 1 } });
    await redis_1.default.deleteKey(`guild_member:${userId}`);
    await redis_1.default.deleteKey(`guild_quest_progress:${userId}:${questId}`);
    // Track meta-quest "complete_quests"
    await trackProgress(userId, "complete_quests", 1);
    return { rewards: quest.rewards, rankUp, levelUp };
}
function isQuestComplete(progress, target) {
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
exports.default = GuildQuestService;
