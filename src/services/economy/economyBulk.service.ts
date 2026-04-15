import type { GuildMember } from "discord.js";
import redis from "../../connector/redis";
import UserEconomyModel from "../../models/userEconomy.model";
import TransactionModel from "../../models/transaction.model";

const BULK_COOLDOWN = 60;

async function checkCooldown(guildId: string): Promise<number> {
    const ttl = await redis.ttlKey(`eco_bulk_cd:${guildId}`);
    return ttl > 0 ? ttl : 0;
}

async function setCooldown(guildId: string): Promise<void> {
    await redis.setKey(`eco_bulk_cd:${guildId}`, "1", BULK_COOLDOWN);
}

interface BulkResult {
    affectedCount: number;
    totalAmount: number;
}

async function distribute(
    guildId: string,
    members: GuildMember[],
    amount: number,
    currency: "coin" | "gem",
    adminId: string,
    roleId?: string
): Promise<BulkResult> {
    const field = currency === "coin" ? "coin" : "gem";
    const userIds = members.map((m) => m.id);

    const bulkOps = userIds.map((userId) => ({
        updateOne: {
            filter: { userId, guildId },
            update: {
                $inc: { [field]: amount },
                $setOnInsert: { userId, guildId },
            },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        await UserEconomyModel.bulkWrite(bulkOps);
    }

    const txDocs = userIds.map((userId) => ({
        userId,
        guildId,
        type: "bulk_distribute" as const,
        coinDelta: currency === "coin" ? amount : 0,
        gemDelta: currency === "gem" ? amount : 0,
        metadata: { roleId, affectedCount: userIds.length, amountEach: amount, adminId },
    }));

    if (txDocs.length > 0) {
        await TransactionModel.insertMany(txDocs);
    }

    await setCooldown(guildId);
    return { affectedCount: userIds.length, totalAmount: amount * userIds.length };
}

async function tax(
    guildId: string,
    members: GuildMember[],
    amount: number,
    currency: "coin" | "gem",
    adminId: string,
    roleId?: string
): Promise<BulkResult> {
    const field = currency === "coin" ? "coin" : "gem";
    const userIds = members.map((m) => m.id);

    // Query pre-tax balances to compute accurate deltas after clamping
    const preBalances = await UserEconomyModel.find({ guildId, userId: { $in: userIds } })
        .select("userId coin gem")
        .lean();

    const balanceMap = new Map(preBalances.map((u) => [u.userId, { coin: u.coin, gem: u.gem }]));

    const bulkOps = userIds.map((userId) => ({
        updateOne: {
            filter: { userId, guildId },
            update: [
                {
                    $set: {
                        [field]: { $max: [{ $add: [`$${field}`, -amount] }, 0] },
                    },
                },
            ],
        },
    }));

    if (bulkOps.length > 0) {
        await UserEconomyModel.bulkWrite(bulkOps);
    }

    // Compute actual deltas: each user loses min(their balance, amount)
    let totalCollected = 0;
    const txDocs = userIds.map((userId) => {
        const pre = balanceMap.get(userId);
        const preValue = pre ? pre[field] : 0;
        const actualDelta = Math.min(preValue, amount);
        totalCollected += actualDelta;
        return {
            userId,
            guildId,
            type: "bulk_tax" as const,
            coinDelta: currency === "coin" ? -actualDelta : 0,
            gemDelta: currency === "gem" ? -actualDelta : 0,
            metadata: { roleId, affectedCount: userIds.length, amountEach: amount, adminId },
        };
    });

    if (txDocs.length > 0) {
        await TransactionModel.insertMany(txDocs);
    }

    await setCooldown(guildId);
    return { affectedCount: userIds.length, totalAmount: totalCollected };
}

const EconomyBulkService = {
    checkCooldown,
    distribute,
    tax,
};

export default EconomyBulkService;
