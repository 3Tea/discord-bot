"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlocklistService = void 0;
const blocklistEntry_model_1 = __importDefault(require("../../models/blocklistEntry.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
const CACHE_TTL = 60 * 60;
const NOTIFY_TTL = 60 * 10;
function userKey(userId) {
    return `block:user:${userId}`;
}
function guildKey(guildId) {
    return `block:guild:${guildId}`;
}
function notifyKey(userId) {
    return `block:notify:user:${userId}`;
}
async function invalidate(keys) {
    await Promise.all(keys.map((k) => redis_1.default.deleteKey(k))).catch(() => { });
}
async function blockUser(userId, reason, blockedBy) {
    await blocklistEntry_model_1.default.findOneAndUpdate({ type: "user", targetId: userId }, {
        $set: { reason, blockedBy, blockedAt: new Date() },
        $setOnInsert: { type: "user", targetId: userId },
    }, { upsert: true, returnDocument: "after" });
    await invalidate([userKey(userId), notifyKey(userId)]);
}
async function unblockUser(userId) {
    const result = await blocklistEntry_model_1.default.deleteOne({ type: "user", targetId: userId });
    await invalidate([userKey(userId), notifyKey(userId)]);
    return result.deletedCount > 0;
}
async function blockGuild(guildId, reason, blockedBy, client, guildName) {
    await blocklistEntry_model_1.default.findOneAndUpdate({ type: "guild", targetId: guildId }, {
        $set: { reason, blockedBy, blockedAt: new Date(), guildName },
        $setOnInsert: { type: "guild", targetId: guildId, leftAt: null },
    }, { upsert: true, returnDocument: "after" });
    await invalidate([guildKey(guildId)]);
    const guild = client.guilds.cache.get(guildId);
    if (!guild)
        return { status: "not-in-guild" };
    try {
        await guild.leave();
        await blocklistEntry_model_1.default.findOneAndUpdate({ type: "guild", targetId: guildId }, { $set: { leftAt: new Date(), guildName: guild.name } });
        return { status: "left" };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown";
        logger_mixed_1.logger.error(`[BlocklistService] failed to leave guild ${guildId}: ${message}`);
        return { status: "leave-failed", error: message };
    }
}
async function unblockGuild(guildId) {
    const result = await blocklistEntry_model_1.default.deleteOne({ type: "guild", targetId: guildId });
    await invalidate([guildKey(guildId)]);
    return result.deletedCount > 0;
}
async function markGuildLeft(guildId) {
    await blocklistEntry_model_1.default.findOneAndUpdate({ type: "guild", targetId: guildId }, { $set: { leftAt: new Date() } });
}
async function isUserBlocked(userId) {
    const cached = await redis_1.default.getJson(userKey(userId));
    if (cached === "none")
        return { blocked: false };
    if (cached && typeof cached === "object")
        return { blocked: true, reason: cached.reason };
    const doc = await blocklistEntry_model_1.default.findOne({ type: "user", targetId: userId })
        .select("reason")
        .lean();
    if (!doc) {
        await redis_1.default.setJson(userKey(userId), "none", CACHE_TTL);
        return { blocked: false };
    }
    await redis_1.default.setJson(userKey(userId), { reason: doc.reason }, CACHE_TTL);
    return { blocked: true, reason: doc.reason };
}
async function isGuildBlocked(guildId) {
    const cached = await redis_1.default.getJson(guildKey(guildId));
    if (cached === "none")
        return { blocked: false };
    if (cached && typeof cached === "object")
        return { blocked: true, reason: cached.reason };
    const doc = await blocklistEntry_model_1.default.findOne({ type: "guild", targetId: guildId })
        .select("reason")
        .lean();
    if (!doc) {
        await redis_1.default.setJson(guildKey(guildId), "none", CACHE_TTL);
        return { blocked: false };
    }
    await redis_1.default.setJson(guildKey(guildId), { reason: doc.reason }, CACHE_TTL);
    return { blocked: true, reason: doc.reason };
}
async function shouldNotifyBlockedUser(userId) {
    return redis_1.default.setKeyNX(notifyKey(userId), "1", NOTIFY_TTL);
}
async function listEntries(type, page, pageSize) {
    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await Promise.all([
        blocklistEntry_model_1.default.find({ type })
            .sort({ blockedAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean(),
        blocklistEntry_model_1.default.countDocuments({ type }),
    ]);
    return { items, total };
}
async function getInfo(type, targetId) {
    return blocklistEntry_model_1.default.findOne({ type, targetId }).lean();
}
exports.BlocklistService = {
    blockUser,
    unblockUser,
    blockGuild,
    unblockGuild,
    markGuildLeft,
    isUserBlocked,
    isGuildBlocked,
    shouldNotifyBlockedUser,
    listEntries,
    getInfo,
};
