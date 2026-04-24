"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const redis_1 = __importDefault(require("../../connector/redis"));
const economyFreeze_model_1 = __importDefault(require("../../models/economyFreeze.model"));
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const economySnapshot_model_1 = __importDefault(require("../../models/economySnapshot.model"));
function generateSnapshotId() {
    return (0, node_crypto_1.randomBytes)(4).toString("hex");
}
// ─── Freeze ──────────────────────────────────────────────────────────────────
async function freeze(userId, guildId, frozenBy, reason) {
    await economyFreeze_model_1.default.findOneAndUpdate({ userId, guildId }, { $set: { frozenBy, reason }, $setOnInsert: { userId, guildId } }, { upsert: true });
    await redis_1.default.setJson(`eco_freeze:${guildId}:${userId}`, true, 600);
}
async function unfreeze(userId, guildId) {
    const result = await economyFreeze_model_1.default.deleteOne({ userId, guildId });
    await redis_1.default.deleteKey(`eco_freeze:${guildId}:${userId}`);
    return result.deletedCount > 0;
}
async function isFrozen(userId, guildId) {
    const cacheKey = `eco_freeze:${guildId}:${userId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached === true)
        return true;
    if (cached === false)
        return false;
    const doc = await economyFreeze_model_1.default.findOne({ userId, guildId });
    const frozen = !!doc;
    await redis_1.default.setJson(cacheKey, frozen, 600);
    return frozen;
}
async function getCirculation(guildId) {
    const [agg] = await userEconomy_model_1.default.aggregate([
        { $match: { guildId } },
        {
            $group: {
                _id: null,
                totalCoin: { $sum: "$coin" },
                totalGem: { $sum: "$gem" },
                activeUsers: {
                    $sum: { $cond: [{ $or: [{ $gt: ["$coin", 0] }, { $gt: ["$gem", 0] }] }, 1, 0] },
                },
            },
        },
    ]);
    const topRichest = await userEconomy_model_1.default.find({ guildId })
        .sort({ coin: -1 })
        .limit(5)
        .select("userId coin gem")
        .lean();
    return {
        totalCoin: agg?.totalCoin ?? 0,
        totalGem: agg?.totalGem ?? 0,
        activeUsers: agg?.activeUsers ?? 0,
        topRichest: topRichest.map((u) => ({ userId: u.userId, coin: u.coin, gem: u.gem })),
    };
}
async function getFlow24h(guildId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [agg] = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: since } } },
        {
            $group: {
                _id: null,
                coinEarned: { $sum: { $cond: [{ $gt: ["$coinDelta", 0] }, "$coinDelta", 0] } },
                coinSpent: { $sum: { $cond: [{ $lt: ["$coinDelta", 0] }, "$coinDelta", 0] } },
                gemEarned: { $sum: { $cond: [{ $gt: ["$gemDelta", 0] }, "$gemDelta", 0] } },
                gemSpent: { $sum: { $cond: [{ $lt: ["$gemDelta", 0] }, "$gemDelta", 0] } },
            },
        },
    ]);
    return {
        coinEarned: agg?.coinEarned ?? 0,
        coinSpent: Math.abs(agg?.coinSpent ?? 0),
        coinNet: (agg?.coinEarned ?? 0) + (agg?.coinSpent ?? 0),
        gemEarned: agg?.gemEarned ?? 0,
        gemSpent: Math.abs(agg?.gemSpent ?? 0),
    };
}
async function getSourceBreakdown(guildId, direction) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const matchCond = direction === "earn" ? { $gt: ["$coinDelta", 0] } : { $lt: ["$coinDelta", 0] };
    const results = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: since } } },
        { $match: { $expr: matchCond } },
        {
            $group: {
                _id: "$type",
                total: { $sum: { $abs: "$coinDelta" } },
            },
        },
        { $sort: { total: -1 } },
    ]);
    const grandTotal = results.reduce((sum, r) => sum + r.total, 0);
    return results.map((r) => ({
        type: r._id,
        total: r.total,
        pct: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
    }));
}
async function getWealthDistribution(guildId) {
    const buckets = await userEconomy_model_1.default.aggregate([
        { $match: { guildId } },
        {
            $bucket: {
                groupBy: "$coin",
                boundaries: [0, 1, 101, 1001, 10001],
                default: 10001,
                output: { count: { $sum: 1 } },
            },
        },
    ]);
    const labels = {
        0: "0",
        1: "1-100",
        101: "101-1,000",
        1001: "1,001-10,000",
        10001: "10,000+",
    };
    return buckets.map((b) => ({
        label: labels[b._id] ?? `${b._id}+`,
        count: b.count,
    }));
}
async function getWeekComparison(guildId) {
    const now = Date.now();
    const thisWeekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const [thisWeek] = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: thisWeekStart }, coinDelta: { $gt: 0 } } },
        {
            $group: {
                _id: null,
                total: { $sum: "$coinDelta" },
                active: { $addToSet: "$userId" },
            },
        },
        { $project: { total: 1, activeCount: { $size: "$active" } } },
    ]);
    const [lastWeek] = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart }, coinDelta: { $gt: 0 } } },
        {
            $group: {
                _id: null,
                total: { $sum: "$coinDelta" },
                active: { $addToSet: "$userId" },
            },
        },
        { $project: { total: 1, activeCount: { $size: "$active" } } },
    ]);
    const thisTotal = thisWeek?.total ?? 0;
    const lastTotal = lastWeek?.total ?? 0;
    const changePct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;
    return {
        thisWeekCoin: thisTotal,
        lastWeekCoin: lastTotal,
        coinChangePct: changePct,
        thisWeekActive: thisWeek?.activeCount ?? 0,
        lastWeekActive: lastWeek?.activeCount ?? 0,
    };
}
async function detectAnomalies(guildId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alerts = [];
    const earningsByUser = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, coinDelta: { $gt: 0 } } },
        { $group: { _id: "$userId", total: { $sum: "$coinDelta" } } },
    ]);
    if (earningsByUser.length > 1) {
        const avg = earningsByUser.reduce((s, u) => s + u.total, 0) / earningsByUser.length;
        const threshold = avg * 3;
        for (const u of earningsByUser) {
            if (u.total > threshold) {
                alerts.push({ type: "earning_spike", userId: u._id, value: u.total, threshold: Math.round(threshold) });
            }
        }
    }
    const gamblingAbuse = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, type: "gambling" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 20 } } },
    ]);
    for (const u of gamblingAbuse) {
        alerts.push({ type: "gambling_abuse", userId: u._id, value: u.count, threshold: 20 });
    }
    const robTargets = await transaction_model_1.default.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, type: "rob", coinDelta: { $gt: 0 } } },
        { $group: { _id: "$metadata.targetId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
    ]);
    for (const u of robTargets) {
        if (u._id) {
            alerts.push({ type: "rob_target", userId: u._id, value: u.count, threshold: 3 });
        }
    }
    return alerts;
}
function buildSnapshotData(users, scope) {
    return users.map((u) => {
        const entry = { userId: u.userId };
        if (scope === "coin" || scope === "all")
            entry.coin = u.coin;
        if (scope === "gem" || scope === "all")
            entry.gem = u.gem;
        if (scope === "streak" || scope === "all") {
            entry.prayStreak = u.prayStreak;
            entry.lastStreakDate = u.lastStreakDate;
        }
        return entry;
    });
}
async function pruneOldSnapshots(guildId) {
    const snapshotCount = await economySnapshot_model_1.default.countDocuments({ guildId });
    if (snapshotCount <= 10)
        return;
    const oldest = await economySnapshot_model_1.default.findOne({ guildId, restoredAt: { $ne: null } }).sort({
        createdAt: 1,
    });
    if (oldest) {
        await economySnapshot_model_1.default.deleteOne({ _id: oldest._id });
    }
    else {
        const oldestAny = await economySnapshot_model_1.default.findOne({ guildId }).sort({ createdAt: 1 });
        if (oldestAny)
            await economySnapshot_model_1.default.deleteOne({ _id: oldestAny._id });
    }
}
async function resetEconomy(guildId, scope, target, adminId) {
    const filter = { guildId };
    if (target !== "server")
        filter.userId = target;
    const projection = { userId: 1 };
    if (scope === "coin" || scope === "all")
        projection.coin = 1;
    if (scope === "gem" || scope === "all")
        projection.gem = 1;
    if (scope === "streak" || scope === "all") {
        projection.prayStreak = 1;
        projection.lastStreakDate = 1;
    }
    const users = await userEconomy_model_1.default.find(filter).select(projection).lean();
    const snapshotId = generateSnapshotId();
    const data = buildSnapshotData(users, scope);
    await economySnapshot_model_1.default.create({
        snapshotId,
        guildId,
        createdBy: adminId,
        scope,
        target,
        data,
    });
    await pruneOldSnapshots(guildId);
    const updateSet = {};
    if (scope === "coin" || scope === "all")
        updateSet.coin = 0;
    if (scope === "gem" || scope === "all")
        updateSet.gem = 0;
    if (scope === "streak" || scope === "all") {
        updateSet.prayStreak = 0;
        updateSet.lastStreakDate = null;
    }
    const result = await userEconomy_model_1.default.updateMany(filter, { $set: updateSet });
    if (users.length > 0) {
        const txDocs = users.map((u) => ({
            userId: u.userId,
            guildId,
            type: "reset",
            coinDelta: scope === "coin" || scope === "all" ? -(u.coin ?? 0) : 0,
            gemDelta: scope === "gem" || scope === "all" ? -(u.gem ?? 0) : 0,
            metadata: { scope, snapshotId },
        }));
        await transaction_model_1.default.insertMany(txDocs);
    }
    return { snapshotId, affectedCount: result.modifiedCount };
}
async function rollbackSnapshot(snapshotId, guildId) {
    const snapshot = await economySnapshot_model_1.default.findOne({ snapshotId, guildId, restoredAt: null });
    if (!snapshot)
        throw new Error("SNAPSHOT_NOT_FOUND");
    const bulkOps = snapshot.data.map((entry) => {
        const setFields = {};
        if (entry.coin !== undefined)
            setFields.coin = entry.coin;
        if (entry.gem !== undefined)
            setFields.gem = entry.gem;
        if (entry.prayStreak !== undefined)
            setFields.prayStreak = entry.prayStreak;
        if (entry.lastStreakDate !== undefined)
            setFields.lastStreakDate = entry.lastStreakDate;
        return {
            updateOne: {
                filter: { userId: entry.userId, guildId },
                update: { $set: setFields },
                upsert: true,
            },
        };
    });
    if (bulkOps.length > 0) {
        await userEconomy_model_1.default.bulkWrite(bulkOps);
    }
    snapshot.restoredAt = new Date();
    await snapshot.save();
    if (snapshot.data.length > 0) {
        // NOTE: coinDelta records the restored absolute value, not the actual delta from current balance. By design.
        const txDocs = snapshot.data.map((entry) => ({
            userId: entry.userId,
            guildId,
            type: "rollback",
            coinDelta: entry.coin ?? 0,
            gemDelta: entry.gem ?? 0,
            metadata: { snapshotId },
        }));
        await transaction_model_1.default.insertMany(txDocs);
    }
    return { restoredCount: snapshot.data.length };
}
async function getHistory(opts) {
    const filter = { userId: opts.userId, guildId: opts.guildId };
    if (opts.type && opts.type !== "all")
        filter.type = opts.type;
    if (opts.minAmount) {
        filter.$or = [
            { coinDelta: { $gte: opts.minAmount } },
            { coinDelta: { $lte: -opts.minAmount } },
            { gemDelta: { $gte: opts.minAmount } },
            { gemDelta: { $lte: -opts.minAmount } },
        ];
    }
    const perPage = 10;
    const totalCount = await transaction_model_1.default.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const page = Math.min(opts.page, totalPages - 1);
    const docs = await transaction_model_1.default.find(filter)
        .sort({ createdAt: -1 })
        .skip(page * perPage)
        .limit(perPage)
        .lean();
    return {
        transactions: docs.map((d) => ({
            shortId: d._id.toString().slice(-6),
            type: d.type,
            coinDelta: d.coinDelta,
            gemDelta: d.gemDelta,
            metadata: (d.metadata ?? {}),
            createdAt: d.createdAt,
        })),
        totalCount,
        page,
        totalPages,
    };
}
// ─── Reverse Transaction ──────────────────────────────────────────────────────
async function reverseTransaction(shortId, guildId, adminId) {
    if (!/^[a-f0-9]+$/i.test(shortId))
        throw new Error("TRANSACTION_NOT_FOUND");
    if (shortId.length > 24)
        throw new Error("INVALID_ID");
    const regex = new RegExp(`${shortId}$`);
    const matches = await transaction_model_1.default.find({ guildId, _id: { $regex: regex } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    if (matches.length === 0)
        throw new Error("TRANSACTION_NOT_FOUND");
    if (matches.length > 1)
        throw new Error("AMBIGUOUS_ID");
    const original = matches[0];
    const nonReversibleTypes = ["level_up", "voice_reward", "reset", "rollback", "reverse"];
    if (nonReversibleTypes.includes(original.type))
        throw new Error("NOT_REVERSIBLE");
    if (original.metadata?.reversed)
        throw new Error("ALREADY_REVERSED");
    // Atomic reversal — clamp to zero when taking back, add back when restoring
    const filter = { userId: original.userId, guildId };
    const coinExpr = original.coinDelta > 0
        ? { $max: [{ $subtract: ["$coin", original.coinDelta] }, 0] }
        : original.coinDelta < 0
            ? { $add: ["$coin", -original.coinDelta] }
            : "$coin";
    const gemExpr = original.gemDelta > 0
        ? { $max: [{ $subtract: ["$gem", original.gemDelta] }, 0] }
        : original.gemDelta < 0
            ? { $add: ["$gem", -original.gemDelta] }
            : "$gem";
    await userEconomy_model_1.default.updateOne(filter, [{ $set: { coin: coinExpr, gem: gemExpr } }], { updatePipeline: true });
    const reverseTx = await transaction_model_1.default.create({
        userId: original.userId,
        guildId,
        type: "reverse",
        coinDelta: -original.coinDelta,
        gemDelta: -original.gemDelta,
        metadata: { originalTransactionId: original._id.toString(), originalType: original.type },
    });
    await transaction_model_1.default.updateOne({ _id: original._id }, { $set: { "metadata.reversed": true, "metadata.reversedBy": adminId } });
    return {
        original: { type: original.type, coinDelta: original.coinDelta, gemDelta: original.gemDelta },
        reversedId: reverseTx._id.toString().slice(-6),
    };
}
// ─── Count Affected ───────────────────────────────────────────────────────────
async function countAffected(guildId, scope, target) {
    const filter = { guildId };
    if (target !== "server")
        filter.userId = target;
    if (scope === "coin")
        filter.coin = { $gt: 0 };
    else if (scope === "gem")
        filter.gem = { $gt: 0 };
    else if (scope === "streak")
        filter.prayStreak = { $gt: 0 };
    return userEconomy_model_1.default.countDocuments(filter);
}
// ─── Export ───────────────────────────────────────────────────────────────────
const EconomyAdminService = {
    freeze,
    unfreeze,
    isFrozen,
    getCirculation,
    getFlow24h,
    getSourceBreakdown,
    getWealthDistribution,
    getWeekComparison,
    detectAnomalies,
    resetEconomy,
    rollbackSnapshot,
    getHistory,
    reverseTransaction,
    countAffected,
};
exports.default = EconomyAdminService;
