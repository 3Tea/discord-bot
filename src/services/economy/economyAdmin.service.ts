import { randomBytes } from "node:crypto";
import type { QueryFilter, UpdateQuery } from "mongoose";
import redis from "../../connector/redis";
import EconomyFreezeModel from "../../models/economyFreeze.model";
import UserEconomyModel from "../../models/userEconomy.model";
import type { IUserEconomy } from "../../models/userEconomy.model";
import TransactionModel from "../../models/transaction.model";
import type { ITransaction } from "../../models/transaction.model";
import EconomySnapshotModel, { type ISnapshotEntry, type SnapshotScope } from "../../models/economySnapshot.model";

function generateSnapshotId(): string {
    return randomBytes(4).toString("hex");
}

// ─── Freeze ──────────────────────────────────────────────────────────────────

async function freeze(userId: string, guildId: string, frozenBy: string, reason: string): Promise<void> {
    await EconomyFreezeModel.findOneAndUpdate(
        { userId, guildId },
        { $set: { frozenBy, reason }, $setOnInsert: { userId, guildId } },
        { upsert: true }
    );
    await redis.setJson(`eco_freeze:${guildId}:${userId}`, true, 600);
}

async function unfreeze(userId: string, guildId: string): Promise<boolean> {
    const result = await EconomyFreezeModel.deleteOne({ userId, guildId });
    await redis.deleteKey(`eco_freeze:${guildId}:${userId}`);
    return result.deletedCount > 0;
}

async function isFrozen(userId: string, guildId: string): Promise<boolean> {
    const cacheKey = `eco_freeze:${guildId}:${userId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached === true) return true;
    if (cached === false) return false;

    const doc = await EconomyFreezeModel.findOne({ userId, guildId });
    const frozen = !!doc;
    await redis.setJson(cacheKey, frozen, 600);
    return frozen;
}

// ─── Dashboard — Circulation ──────────────────────────────────────────────────

interface CirculationStats {
    totalCoin: number;
    totalGem: number;
    activeUsers: number;
    topRichest: Array<{ userId: string; coin: number; gem: number }>;
}

async function getCirculation(guildId: string): Promise<CirculationStats> {
    const [agg] = await UserEconomyModel.aggregate<{
        totalCoin: number;
        totalGem: number;
        activeUsers: number;
    }>([
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

    const topRichest = await UserEconomyModel.find({ guildId })
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

// ─── Dashboard — Flow 24h ─────────────────────────────────────────────────────

interface FlowStats {
    coinEarned: number;
    coinSpent: number;
    coinNet: number;
    gemEarned: number;
    gemSpent: number;
}

async function getFlow24h(guildId: string): Promise<FlowStats> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [agg] = await TransactionModel.aggregate<{
        coinEarned: number;
        coinSpent: number;
        gemEarned: number;
        gemSpent: number;
    }>([
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

// ─── Dashboard — Source Breakdown ────────────────────────────────────────────

interface SourceBreakdown {
    type: string;
    total: number;
    pct: number;
}

async function getSourceBreakdown(guildId: string, direction: "earn" | "sink"): Promise<SourceBreakdown[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const matchCond = direction === "earn" ? { $gt: ["$coinDelta", 0] } : { $lt: ["$coinDelta", 0] };

    const results = await TransactionModel.aggregate<{ _id: string; total: number }>([
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

// ─── Dashboard — Wealth Distribution ─────────────────────────────────────────

interface WealthBucket {
    label: string;
    count: number;
}

async function getWealthDistribution(guildId: string): Promise<WealthBucket[]> {
    const buckets = await UserEconomyModel.aggregate<{ _id: number; count: number }>([
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

    const labels: Record<number, string> = {
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

// ─── Dashboard — Week Comparison ──────────────────────────────────────────────

interface WeekComparison {
    thisWeekCoin: number;
    lastWeekCoin: number;
    coinChangePct: number;
    thisWeekActive: number;
    lastWeekActive: number;
}

async function getWeekComparison(guildId: string): Promise<WeekComparison> {
    const now = Date.now();
    const thisWeekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek] = await TransactionModel.aggregate<{ total: number; activeCount: number }>([
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

    const [lastWeek] = await TransactionModel.aggregate<{ total: number; activeCount: number }>([
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

// ─── Dashboard — Anomaly Detection ───────────────────────────────────────────

interface AnomalyAlert {
    type: "earning_spike" | "gambling_abuse" | "rob_target";
    userId: string;
    value: number;
    threshold: number;
}

async function detectAnomalies(guildId: string): Promise<AnomalyAlert[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alerts: AnomalyAlert[] = [];

    const earningsByUser = await TransactionModel.aggregate<{ _id: string; total: number }>([
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

    const gamblingAbuse = await TransactionModel.aggregate<{ _id: string; count: number }>([
        { $match: { guildId, createdAt: { $gte: since }, type: "gambling" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 20 } } },
    ]);
    for (const u of gamblingAbuse) {
        alerts.push({ type: "gambling_abuse", userId: u._id, value: u.count, threshold: 20 });
    }

    const robTargets = await TransactionModel.aggregate<{ _id: string | null; count: number }>([
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

// ─── Reset & Snapshot ─────────────────────────────────────────────────────────

interface ResetResult {
    snapshotId: string;
    affectedCount: number;
}

function buildSnapshotData(
    users: Array<{ userId: string; coin: number; gem: number; prayStreak: number; lastStreakDate: Date | null }>,
    scope: SnapshotScope
): ISnapshotEntry[] {
    return users.map((u) => {
        const entry: ISnapshotEntry = { userId: u.userId };
        if (scope === "coin" || scope === "all") entry.coin = u.coin;
        if (scope === "gem" || scope === "all") entry.gem = u.gem;
        if (scope === "streak" || scope === "all") {
            entry.prayStreak = u.prayStreak;
            entry.lastStreakDate = u.lastStreakDate;
        }
        return entry;
    });
}

async function pruneOldSnapshots(guildId: string): Promise<void> {
    const snapshotCount = await EconomySnapshotModel.countDocuments({ guildId });
    if (snapshotCount <= 10) return;

    const oldest = await EconomySnapshotModel.findOne({ guildId, restoredAt: { $ne: null } }).sort({
        createdAt: 1,
    });
    if (oldest) {
        await EconomySnapshotModel.deleteOne({ _id: oldest._id });
    } else {
        const oldestAny = await EconomySnapshotModel.findOne({ guildId }).sort({ createdAt: 1 });
        if (oldestAny) await EconomySnapshotModel.deleteOne({ _id: oldestAny._id });
    }
}

async function resetEconomy(
    guildId: string,
    scope: SnapshotScope,
    target: string,
    adminId: string
): Promise<ResetResult> {
    const filter: QueryFilter<IUserEconomy> = { guildId };
    if (target !== "server") filter.userId = target;

    const projection: Record<string, number> = { userId: 1 };
    if (scope === "coin" || scope === "all") projection.coin = 1;
    if (scope === "gem" || scope === "all") projection.gem = 1;
    if (scope === "streak" || scope === "all") {
        projection.prayStreak = 1;
        projection.lastStreakDate = 1;
    }

    const users = await UserEconomyModel.find(filter).select(projection).lean();

    const snapshotId = generateSnapshotId();
    const data = buildSnapshotData(users, scope);

    await EconomySnapshotModel.create({
        snapshotId,
        guildId,
        createdBy: adminId,
        scope,
        target,
        data,
    });

    await pruneOldSnapshots(guildId);

    const updateSet: UpdateQuery<IUserEconomy>["$set"] = {};
    if (scope === "coin" || scope === "all") updateSet.coin = 0;
    if (scope === "gem" || scope === "all") updateSet.gem = 0;
    if (scope === "streak" || scope === "all") {
        updateSet.prayStreak = 0;
        updateSet.lastStreakDate = null;
    }

    const result = await UserEconomyModel.updateMany(filter, { $set: updateSet });

    if (users.length > 0) {
        const txDocs = users.map((u) => ({
            userId: u.userId,
            guildId,
            type: "reset" as const,
            coinDelta: scope === "coin" || scope === "all" ? -(u.coin ?? 0) : 0,
            gemDelta: scope === "gem" || scope === "all" ? -(u.gem ?? 0) : 0,
            metadata: { scope, snapshotId },
        }));
        await TransactionModel.insertMany(txDocs);
    }

    return { snapshotId, affectedCount: result.modifiedCount };
}

interface RollbackResult {
    restoredCount: number;
}

async function rollbackSnapshot(snapshotId: string, guildId: string): Promise<RollbackResult> {
    const snapshot = await EconomySnapshotModel.findOne({ snapshotId, guildId, restoredAt: null });
    if (!snapshot) throw new Error("SNAPSHOT_NOT_FOUND");

    const bulkOps = snapshot.data.map((entry) => {
        const setFields: UpdateQuery<IUserEconomy>["$set"] = {};
        if (entry.coin !== undefined) setFields.coin = entry.coin;
        if (entry.gem !== undefined) setFields.gem = entry.gem;
        if (entry.prayStreak !== undefined) setFields.prayStreak = entry.prayStreak;
        if (entry.lastStreakDate !== undefined) setFields.lastStreakDate = entry.lastStreakDate;

        return {
            updateOne: {
                filter: { userId: entry.userId, guildId },
                update: { $set: setFields },
                upsert: true,
            },
        };
    });

    if (bulkOps.length > 0) {
        await UserEconomyModel.bulkWrite(bulkOps);
    }

    snapshot.restoredAt = new Date();
    await snapshot.save();

    if (snapshot.data.length > 0) {
        // NOTE: coinDelta records the restored absolute value, not the actual delta from current balance. By design.
        const txDocs = snapshot.data.map((entry) => ({
            userId: entry.userId,
            guildId,
            type: "rollback" as const,
            coinDelta: entry.coin ?? 0,
            gemDelta: entry.gem ?? 0,
            metadata: { snapshotId },
        }));
        await TransactionModel.insertMany(txDocs);
    }

    return { restoredCount: snapshot.data.length };
}

// ─── Transaction History ──────────────────────────────────────────────────────

interface HistoryOptions {
    userId: string;
    guildId: string;
    type?: string;
    minAmount?: number;
    page: number;
}

interface HistoryResult {
    transactions: Array<{
        shortId: string;
        type: string;
        coinDelta: number;
        gemDelta: number;
        metadata: Record<string, unknown>;
        createdAt: Date;
    }>;
    totalCount: number;
    page: number;
    totalPages: number;
}

async function getHistory(opts: HistoryOptions): Promise<HistoryResult> {
    const filter: QueryFilter<ITransaction> = { userId: opts.userId, guildId: opts.guildId };
    if (opts.type && opts.type !== "all") filter.type = opts.type;
    if (opts.minAmount) {
        filter.$or = [
            { coinDelta: { $gte: opts.minAmount } },
            { coinDelta: { $lte: -opts.minAmount } },
            { gemDelta: { $gte: opts.minAmount } },
            { gemDelta: { $lte: -opts.minAmount } },
        ];
    }

    const perPage = 10;
    const totalCount = await TransactionModel.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const page = Math.min(opts.page, totalPages - 1);

    const docs = await TransactionModel.find(filter)
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
            metadata: (d.metadata ?? {}) as Record<string, unknown>,
            createdAt: d.createdAt,
        })),
        totalCount,
        page,
        totalPages,
    };
}

// ─── Reverse Transaction ──────────────────────────────────────────────────────

async function reverseTransaction(
    shortId: string,
    guildId: string,
    adminId: string
): Promise<{ original: { type: string; coinDelta: number; gemDelta: number }; reversedId: string }> {
    if (!/^[a-f0-9]+$/i.test(shortId)) throw new Error("TRANSACTION_NOT_FOUND");
    if (shortId.length > 24) throw new Error("INVALID_ID");
    const regex = new RegExp(`${shortId}$`);
    const matches = await TransactionModel.find({ guildId, _id: { $regex: regex } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    if (matches.length === 0) throw new Error("TRANSACTION_NOT_FOUND");
    if (matches.length > 1) throw new Error("AMBIGUOUS_ID");

    const original = matches[0]!;

    const nonReversibleTypes = ["level_up", "voice_reward", "reset", "rollback", "reverse"];
    if (nonReversibleTypes.includes(original.type)) throw new Error("NOT_REVERSIBLE");
    if (original.metadata?.reversed) throw new Error("ALREADY_REVERSED");

    // Atomic reversal — clamp to zero when taking back, add back when restoring
    const filter = { userId: original.userId, guildId };
    const coinExpr =
        original.coinDelta > 0
            ? { $max: [{ $subtract: ["$coin", original.coinDelta] }, 0] }
            : original.coinDelta < 0
              ? { $add: ["$coin", -original.coinDelta] }
              : "$coin";
    const gemExpr =
        original.gemDelta > 0
            ? { $max: [{ $subtract: ["$gem", original.gemDelta] }, 0] }
            : original.gemDelta < 0
              ? { $add: ["$gem", -original.gemDelta] }
              : "$gem";
    await UserEconomyModel.updateOne(filter, [{ $set: { coin: coinExpr, gem: gemExpr } }]);

    const reverseTx = await TransactionModel.create({
        userId: original.userId,
        guildId,
        type: "reverse",
        coinDelta: -original.coinDelta,
        gemDelta: -original.gemDelta,
        metadata: { originalTransactionId: original._id.toString(), originalType: original.type },
    });

    await TransactionModel.updateOne(
        { _id: original._id },
        { $set: { "metadata.reversed": true, "metadata.reversedBy": adminId } }
    );

    return {
        original: { type: original.type, coinDelta: original.coinDelta, gemDelta: original.gemDelta },
        reversedId: reverseTx._id.toString().slice(-6),
    };
}

// ─── Count Affected ───────────────────────────────────────────────────────────

async function countAffected(guildId: string, scope: SnapshotScope, target: string): Promise<number> {
    const filter: QueryFilter<IUserEconomy> = { guildId };
    if (target !== "server") filter.userId = target;

    if (scope === "coin") filter.coin = { $gt: 0 };
    else if (scope === "gem") filter.gem = { $gt: 0 };
    else if (scope === "streak") filter.prayStreak = { $gt: 0 };

    return UserEconomyModel.countDocuments(filter);
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

export default EconomyAdminService;
