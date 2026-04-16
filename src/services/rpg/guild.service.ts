// src/services/rpg/guild.service.ts
import GuildMemberModel, { IGuildMember } from "../../models/guildMember.model";
import CharacterModel from "../../models/character.model";
import CharacterService from "./character.service";
import redis from "../../connector/redis";
import { RANK_CONFIG, ADVENTURER_RANKS, type AdventurerRank } from "./guild.config";

const GUILD_CACHE_TTL = 300;

export class GuildMemberNotFoundError extends Error {
    constructor(userId: string) {
        super(`Guild member not found: ${userId}`);
        this.name = "GuildMemberNotFoundError";
    }
}

export class AlreadyRegisteredError extends Error {
    constructor() {
        super("Already registered");
        this.name = "AlreadyRegisteredError";
    }
}

async function getMember(userId: string): Promise<IGuildMember | null> {
    const cacheKey = `guild_member:${userId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildMember;
    const doc = await GuildMemberModel.findOne({ userId });
    if (doc) await redis.setJson(cacheKey, doc.toObject(), GUILD_CACHE_TTL);
    return doc;
}

async function requireMember(userId: string): Promise<IGuildMember> {
    const member = await getMember(userId);
    if (!member) throw new GuildMemberNotFoundError(userId);
    return member;
}

async function register(userId: string): Promise<IGuildMember> {
    await CharacterService.requireCharacter(userId); // must have character
    const existing = await GuildMemberModel.findOne({ userId });
    if (existing) throw new AlreadyRegisteredError();
    const member = await GuildMemberModel.create({ userId });
    await redis.deleteKey(`guild_member:${userId}`);
    return member;
}

async function addGP(userId: string, amount: number): Promise<{ gp: number; rankedUp: boolean; oldRank: AdventurerRank; newRank: AdventurerRank }> {
    const member = await requireMember(userId);
    const oldRank = member.rank as AdventurerRank;

    // Atomically increment GP and read the updated document
    const updated = await GuildMemberModel.findOneAndUpdate(
        { userId },
        { $inc: { gp: amount } },
        { new: true }
    );
    if (!updated) throw new GuildMemberNotFoundError(userId);

    const newGP = updated.gp;

    // Check rank up using the atomically-updated GP
    const char = await CharacterService.requireCharacter(userId);
    const bossKills = char.bossKills ?? 0;
    let newRank = oldRank;

    const rankIndex = ADVENTURER_RANKS.indexOf(oldRank);
    for (let i = rankIndex + 1; i < ADVENTURER_RANKS.length; i++) {
        const nextRank = ADVENTURER_RANKS[i];
        const req = RANK_CONFIG[nextRank];
        if (newGP >= req.gpRequired && char.level >= req.minLevel && bossKills >= req.minBossKills) {
            newRank = nextRank;
        } else {
            break;
        }
    }

    // Only update rank if it changed
    if (newRank !== oldRank) {
        await GuildMemberModel.updateOne({ userId }, { $set: { rank: newRank } });
    }

    await redis.deleteKey(`guild_member:${userId}`);

    return { gp: newGP, rankedUp: newRank !== oldRank, oldRank, newRank };
}

async function incrementBossKills(userId: string): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { bossKills: 1 } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

function getNextRank(currentRank: AdventurerRank): AdventurerRank | null {
    const idx = ADVENTURER_RANKS.indexOf(currentRank);
    if (idx >= ADVENTURER_RANKS.length - 1) return null;
    return ADVENTURER_RANKS[idx + 1];
}

const GuildService = {
    getMember,
    requireMember,
    register,
    addGP,
    incrementBossKills,
    getNextRank,
    GuildMemberNotFoundError,
    AlreadyRegisteredError,
};

export default GuildService;
