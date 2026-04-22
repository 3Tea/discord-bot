import type { Client } from "discord.js";
import BlocklistEntryModel, { IBlocklistEntry, BlocklistType } from "../../models/blocklistEntry.model";
import redis from "../../connector/redis";
import { logger } from "../../util/log/logger.mixed";

const CACHE_TTL = 60 * 60;
const NOTIFY_TTL = 60 * 10;

type CacheHit = { reason: string } | "none";

function userKey(userId: string): string {
    return `block:user:${userId}`;
}
function guildKey(guildId: string): string {
    return `block:guild:${guildId}`;
}
function notifyKey(userId: string): string {
    return `block:notify:user:${userId}`;
}

async function invalidate(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => redis.deleteKey(k))).catch(() => {});
}

async function blockUser(userId: string, reason: string, blockedBy: string): Promise<void> {
    await BlocklistEntryModel.findOneAndUpdate(
        { type: "user", targetId: userId },
        {
            $set: { reason, blockedBy, blockedAt: new Date() },
            $setOnInsert: { type: "user", targetId: userId },
        },
        { upsert: true, returnDocument: "after" }
    );
    await invalidate([userKey(userId), notifyKey(userId)]);
}

async function unblockUser(userId: string): Promise<boolean> {
    const result = await BlocklistEntryModel.deleteOne({ type: "user", targetId: userId });
    await invalidate([userKey(userId), notifyKey(userId)]);
    return result.deletedCount > 0;
}

async function blockGuild(
    guildId: string,
    reason: string,
    blockedBy: string,
    client: Client,
    guildName?: string
): Promise<{ left: boolean }> {
    await BlocklistEntryModel.findOneAndUpdate(
        { type: "guild", targetId: guildId },
        {
            $set: { reason, blockedBy, blockedAt: new Date(), guildName },
            $setOnInsert: { type: "guild", targetId: guildId, leftAt: null },
        },
        { upsert: true, returnDocument: "after" }
    );
    await invalidate([guildKey(guildId)]);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { left: false };

    try {
        await guild.leave();
        await BlocklistEntryModel.findOneAndUpdate(
            { type: "guild", targetId: guildId },
            { $set: { leftAt: new Date(), guildName: guild.name } }
        );
        return { left: true };
    } catch (error) {
        logger.error(
            `[BlocklistService] failed to leave guild ${guildId}: ${error instanceof Error ? error.message : "Unknown"}`
        );
        return { left: false };
    }
}

async function unblockGuild(guildId: string): Promise<boolean> {
    const result = await BlocklistEntryModel.deleteOne({ type: "guild", targetId: guildId });
    await invalidate([guildKey(guildId)]);
    return result.deletedCount > 0;
}

async function markGuildLeft(guildId: string): Promise<void> {
    await BlocklistEntryModel.findOneAndUpdate(
        { type: "guild", targetId: guildId },
        { $set: { leftAt: new Date() } }
    );
}

async function isUserBlocked(userId: string): Promise<{ blocked: boolean; reason?: string }> {
    const cached = await redis.getJson<CacheHit>(userKey(userId));
    if (cached === "none") return { blocked: false };
    if (cached && typeof cached === "object") return { blocked: true, reason: cached.reason };

    const doc = await BlocklistEntryModel.findOne({ type: "user", targetId: userId })
        .select("reason")
        .lean();
    if (!doc) {
        await redis.setJson(userKey(userId), "none", CACHE_TTL);
        return { blocked: false };
    }
    await redis.setJson(userKey(userId), { reason: doc.reason }, CACHE_TTL);
    return { blocked: true, reason: doc.reason };
}

async function isGuildBlocked(guildId: string): Promise<{ blocked: boolean; reason?: string }> {
    const cached = await redis.getJson<CacheHit>(guildKey(guildId));
    if (cached === "none") return { blocked: false };
    if (cached && typeof cached === "object") return { blocked: true, reason: cached.reason };

    const doc = await BlocklistEntryModel.findOne({ type: "guild", targetId: guildId })
        .select("reason")
        .lean();
    if (!doc) {
        await redis.setJson(guildKey(guildId), "none", CACHE_TTL);
        return { blocked: false };
    }
    await redis.setJson(guildKey(guildId), { reason: doc.reason }, CACHE_TTL);
    return { blocked: true, reason: doc.reason };
}

async function shouldNotifyBlockedUser(userId: string): Promise<boolean> {
    return redis.setKeyNX(notifyKey(userId), "1", NOTIFY_TTL);
}

async function listEntries(
    type: BlocklistType,
    page: number,
    pageSize: number
): Promise<{ items: IBlocklistEntry[]; total: number }> {
    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await Promise.all([
        BlocklistEntryModel.find({ type })
            .sort({ blockedAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean<IBlocklistEntry[]>(),
        BlocklistEntryModel.countDocuments({ type }),
    ]);
    return { items, total };
}

async function getInfo(type: BlocklistType, targetId: string): Promise<IBlocklistEntry | null> {
    return BlocklistEntryModel.findOne({ type, targetId }).lean<IBlocklistEntry>();
}

export const BlocklistService = {
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
