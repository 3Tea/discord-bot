"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlreadyRegisteredError = exports.GuildMemberNotFoundError = void 0;
// src/services/rpg/guild.service.ts
const guildMember_model_1 = __importDefault(require("../../models/guildMember.model"));
const character_model_1 = __importDefault(require("../../models/character.model"));
const character_service_1 = __importDefault(require("./character.service"));
const redis_1 = __importDefault(require("../../connector/redis"));
const guild_config_1 = require("./guild.config");
const GUILD_CACHE_TTL = 300;
class GuildMemberNotFoundError extends Error {
    constructor(userId) {
        super(`Guild member not found: ${userId}`);
        this.name = "GuildMemberNotFoundError";
    }
}
exports.GuildMemberNotFoundError = GuildMemberNotFoundError;
class AlreadyRegisteredError extends Error {
    constructor() {
        super("Already registered");
        this.name = "AlreadyRegisteredError";
    }
}
exports.AlreadyRegisteredError = AlreadyRegisteredError;
async function getMember(userId) {
    const cacheKey = `guild_member:${userId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const doc = await guildMember_model_1.default.findOne({ userId });
    if (doc)
        await redis_1.default.setJson(cacheKey, doc.toObject(), GUILD_CACHE_TTL);
    return doc;
}
async function requireMember(userId) {
    const member = await getMember(userId);
    if (!member)
        throw new GuildMemberNotFoundError(userId);
    return member;
}
async function register(userId) {
    await character_service_1.default.requireCharacter(userId); // must have character
    const existing = await guildMember_model_1.default.findOne({ userId });
    if (existing)
        throw new AlreadyRegisteredError();
    const member = await guildMember_model_1.default.create({ userId });
    await redis_1.default.deleteKey(`guild_member:${userId}`);
    return member;
}
async function addGP(userId, amount) {
    const member = await requireMember(userId);
    const oldRank = member.rank;
    // Atomically increment GP and read the updated document
    const updated = await guildMember_model_1.default.findOneAndUpdate({ userId }, { $inc: { gp: amount } }, { new: true });
    if (!updated)
        throw new GuildMemberNotFoundError(userId);
    const newGP = updated.gp;
    // Check rank up using the atomically-updated GP
    const char = await character_service_1.default.requireCharacter(userId);
    const bossKills = char.bossKills ?? 0;
    let newRank = oldRank;
    const rankIndex = guild_config_1.ADVENTURER_RANKS.indexOf(oldRank);
    for (let i = rankIndex + 1; i < guild_config_1.ADVENTURER_RANKS.length; i++) {
        const nextRank = guild_config_1.ADVENTURER_RANKS[i];
        const req = guild_config_1.RANK_CONFIG[nextRank];
        if (newGP >= req.gpRequired && char.level >= req.minLevel && bossKills >= req.minBossKills) {
            newRank = nextRank;
        }
        else {
            break;
        }
    }
    // Only update rank if it changed
    if (newRank !== oldRank) {
        await guildMember_model_1.default.updateOne({ userId }, { $set: { rank: newRank } });
    }
    await redis_1.default.deleteKey(`guild_member:${userId}`);
    return { gp: newGP, rankedUp: newRank !== oldRank, oldRank, newRank };
}
async function incrementBossKills(userId) {
    await character_model_1.default.updateOne({ userId }, { $inc: { bossKills: 1 } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
function getNextRank(currentRank) {
    const idx = guild_config_1.ADVENTURER_RANKS.indexOf(currentRank);
    if (idx >= guild_config_1.ADVENTURER_RANKS.length - 1)
        return null;
    return guild_config_1.ADVENTURER_RANKS[idx + 1];
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
exports.default = GuildService;
