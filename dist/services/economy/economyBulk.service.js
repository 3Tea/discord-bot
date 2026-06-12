"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = __importDefault(require("../../connector/redis"));
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const BULK_COOLDOWN = 60;
async function checkCooldown(guildId) {
    const ttl = await redis_1.default.ttlKey(`eco_bulk_cd:${guildId}`);
    return ttl > 0 ? ttl : 0;
}
async function setCooldown(guildId) {
    await redis_1.default.setKey(`eco_bulk_cd:${guildId}`, "1", BULK_COOLDOWN);
}
async function distribute(guildId, members, amount, currency, adminId, roleId) {
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
        await userEconomy_model_1.default.bulkWrite(bulkOps);
    }
    const txDocs = userIds.map((userId) => ({
        userId,
        guildId,
        type: "bulk_distribute",
        coinDelta: currency === "coin" ? amount : 0,
        gemDelta: currency === "gem" ? amount : 0,
        metadata: { roleId, affectedCount: userIds.length, amountEach: amount, adminId },
    }));
    if (txDocs.length > 0) {
        await transaction_model_1.default.insertMany(txDocs);
    }
    await setCooldown(guildId);
    return { affectedCount: userIds.length, totalAmount: amount * userIds.length };
}
async function tax(guildId, members, amount, currency, adminId, roleId) {
    const field = currency === "coin" ? "coin" : "gem";
    const userIds = members.map((m) => m.id);
    // NOTE: Pre-balances read before bulk update. Under concurrency, transaction log deltas may be approximate.
    const preBalances = await userEconomy_model_1.default.find({ guildId, userId: { $in: userIds } })
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
        await userEconomy_model_1.default.bulkWrite(bulkOps);
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
            type: "bulk_tax",
            coinDelta: currency === "coin" ? -actualDelta : 0,
            gemDelta: currency === "gem" ? -actualDelta : 0,
            metadata: { roleId, affectedCount: userIds.length, amountEach: amount, adminId },
        };
    });
    if (txDocs.length > 0) {
        await transaction_model_1.default.insertMany(txDocs);
    }
    await setCooldown(guildId);
    return { affectedCount: userIds.length, totalAmount: totalCollected };
}
const EconomyBulkService = {
    checkCooldown,
    distribute,
    tax,
};
exports.default = EconomyBulkService;
