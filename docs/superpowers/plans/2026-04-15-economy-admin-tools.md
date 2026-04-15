# Economy Admin Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive admin tools to the `/economy` command — dashboard, audit, log channel, reset/snapshot, bulk operations — by restructuring from flat subcommands into subcommand groups.

**Architecture:** Restructure `/economy` into 4 subcommand groups (`balance`, `config`, `admin`, `bulk`). Add 3 new Mongoose models (`EconomySnapshot`, `EconomyLogConfig`, `EconomyFreeze`), 3 new services (`economyAdmin`, `economyBulk`, `economyLog`), and a shared freeze-check utility. All confirmations use `awaitMessageComponent()` collectors. Log channel is fire-and-forget.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose 8, ioredis, Node.js crypto

**Spec:** `docs/superpowers/specs/2026-04-15-economy-admin-tools-design.md`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/models/economySnapshot.model.ts` | Mongoose schema for economy snapshots before reset |
| `src/models/economyLogConfig.model.ts` | Mongoose schema for per-guild log channel config |
| `src/models/economyFreeze.model.ts` | Mongoose schema for frozen user records |
| `src/services/economy/economyAdmin.service.ts` | Dashboard aggregation, reset/rollback, freeze/unfreeze |
| `src/services/economy/economyBulk.service.ts` | Bulk distribute/tax logic |
| `src/services/economy/economyLog.service.ts` | Log channel: shouldLog + sendLog |

### Modified files

| File | Change |
|---|---|
| `src/models/transaction.model.ts` | Add 5 new transaction types to union (line 3) and enum (line 58) |
| `src/commands/slash/economy.ts` | Full rewrite: flat subcommands → 4 subcommand groups + new admin/bulk subcommands |
| `src/commands/slash/pray.ts` | Add freeze check after deferReply (line 72) |
| `src/commands/slash/curse.ts` | Add freeze check after deferReply (line 56) |
| `src/commands/slash/work.ts` | Add freeze check after deferReply (line 45) |
| `src/commands/slash/gamble.ts` | Add freeze check after deferReply (line 74) |
| `src/commands/slash/gift.ts` | Add freeze check after deferReply (line 46) |
| `src/commands/slash/rob.ts` | Add freeze check after deferReply (line 44) |
| `src/commands/slash/shop.ts` | Add freeze check in handleBuy (line 66) |
| `src/commands/slash/mine.ts` | Add freeze check after deferReply (line 27) |
| `src/commands/slash/dungeon.ts` | Add freeze check after deferReply (line 449) |
| `src/locales/en.json` | Add ~60 new translation keys for admin features |
| `src/locales/*.json` (14 other locales) | Add matching translated keys |

---

## Task 1: Add Transaction Types

**Files:**
- Modify: `src/models/transaction.model.ts:3-40` (union) and `src/models/transaction.model.ts:58-96` (enum)

- [ ] **Step 1: Add new types to the TypeScript union**

In `src/models/transaction.model.ts`, add these 5 types before the closing semicolon at line 40:

```typescript
    | "quest_streak"
    | "bulk_distribute"
    | "bulk_tax"
    | "reverse"
    | "reset"
    | "rollback";
```

- [ ] **Step 2: Add matching entries to the schema enum array**

In the same file, add to the enum array before the closing bracket at line 96:

```typescript
                "quest_streak",
                "bulk_distribute",
                "bulk_tax",
                "reverse",
                "reset",
                "rollback",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (or only pre-existing unrelated errors)

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add admin transaction types to Transaction model"
```

---

## Task 2: EconomyFreeze Model

**Files:**
- Create: `src/models/economyFreeze.model.ts`

- [ ] **Step 1: Create the model**

Create `src/models/economyFreeze.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface IEconomyFreeze extends Document {
    userId: string;
    guildId: string;
    frozenBy: string;
    reason: string;
    createdAt: Date;
}

const economyFreezeSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        frozenBy: { type: String, required: true },
        reason: { type: String, default: "" },
    },
    {
        timestamps: true,
        collection: "EconomyFreezes",
    }
);

economyFreezeSchema.index({ userId: 1, guildId: 1 }, { unique: true });

const EconomyFreezeModel = model<IEconomyFreeze>("EconomyFreeze", economyFreezeSchema);

export default EconomyFreezeModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/economyFreeze.model.ts
git commit -m "feat(economy): add EconomyFreeze model"
```

---

## Task 3: EconomyLogConfig Model

**Files:**
- Create: `src/models/economyLogConfig.model.ts`

- [ ] **Step 1: Create the model**

Create `src/models/economyLogConfig.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface IEconomyLogThresholds {
    coinTransaction: number;
    gemTransaction: number;
    gamblingWin: number;
    robSuccess: boolean;
    adminActions: boolean;
    bulkOperations: boolean;
}

export interface IEconomyLogConfig extends Document {
    guildId: string;
    channelId: string;
    enabled: boolean;
    thresholds: IEconomyLogThresholds;
}

const economyLogConfigSchema = new Schema(
    {
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        thresholds: {
            coinTransaction: { type: Number, default: 500 },
            gemTransaction: { type: Number, default: 5 },
            gamblingWin: { type: Number, default: 1000 },
            robSuccess: { type: Boolean, default: true },
            adminActions: { type: Boolean, default: true },
            bulkOperations: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
        collection: "EconomyLogConfigs",
    }
);

economyLogConfigSchema.index({ guildId: 1 }, { unique: true });

const EconomyLogConfigModel = model<IEconomyLogConfig>("EconomyLogConfig", economyLogConfigSchema);

export default EconomyLogConfigModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/economyLogConfig.model.ts
git commit -m "feat(economy): add EconomyLogConfig model"
```

---

## Task 4: EconomySnapshot Model

**Files:**
- Create: `src/models/economySnapshot.model.ts`

- [ ] **Step 1: Create the model**

Create `src/models/economySnapshot.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface ISnapshotEntry {
    userId: string;
    coin?: number;
    gem?: number;
    prayStreak?: number;
    lastStreakDate?: Date | null;
}

export type SnapshotScope = "coin" | "gem" | "streak" | "all";

export interface IEconomySnapshot extends Document {
    snapshotId: string;
    guildId: string;
    createdBy: string;
    scope: SnapshotScope;
    target: string;
    data: ISnapshotEntry[];
    restoredAt: Date | null;
    createdAt: Date;
}

const economySnapshotSchema = new Schema(
    {
        snapshotId: { type: String, required: true },
        guildId: { type: String, required: true },
        createdBy: { type: String, required: true },
        scope: { type: String, enum: ["coin", "gem", "streak", "all"], required: true },
        target: { type: String, required: true },
        data: [
            {
                userId: { type: String, required: true },
                coin: { type: Number },
                gem: { type: Number },
                prayStreak: { type: Number },
                lastStreakDate: { type: Date },
            },
        ],
        restoredAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "EconomySnapshots",
    }
);

economySnapshotSchema.index({ guildId: 1, createdAt: -1 });
economySnapshotSchema.index({ snapshotId: 1 }, { unique: true });

const EconomySnapshotModel = model<IEconomySnapshot>("EconomySnapshot", economySnapshotSchema);

export default EconomySnapshotModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/economySnapshot.model.ts
git commit -m "feat(economy): add EconomySnapshot model"
```

---

## Task 5: EconomyLog Service

**Files:**
- Create: `src/services/economy/economyLog.service.ts`

- [ ] **Step 1: Create the service**

Create `src/services/economy/economyLog.service.ts`:

```typescript
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import redis from "../../connector/redis";
import EconomyLogConfigModel, { IEconomyLogConfig } from "../../models/economyLogConfig.model";
import logger from "../../util/log/logger.mixed";

type LogEventType = "coin_transaction" | "gem_transaction" | "gambling_win" | "rob_success" | "admin_action" | "bulk_operation" | "freeze" | "reset";

let clientRef: Client | null = null;

function setClient(client: Client): void {
    clientRef = client;
}

async function getConfig(guildId: string): Promise<IEconomyLogConfig | null> {
    const cacheKey = `eco_log_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached === "none") return null;
    if (cached) return cached as IEconomyLogConfig;

    const config = await EconomyLogConfigModel.findOne({ guildId });
    if (!config) {
        await redis.setJson(cacheKey, "none", 300);
        return null;
    }
    await redis.setJson(cacheKey, config.toObject(), 300);
    return config;
}

async function shouldLog(guildId: string, eventType: LogEventType, amount?: number): Promise<boolean> {
    const config = await getConfig(guildId);
    if (!config || !config.enabled) return false;

    switch (eventType) {
        case "coin_transaction":
            return amount !== undefined && Math.abs(amount) >= config.thresholds.coinTransaction;
        case "gem_transaction":
            return amount !== undefined && Math.abs(amount) >= config.thresholds.gemTransaction;
        case "gambling_win":
            return amount !== undefined && amount >= config.thresholds.gamblingWin;
        case "rob_success":
            return config.thresholds.robSuccess;
        case "admin_action":
            return config.thresholds.adminActions;
        case "bulk_operation":
            return config.thresholds.bulkOperations;
        case "freeze":
            return config.thresholds.adminActions;
        case "reset":
            return config.thresholds.adminActions;
        default:
            return false;
    }
}

async function sendLog(guildId: string, embed: EmbedBuilder): Promise<void> {
    try {
        if (!clientRef) return;
        const config = await getConfig(guildId);
        if (!config || !config.enabled) return;

        const channel = await clientRef.channels.fetch(config.channelId).catch(() => null);
        if (!channel || !(channel instanceof TextChannel)) return;

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.warn("Economy log send failed for guild %s: %s", guildId, error instanceof Error ? error.message : "Unknown");
    }
}

async function invalidateConfigCache(guildId: string): Promise<void> {
    await redis.deleteKey(`eco_log_config:${guildId}`);
}

const EconomyLogService = {
    setClient,
    getConfig,
    shouldLog,
    sendLog,
    invalidateConfigCache,
};

export default EconomyLogService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/economyLog.service.ts
git commit -m "feat(economy): add EconomyLog service for log channel"
```

---

## Task 6: EconomyAdmin Service — Freeze & Dashboard

**Files:**
- Create: `src/services/economy/economyAdmin.service.ts`

- [ ] **Step 1: Create the service with freeze and dashboard logic**

Create `src/services/economy/economyAdmin.service.ts`:

```typescript
import redis from "../../connector/redis";
import EconomyFreezeModel from "../../models/economyFreeze.model";
import UserEconomyModel from "../../models/userEconomy.model";
import TransactionModel from "../../models/transaction.model";
import EconomySnapshotModel, { type ISnapshotEntry, type SnapshotScope } from "../../models/economySnapshot.model";
import { randomBytes } from "node:crypto";

function generateSnapshotId(): string {
    return randomBytes(4).toString("hex");
}

// ─── Freeze ────────────────────────────────────────────────

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

// ─── Dashboard ─────────────────────────────────────────────

interface CirculationStats {
    totalCoin: number;
    totalGem: number;
    activeUsers: number;
    topRichest: Array<{ userId: string; coin: number; gem: number }>;
}

async function getCirculation(guildId: string): Promise<CirculationStats> {
    const [agg] = await UserEconomyModel.aggregate([
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

interface FlowStats {
    coinEarned: number;
    coinSpent: number;
    coinNet: number;
    gemEarned: number;
    gemSpent: number;
}

async function getFlow24h(guildId: string): Promise<FlowStats> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [agg] = await TransactionModel.aggregate([
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

interface SourceBreakdown {
    type: string;
    total: number;
    pct: number;
}

async function getSourceBreakdown(guildId: string, direction: "earn" | "sink"): Promise<SourceBreakdown[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const matchCond = direction === "earn" ? { $gt: ["$coinDelta", 0] } : { $lt: ["$coinDelta", 0] };

    const results = await TransactionModel.aggregate([
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
        type: r._id as string,
        total: r.total as number,
        pct: grandTotal > 0 ? Math.round(((r.total as number) / grandTotal) * 100) : 0,
    }));
}

interface WealthBucket {
    label: string;
    count: number;
}

async function getWealthDistribution(guildId: string): Promise<WealthBucket[]> {
    const buckets = await UserEconomyModel.aggregate([
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
        label: labels[b._id as number] ?? `${b._id}+`,
        count: b.count as number,
    }));
}

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

    const [thisWeek] = await TransactionModel.aggregate([
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

    const [lastWeek] = await TransactionModel.aggregate([
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

interface AnomalyAlert {
    type: "earning_spike" | "gambling_abuse" | "rob_target";
    userId: string;
    value: number;
    threshold: number;
}

async function detectAnomalies(guildId: string): Promise<AnomalyAlert[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alerts: AnomalyAlert[] = [];

    // Earning spikes: users earning > 3x average
    const earningsByUser = await TransactionModel.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, coinDelta: { $gt: 0 } } },
        { $group: { _id: "$userId", total: { $sum: "$coinDelta" } } },
    ]);

    if (earningsByUser.length > 1) {
        const avg = earningsByUser.reduce((s, u) => s + (u.total as number), 0) / earningsByUser.length;
        const threshold = avg * 3;
        for (const u of earningsByUser) {
            if ((u.total as number) > threshold) {
                alerts.push({ type: "earning_spike", userId: u._id as string, value: u.total as number, threshold: Math.round(threshold) });
            }
        }
    }

    // Gambling abuse: > 20 gambling transactions
    const gamblingAbuse = await TransactionModel.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, type: "gambling" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 20 } } },
    ]);
    for (const u of gamblingAbuse) {
        alerts.push({ type: "gambling_abuse", userId: u._id as string, value: u.count as number, threshold: 20 });
    }

    // Rob target: robbed >= 3 times
    const robTargets = await TransactionModel.aggregate([
        { $match: { guildId, createdAt: { $gte: since }, type: "rob", coinDelta: { $gt: 0 } } },
        { $group: { _id: "$metadata.targetId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
    ]);
    for (const u of robTargets) {
        if (u._id) {
            alerts.push({ type: "rob_target", userId: u._id as string, value: u.count as number, threshold: 3 });
        }
    }

    return alerts;
}

// ─── Reset & Snapshot ──────────────────────────────────────

interface ResetResult {
    snapshotId: string;
    affectedCount: number;
}

async function resetEconomy(
    guildId: string,
    scope: SnapshotScope,
    target: string,
    adminId: string
): Promise<ResetResult> {
    const filter: Record<string, unknown> = { guildId };
    if (target !== "server") filter.userId = target;

    // Build scope-specific projection for snapshot
    const projection: Record<string, number> = { userId: 1 };
    if (scope === "coin" || scope === "all") projection.coin = 1;
    if (scope === "gem" || scope === "all") projection.gem = 1;
    if (scope === "streak" || scope === "all") {
        projection.prayStreak = 1;
        projection.lastStreakDate = 1;
    }

    const users = await UserEconomyModel.find(filter).select(projection).lean();

    // Create snapshot
    const snapshotId = generateSnapshotId();
    const data: ISnapshotEntry[] = users.map((u) => {
        const entry: ISnapshotEntry = { userId: u.userId };
        if (scope === "coin" || scope === "all") entry.coin = u.coin;
        if (scope === "gem" || scope === "all") entry.gem = u.gem;
        if (scope === "streak" || scope === "all") {
            entry.prayStreak = u.prayStreak;
            entry.lastStreakDate = u.lastStreakDate;
        }
        return entry;
    });

    await EconomySnapshotModel.create({
        snapshotId,
        guildId,
        createdBy: adminId,
        scope,
        target,
        data,
    });

    // Enforce max 10 snapshots per guild
    const snapshotCount = await EconomySnapshotModel.countDocuments({ guildId });
    if (snapshotCount > 10) {
        const oldest = await EconomySnapshotModel.findOne({ guildId, restoredAt: { $ne: null } }).sort({ createdAt: 1 });
        if (oldest) {
            await EconomySnapshotModel.deleteOne({ _id: oldest._id });
        } else {
            const oldestAny = await EconomySnapshotModel.findOne({ guildId }).sort({ createdAt: 1 });
            if (oldestAny) await EconomySnapshotModel.deleteOne({ _id: oldestAny._id });
        }
    }

    // Execute reset
    const updateSet: Record<string, unknown> = {};
    if (scope === "coin" || scope === "all") updateSet.coin = 0;
    if (scope === "gem" || scope === "all") updateSet.gem = 0;
    if (scope === "streak" || scope === "all") {
        updateSet.prayStreak = 0;
        updateSet.lastStreakDate = null;
    }

    const result = await UserEconomyModel.updateMany(filter, { $set: updateSet });

    // Bulk log reset transactions
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
        const setFields: Record<string, unknown> = {};
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

    // Log rollback transactions
    if (snapshot.data.length > 0) {
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

// ─── Transaction History ───────────────────────────────────

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
    const filter: Record<string, unknown> = { userId: opts.userId, guildId: opts.guildId };
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
            metadata: d.metadata ?? {},
            createdAt: d.createdAt,
        })),
        totalCount,
        page,
        totalPages,
    };
}

// ─── Reverse Transaction ───────────────────────────────────

async function reverseTransaction(shortId: string, guildId: string, adminId: string): Promise<{ original: { type: string; coinDelta: number; gemDelta: number }; reversedId: string }> {
    // Find by last 6 chars of _id
    const candidates = await TransactionModel.find({ guildId }).sort({ createdAt: -1 }).limit(5000).lean();
    const matches = candidates.filter((t) => t._id.toString().slice(-6) === shortId);

    if (matches.length === 0) throw new Error("TRANSACTION_NOT_FOUND");
    if (matches.length > 1) throw new Error("AMBIGUOUS_ID");

    const original = matches[0]!;

    const nonReversibleTypes = ["level_up", "voice_reward", "reset", "rollback", "reverse"];
    if (nonReversibleTypes.includes(original.type)) throw new Error("NOT_REVERSIBLE");
    if (original.metadata?.reversed) throw new Error("ALREADY_REVERSED");

    // Apply reverse
    if (original.coinDelta !== 0) {
        await UserEconomyModel.findOneAndUpdate(
            { userId: original.userId, guildId },
            { $inc: { coin: -original.coinDelta } }
        );
    }
    if (original.gemDelta !== 0) {
        await UserEconomyModel.findOneAndUpdate(
            { userId: original.userId, guildId },
            { $inc: { gem: -original.gemDelta } }
        );
    }

    // Log reverse transaction
    const reverseTx = await TransactionModel.create({
        userId: original.userId,
        guildId,
        type: "reverse",
        coinDelta: -original.coinDelta,
        gemDelta: -original.gemDelta,
        metadata: { originalTransactionId: original._id.toString(), originalType: original.type },
    });

    // Mark original as reversed
    await TransactionModel.updateOne(
        { _id: original._id },
        { $set: { "metadata.reversed": true, "metadata.reversedBy": adminId } }
    );

    return {
        original: { type: original.type, coinDelta: original.coinDelta, gemDelta: original.gemDelta },
        reversedId: reverseTx._id.toString().slice(-6),
    };
}

// ─── Count affected users (for confirmation gates) ────────

async function countAffected(guildId: string, scope: SnapshotScope, target: string): Promise<number> {
    const filter: Record<string, unknown> = { guildId };
    if (target !== "server") filter.userId = target;

    if (scope === "coin") filter.coin = { $gt: 0 };
    else if (scope === "gem") filter.gem = { $gt: 0 };
    else if (scope === "streak") filter.prayStreak = { $gt: 0 };

    return UserEconomyModel.countDocuments(filter);
}

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/economyAdmin.service.ts
git commit -m "feat(economy): add EconomyAdmin service with freeze, dashboard, reset, audit"
```

---

## Task 7: EconomyBulk Service

**Files:**
- Create: `src/services/economy/economyBulk.service.ts`

- [ ] **Step 1: Create the service**

Create `src/services/economy/economyBulk.service.ts`:

```typescript
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

    // Use aggregation pipeline update to clamp to 0
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

    // Log transactions — actual delta may be less than amount if user had less
    // For simplicity, log the requested amount (clamped users lose less but tracking exact delta
    // per user would require reading all balances first, which is expensive for bulk ops)
    const txDocs = userIds.map((userId) => ({
        userId,
        guildId,
        type: "bulk_tax" as const,
        coinDelta: currency === "coin" ? -amount : 0,
        gemDelta: currency === "gem" ? -amount : 0,
        metadata: { roleId, affectedCount: userIds.length, amountEach: amount, adminId },
    }));

    if (txDocs.length > 0) {
        await TransactionModel.insertMany(txDocs);
    }

    await setCooldown(guildId);
    return { affectedCount: userIds.length, totalAmount: amount * userIds.length };
}

const EconomyBulkService = {
    checkCooldown,
    distribute,
    tax,
};

export default EconomyBulkService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/economyBulk.service.ts
git commit -m "feat(economy): add EconomyBulk service for distribute and tax"
```

---

## Task 8: i18n Keys — English

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add English translation keys**

Add the following keys to `src/locales/en.json` (after the existing `economy.reward_config.*` keys):

```json
    "common.frozen": "Your economy access in this server has been frozen by an admin. Contact a server admin for more info.",
    "cmd.economy.desc": "Economy management (admin)",
    "cmd.economy.balance.desc": "Manage user currency",
    "cmd.economy.config.desc": "Configure economy subsystems",
    "cmd.economy.admin.desc": "Admin tools: dashboard, audit, reset, logs",
    "cmd.economy.bulk.desc": "Bulk currency operations",
    "cmd.economy.admin.dashboard.desc": "View server economy dashboard",
    "cmd.economy.admin.history.desc": "View a user's transaction history",
    "cmd.economy.admin.history.user.desc": "User to inspect",
    "cmd.economy.admin.history.type.desc": "Filter by transaction type",
    "cmd.economy.admin.history.min_amount.desc": "Minimum transaction amount",
    "cmd.economy.admin.reverse.desc": "Reverse a specific transaction",
    "cmd.economy.admin.reverse.id.desc": "Transaction short ID (last 6 characters)",
    "cmd.economy.admin.freeze.desc": "Freeze a user's economy access",
    "cmd.economy.admin.freeze.user.desc": "User to freeze",
    "cmd.economy.admin.freeze.reason.desc": "Reason for freezing",
    "cmd.economy.admin.unfreeze.desc": "Unfreeze a user's economy access",
    "cmd.economy.admin.unfreeze.user.desc": "User to unfreeze",
    "cmd.economy.admin.reset.desc": "Reset economy (auto-snapshots before reset)",
    "cmd.economy.admin.reset.scope.desc": "What to reset",
    "cmd.economy.admin.reset.target.desc": "Specific user (blank = entire server)",
    "cmd.economy.admin.rollback.desc": "Restore from a snapshot",
    "cmd.economy.admin.rollback.id.desc": "Snapshot ID",
    "cmd.economy.admin.log_setup.desc": "Set the economy log channel",
    "cmd.economy.admin.log_setup.channel.desc": "Text channel for economy logs",
    "cmd.economy.admin.log_config.desc": "Configure log thresholds",
    "cmd.economy.admin.log_config.setting.desc": "Setting to change",
    "cmd.economy.admin.log_config.value.desc": "New value (number for thresholds, 0/1 for toggles)",
    "cmd.economy.bulk.distribute.desc": "Distribute currency to members",
    "cmd.economy.bulk.distribute.amount.desc": "Amount per member",
    "cmd.economy.bulk.distribute.currency.desc": "Currency type",
    "cmd.economy.bulk.distribute.role.desc": "Only members with this role (blank = all)",
    "cmd.economy.bulk.tax.desc": "Collect currency from members",
    "cmd.economy.bulk.tax.amount.desc": "Amount per member",
    "cmd.economy.bulk.tax.currency.desc": "Currency type",
    "cmd.economy.bulk.tax.role.desc": "Only members with this role (blank = all)",
    "economy.admin.dashboard.title": "Economy Dashboard",
    "economy.admin.dashboard.circulation": "Circulation",
    "economy.admin.dashboard.circulation_value": "**{{totalCoin}}** coin | **{{totalGem}}** gem\n**{{activeUsers}}** users with balance > 0",
    "economy.admin.dashboard.top_richest": "Top Richest",
    "economy.admin.dashboard.flow_24h": "Coin Flow (24h)",
    "economy.admin.dashboard.flow_value": "Earned: **+{{earned}}**\nSpent: **-{{spent}}**\nNet: **{{net}}** {{direction}}",
    "economy.admin.dashboard.inflationary": "(inflationary)",
    "economy.admin.dashboard.deflationary": "(deflationary)",
    "economy.admin.dashboard.sources": "Top Sources (24h)",
    "economy.admin.dashboard.sinks": "Top Sinks (24h)",
    "economy.admin.dashboard.wealth": "Wealth Distribution",
    "economy.admin.dashboard.week_compare": "Week over Week",
    "economy.admin.dashboard.week_value": "This week: **+{{thisWeek}}** coin ({{changePct}}% vs last)\nActive: **{{thisActive}}** ({{activeDelta}})",
    "economy.admin.dashboard.anomalies": "Anomaly Alerts",
    "economy.admin.dashboard.anomaly_earning": "<@{{userId}}> earned **{{value}}** coin (threshold: {{threshold}})",
    "economy.admin.dashboard.anomaly_gambling": "<@{{userId}}> made **{{value}}** gambling bets (threshold: {{threshold}})",
    "economy.admin.dashboard.anomaly_rob": "<@{{userId}}> was robbed **{{value}}** times (threshold: {{threshold}})",
    "economy.admin.dashboard.no_anomalies": "No anomalies detected.",
    "economy.admin.history.title": "Transaction History — {{username}}",
    "economy.admin.history.empty": "No transactions found.",
    "economy.admin.history.page": "Page {{current}}/{{total}} ({{count}} total)",
    "economy.admin.reverse.success": "Transaction `#{{shortId}}` reversed.\nOriginal: {{type}} ({{coinDelta}} coin, {{gemDelta}} gem)\nReverse ID: `#{{reversedId}}`",
    "economy.admin.reverse.not_found": "Transaction not found. Check the short ID.",
    "economy.admin.reverse.ambiguous": "Multiple matches for that ID. Provide more characters.",
    "economy.admin.reverse.already_reversed": "This transaction has already been reversed.",
    "economy.admin.reverse.not_reversible": "This transaction type cannot be reversed.",
    "economy.admin.freeze.success": "Froze <@{{userId}}>'s economy access.{{reason}}",
    "economy.admin.freeze.reason_suffix": " Reason: {{reason}}",
    "economy.admin.unfreeze.success": "Unfroze <@{{userId}}>'s economy access.",
    "economy.admin.unfreeze.not_found": "User is not frozen.",
    "economy.admin.reset.confirm_title": "Confirm Economy Reset",
    "economy.admin.reset.confirm_desc": "**Scope:** {{scope}}\n**Target:** {{target}}\n**Affected users:** {{count}}\n\nThis will create a snapshot before resetting. Are you sure?",
    "economy.admin.reset.success": "Economy reset complete.\n**Scope:** {{scope}} | **Affected:** {{count}} users\n**Snapshot ID:** `{{snapshotId}}` (use for rollback)",
    "economy.admin.reset.cancelled": "Reset cancelled.",
    "economy.admin.reset.timeout": "Reset timed out. No changes made.",
    "economy.admin.rollback.confirm_title": "Confirm Rollback",
    "economy.admin.rollback.confirm_desc": "**Snapshot:** `{{snapshotId}}`\n**Scope:** {{scope}}\n**Date:** {{date}}\n**Users:** {{count}}\n\nRestore these values?",
    "economy.admin.rollback.success": "Rollback complete.\n**Restored:** {{count}} users\n**Scope:** {{scope}}",
    "economy.admin.rollback.not_found": "Snapshot not found or already restored.",
    "economy.admin.rollback.cancelled": "Rollback cancelled.",
    "economy.admin.rollback.timeout": "Rollback timed out. No changes made.",
    "economy.admin.log.setup_success": "Economy log channel set to <#{{channelId}}>.",
    "economy.admin.log.setup_invalid": "Invalid channel. Bot needs Send Messages and Embed Links permissions.",
    "economy.admin.log.config_updated": "Log config updated: **{{setting}}** = **{{value}}**.",
    "economy.admin.log.not_setup": "Log channel not configured. Use `log-setup` first.",
    "economy.bulk.confirm_title": "Confirm Bulk {{action}}",
    "economy.bulk.confirm_desc": "**Action:** {{action}} **{{amount}}** {{currency}}\n**Target:** {{target}}\n**Affected:** {{count}} members\n\nProceed?",
    "economy.bulk.distribute_success": "Distributed **{{amount}}** {{currency}} to **{{count}}** members.",
    "economy.bulk.tax_success": "Taxed **{{amount}}** {{currency}} from **{{count}}** members.",
    "economy.bulk.cancelled": "Bulk operation cancelled.",
    "economy.bulk.timeout": "Bulk operation timed out. No changes made.",
    "economy.bulk.cooldown": "Bulk operations are on cooldown. Try again in **{{seconds}}**s.",
    "economy.bulk.no_members": "No eligible members found.",
    "economy.log.admin_action": "Admin Action",
    "economy.log.gambling_win": "Gambling Win",
    "economy.log.rob_success": "Rob Success",
    "economy.log.bulk_op": "Bulk Operation",
    "economy.log.freeze": "Economy Freeze",
    "economy.log.unfreeze": "Economy Unfreeze",
    "economy.log.reset": "Economy Reset"
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json
git commit -m "feat(i18n): add English translation keys for economy admin tools"
```

---

## Task 9: i18n Keys — All Other Locales

**Files:**
- Modify: `src/locales/vi.json`, `src/locales/id.json`, `src/locales/es.json`, `src/locales/ja.json`, `src/locales/zh.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/fr.json`, `src/locales/de.json`, `src/locales/ru.json`, `src/locales/tr.json`, `src/locales/it.json`, `src/locales/pl.json`, `src/locales/nl.json`

- [ ] **Step 1: Add native translations for all 14 locale files**

For each locale file, add the same keys from Task 8 with proper native translations. Every key must have a native translation — never use English placeholders in non-EN files. The interpolation variables (e.g., `{{userId}}`, `{{amount}}`) must remain unchanged in all locales.

Process each file one by one. Use the existing translations in each file as reference for tone and style. Key patterns to translate:
- Command descriptions (`cmd.economy.*`) — short, imperative
- UI labels (`economy.admin.dashboard.*`) — concise field names
- Messages (`economy.admin.reset.success`, `economy.bulk.*`) — natural conversational tone
- Error messages (`economy.admin.reverse.not_found`) — clear and helpful

- [ ] **Step 2: Verify all locale files are valid JSON**

Run for each file:
```bash
for f in src/locales/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "OK: $f" || echo "FAIL: $f"; done
```
Expected: All files OK

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add economy admin translations for all 14 locales"
```

---

## Task 10: Restructure `/economy` Command — Balance & Config Groups

**Files:**
- Modify: `src/commands/slash/economy.ts`

This is the largest task. The file will be rewritten to use subcommand groups instead of flat subcommands. This task handles the `balance` and `config` groups (existing functionality, relocated).

- [ ] **Step 1: Rewrite the SlashCommandBuilder**

Replace the entire `data` property in `src/commands/slash/economy.ts`. The builder changes from `.addSubcommand()` to `.addSubcommandGroup()` containing `.addSubcommand()` calls.

Structure the builder as:

```typescript
data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Economy management (admin)")
    .setDescriptionLocalizations(descriptionLocales("cmd.economy.desc"))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // ─── balance group ─────────────────────────────────
    .addSubcommandGroup((group) =>
        group
            .setName("balance")
            .setDescription("Manage user currency")
            .setDescriptionLocalizations(descriptionLocales("cmd.economy.balance.desc"))
            .addSubcommand((sub) =>
                sub.setName("set-coin")
                    .setDescription("Set a user's coin")
                    .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.user.desc")).setRequired(true))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Coin amount").setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.amount.desc")).setMinValue(0).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("add-coin")
                    .setDescription("Add coin to a user")
                    .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.user.desc")).setRequired(true))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Coin to add").setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.amount.desc")).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("set-gem")
                    .setDescription("Set a user's gem")
                    .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.user.desc")).setRequired(true))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Gem amount").setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.amount.desc")).setMinValue(0).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("add-gem")
                    .setDescription("Add gem to a user")
                    .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.user.desc")).setRequired(true))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Gem to add").setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.amount.desc")).setRequired(true))
            )
    )
    // ─── config group ──────────────────────────────────
    .addSubcommandGroup((group) =>
        group
            .setName("config")
            .setDescription("Configure economy subsystems")
            .setDescriptionLocalizations(descriptionLocales("cmd.economy.config.desc"))
            // reward subcommands (same options as current)
            .addSubcommand((sub) => sub.setName("reward-view").setDescription("View passive reward config"))
            .addSubcommand((sub) => sub.setName("reward-toggle").setDescription("Enable/disable passive rewards"))
            .addSubcommand((sub) =>
                sub.setName("reward-set").setDescription("Set a reward config value")
                    .addStringOption((opt) => opt.setName("setting").setDescription("Setting to change").setRequired(true)
                        .addChoices({ name: "level-coin-base", value: "levelUpCoinBase" }, { name: "level-coin-per-level", value: "levelUpCoinPerLevel" }, { name: "voice-interval", value: "voiceCoinInterval" }, { name: "voice-reward", value: "voiceCoinReward" }))
                    .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("reward-milestone").setDescription("Set/remove a gem milestone (gems=0 removes)")
                    .addIntegerOption((opt) => opt.setName("level").setDescription("Level for the milestone").setMinValue(1).setRequired(true))
                    .addIntegerOption((opt) => opt.setName("gems").setDescription("Gem reward (0 to remove)").setMinValue(0).setRequired(true))
            )
            // gambling subcommands
            .addSubcommand((sub) => sub.setName("gambling-view").setDescription("View gambling config"))
            .addSubcommand((sub) => sub.setName("gambling-toggle").setDescription("Enable/disable gambling"))
            .addSubcommand((sub) =>
                sub.setName("gambling-set").setDescription("Set a gambling config value")
                    .addStringOption((opt) => opt.setName("setting").setDescription("Setting to change").setRequired(true)
                        .addChoices({ name: "min-bet", value: "minBet" }, { name: "max-bet", value: "maxBet" }, { name: "cooldown", value: "cooldown" }))
                    .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true))
            )
            // work subcommands
            .addSubcommand((sub) => sub.setName("work-view").setDescription("View work & fish config"))
            .addSubcommand((sub) => sub.setName("work-toggle").setDescription("Enable/disable work & fish commands"))
            .addSubcommand((sub) =>
                sub.setName("work-set").setDescription("Set a work/fish config value")
                    .addStringOption((opt) => opt.setName("setting").setDescription("Setting to change").setRequired(true)
                        .addChoices({ name: "work-cooldown", value: "workCooldown" }, { name: "work-min-reward", value: "workMinReward" }, { name: "work-max-reward", value: "workMaxReward" }, { name: "fish-cooldown", value: "fishCooldown" }))
                    .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true))
            )
            // social subcommands
            .addSubcommand((sub) => sub.setName("social-view").setDescription("View gift & rob config"))
            .addSubcommand((sub) => sub.setName("social-toggle").setDescription("Enable/disable gift & rob commands"))
            .addSubcommand((sub) =>
                sub.setName("social-set").setDescription("Set a social config value")
                    .addStringOption((opt) => opt.setName("setting").setDescription("Setting to change").setRequired(true)
                        .addChoices({ name: "gift-max-amount", value: "giftMaxAmount" }, { name: "rob-cooldown", value: "robCooldown" }, { name: "rob-min-balance", value: "robMinBalance" }, { name: "rob-immunity-duration", value: "robImmunityDuration" }))
                    .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setMinValue(0).setRequired(true))
            )
    )
```

- [ ] **Step 2: Update the execute handler to read subcommand group**

Change the switch logic from `interaction.options.getSubcommand(true)` to also reading the group:

```typescript
const group = interaction.options.getSubcommandGroup(true);
const subcommand = interaction.options.getSubcommand(true);
```

Then route based on `group`:

```typescript
switch (group) {
    case "balance":
        embed = await handleBalance(interaction, subcommand, locale, guildId);
        break;
    case "config":
        embed = await handleConfig(interaction, subcommand, locale, guildId);
        break;
    case "admin":
        await handleAdmin(interaction, subcommand, locale, guildId);
        return;
    case "bulk":
        await handleBulk(interaction, subcommand, locale, guildId);
        return;
    default:
        await interaction.editReply(t(locale, "common.unknown_subcommand"));
        return;
}
await interaction.editReply({ embeds: [embed] });
```

Extract the existing switch cases into `handleBalance()` and `handleConfig()` functions. The logic inside each case stays identical — just moved into named functions.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "refactor(economy): restructure /economy into balance and config subcommand groups"
```

---

## Task 11: `/economy admin` Group — Dashboard Subcommand

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add the admin subcommand group to the builder**

Add after the config group in the SlashCommandBuilder chain:

```typescript
    // ─── admin group ───────────────────────────────────
    .addSubcommandGroup((group) =>
        group
            .setName("admin")
            .setDescription("Admin tools: dashboard, audit, reset, logs")
            .setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.desc"))
            .addSubcommand((sub) => sub.setName("dashboard").setDescription("View server economy dashboard").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.dashboard.desc")))
            .addSubcommand((sub) =>
                sub.setName("history").setDescription("View a user's transaction history").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.history.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("User to inspect").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.history.user.desc")).setRequired(true))
                    .addStringOption((opt) => opt.setName("type").setDescription("Filter by type").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.history.type.desc"))
                        .addChoices({ name: "all", value: "all" }, { name: "pray", value: "pray" }, { name: "curse", value: "curse" }, { name: "work", value: "work" }, { name: "fish", value: "fish" }, { name: "gambling", value: "gambling" }, { name: "gift", value: "gift" }, { name: "rob", value: "rob" }, { name: "purchase", value: "purchase" }, { name: "admin", value: "admin" }))
                    .addIntegerOption((opt) => opt.setName("min-amount").setDescription("Minimum amount").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.history.min_amount.desc")).setMinValue(1))
            )
            .addSubcommand((sub) =>
                sub.setName("reverse").setDescription("Reverse a specific transaction").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.reverse.desc"))
                    .addStringOption((opt) => opt.setName("id").setDescription("Transaction short ID").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.reverse.id.desc")).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("freeze").setDescription("Freeze a user's economy access").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.freeze.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("User to freeze").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.freeze.user.desc")).setRequired(true))
                    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.freeze.reason.desc")))
            )
            .addSubcommand((sub) =>
                sub.setName("unfreeze").setDescription("Unfreeze a user's economy access").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.unfreeze.desc"))
                    .addUserOption((opt) => opt.setName("user").setDescription("User to unfreeze").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.unfreeze.user.desc")).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("reset").setDescription("Reset economy (auto-snapshots)").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.reset.desc"))
                    .addStringOption((opt) => opt.setName("scope").setDescription("What to reset").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.reset.scope.desc")).setRequired(true)
                        .addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }, { name: "streak", value: "streak" }, { name: "all", value: "all" }))
                    .addUserOption((opt) => opt.setName("target").setDescription("Specific user (blank = server)").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.reset.target.desc")))
            )
            .addSubcommand((sub) =>
                sub.setName("rollback").setDescription("Restore from a snapshot").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.rollback.desc"))
                    .addStringOption((opt) => opt.setName("id").setDescription("Snapshot ID").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.rollback.id.desc")).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("log-setup").setDescription("Set economy log channel").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.log_setup.desc"))
                    .addChannelOption((opt) => opt.setName("channel").setDescription("Log channel").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.log_setup.channel.desc")).setRequired(true))
            )
            .addSubcommand((sub) =>
                sub.setName("log-config").setDescription("Configure log thresholds").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.log_config.desc"))
                    .addStringOption((opt) => opt.setName("setting").setDescription("Setting to change").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.log_config.setting.desc")).setRequired(true)
                        .addChoices({ name: "coin-threshold", value: "coinTransaction" }, { name: "gem-threshold", value: "gemTransaction" }, { name: "gambling-threshold", value: "gamblingWin" }, { name: "rob-success", value: "robSuccess" }, { name: "admin-actions", value: "adminActions" }, { name: "bulk-operations", value: "bulkOperations" }))
                    .addIntegerOption((opt) => opt.setName("value").setDescription("New value").setDescriptionLocalizations(descriptionLocales("cmd.economy.admin.log_config.value.desc")).setMinValue(0).setRequired(true))
            )
    )
```

- [ ] **Step 2: Implement the `handleAdmin` function — dashboard subcommand**

Add the `handleAdmin` function to `economy.ts`. Import `EconomyAdminService` at the top. For the dashboard subcommand:

```typescript
import EconomyAdminService from "../../services/economy/economyAdmin.service";

async function handleAdmin(
    interaction: ChatInputCommandInteraction,
    subcommand: string,
    locale: SupportedLocale,
    guildId: string
): Promise<void> {
    switch (subcommand) {
        case "dashboard": {
            const [circulation, flow, sources, sinks, wealth, weekComp, anomalies] = await Promise.all([
                EconomyAdminService.getCirculation(guildId),
                EconomyAdminService.getFlow24h(guildId),
                EconomyAdminService.getSourceBreakdown(guildId, "earn"),
                EconomyAdminService.getSourceBreakdown(guildId, "sink"),
                EconomyAdminService.getWealthDistribution(guildId),
                EconomyAdminService.getWeekComparison(guildId),
                EconomyAdminService.detectAnomalies(guildId),
            ]);

            const topStr = circulation.topRichest.map((u, i) => `${i + 1}. <@${u.userId}>: ${u.coin.toLocaleString()} coin, ${u.gem.toLocaleString()} gem`).join("\n") || "None";
            const sourceStr = sources.map((s) => `${s.type}: +${s.total.toLocaleString()} (${s.pct}%)`).join("\n") || "None";
            const sinkStr = sinks.map((s) => `${s.type}: -${s.total.toLocaleString()} (${s.pct}%)`).join("\n") || "None";
            const wealthStr = wealth.map((b) => `${b.label}: ${b.count} users`).join("\n") || "None";
            const direction = flow.coinNet >= 0 ? t(locale, "economy.admin.dashboard.inflationary") : t(locale, "economy.admin.dashboard.deflationary");
            const activeDelta = weekComp.thisWeekActive - weekComp.lastWeekActive;
            const activeDeltaStr = activeDelta >= 0 ? `+${activeDelta}` : `${activeDelta}`;

            const embed = new EmbedBuilder()
                .setTitle(t(locale, "economy.admin.dashboard.title"))
                .setColor(0x5865f2)
                .addFields(
                    { name: t(locale, "economy.admin.dashboard.circulation"), value: t(locale, "economy.admin.dashboard.circulation_value", { totalCoin: circulation.totalCoin.toLocaleString(), totalGem: circulation.totalGem.toLocaleString(), activeUsers: String(circulation.activeUsers) }) },
                    { name: t(locale, "economy.admin.dashboard.top_richest"), value: topStr },
                    { name: t(locale, "economy.admin.dashboard.flow_24h"), value: t(locale, "economy.admin.dashboard.flow_value", { earned: flow.coinEarned.toLocaleString(), spent: flow.coinSpent.toLocaleString(), net: flow.coinNet.toLocaleString(), direction }) },
                    { name: t(locale, "economy.admin.dashboard.sources"), value: sourceStr, inline: true },
                    { name: t(locale, "economy.admin.dashboard.sinks"), value: sinkStr, inline: true },
                    { name: t(locale, "economy.admin.dashboard.wealth"), value: wealthStr },
                    { name: t(locale, "economy.admin.dashboard.week_compare"), value: t(locale, "economy.admin.dashboard.week_value", { thisWeek: weekComp.thisWeekCoin.toLocaleString(), changePct: String(weekComp.coinChangePct), thisActive: String(weekComp.thisWeekActive), activeDelta: activeDeltaStr }) },
                );

            // Anomalies — only show if detected
            if (anomalies.length > 0) {
                const anomalyLines = anomalies.map((a) => {
                    const key = `economy.admin.dashboard.anomaly_${a.type.replace("_", "")}` as string;
                    // Use specific keys for each anomaly type
                    if (a.type === "earning_spike") return t(locale, "economy.admin.dashboard.anomaly_earning", { userId: a.userId, value: a.value.toLocaleString(), threshold: a.threshold.toLocaleString() });
                    if (a.type === "gambling_abuse") return t(locale, "economy.admin.dashboard.anomaly_gambling", { userId: a.userId, value: String(a.value), threshold: String(a.threshold) });
                    return t(locale, "economy.admin.dashboard.anomaly_rob", { userId: a.userId, value: String(a.value), threshold: String(a.threshold) });
                });
                embed.addFields({ name: t(locale, "economy.admin.dashboard.anomalies"), value: anomalyLines.join("\n") });
            }

            embed.setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // other subcommands will be added in subsequent tasks
        default:
            await interaction.editReply(t(locale, "common.unknown_subcommand"));
    }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add admin subcommand group with dashboard"
```

---

## Task 12: `/economy admin` — History, Reverse, Freeze/Unfreeze

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add history subcommand handler**

Add these cases to the `handleAdmin` switch inside `economy.ts`:

```typescript
        case "history": {
            const target = interaction.options.getUser("user", true);
            const type = interaction.options.getString("type") ?? "all";
            const minAmount = interaction.options.getInteger("min-amount") ?? undefined;
            const result = await EconomyAdminService.getHistory({ userId: target.id, guildId, type, minAmount, page: 0 });

            if (result.transactions.length === 0) {
                await interaction.editReply(t(locale, "economy.admin.history.empty"));
                return;
            }

            const lines = result.transactions.map((tx) => {
                const coinStr = tx.coinDelta !== 0 ? `${tx.coinDelta >= 0 ? "+" : ""}${tx.coinDelta} coin` : "";
                const gemStr = tx.gemDelta !== 0 ? `${tx.gemDelta >= 0 ? "+" : ""}${tx.gemDelta} gem` : "";
                const amounts = [coinStr, gemStr].filter(Boolean).join(", ");
                const date = tx.createdAt.toISOString().slice(0, 16).replace("T", " ");
                return `\`#${tx.shortId}\` | ${tx.type} | ${amounts} | ${date}`;
            }).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(t(locale, "economy.admin.history.title", { username: target.username }))
                .setDescription(lines)
                .setFooter({ text: t(locale, "economy.admin.history.page", { current: String(result.page + 1), total: String(result.totalPages), count: String(result.totalCount) }) })
                .setColor(0x5865f2);

            // Pagination — only if > 1 page
            if (result.totalPages > 1) {
                const prevBtn = new ButtonBuilder().setCustomId("eco_hist_prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(result.page === 0);
                const nextBtn = new ButtonBuilder().setCustomId("eco_hist_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(result.page >= result.totalPages - 1);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, nextBtn);

                const reply = await interaction.editReply({ embeds: [embed], components: [row] });
                let currentPage = result.page;

                const collector = reply.createMessageComponentCollector({ time: 60_000 });
                collector.on("collect", async (btn) => {
                    if (btn.user.id !== interaction.user.id) { await btn.deferUpdate(); return; }
                    currentPage += btn.customId === "eco_hist_next" ? 1 : -1;
                    const newResult = await EconomyAdminService.getHistory({ userId: target.id, guildId, type, minAmount, page: currentPage });

                    const newLines = newResult.transactions.map((tx) => {
                        const coinStr = tx.coinDelta !== 0 ? `${tx.coinDelta >= 0 ? "+" : ""}${tx.coinDelta} coin` : "";
                        const gemStr = tx.gemDelta !== 0 ? `${tx.gemDelta >= 0 ? "+" : ""}${tx.gemDelta} gem` : "";
                        const amounts = [coinStr, gemStr].filter(Boolean).join(", ");
                        const date = tx.createdAt.toISOString().slice(0, 16).replace("T", " ");
                        return `\`#${tx.shortId}\` | ${tx.type} | ${amounts} | ${date}`;
                    }).join("\n");

                    const newEmbed = new EmbedBuilder()
                        .setTitle(t(locale, "economy.admin.history.title", { username: target.username }))
                        .setDescription(newLines)
                        .setFooter({ text: t(locale, "economy.admin.history.page", { current: String(currentPage + 1), total: String(newResult.totalPages), count: String(newResult.totalCount) }) })
                        .setColor(0x5865f2);

                    prevBtn.setDisabled(currentPage === 0);
                    nextBtn.setDisabled(currentPage >= newResult.totalPages - 1);
                    await btn.update({ embeds: [newEmbed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, nextBtn)] });
                });
                collector.on("end", async () => {
                    await interaction.editReply({ components: [] }).catch(() => {});
                });
            } else {
                await interaction.editReply({ embeds: [embed] });
            }
            return;
        }
```

- [ ] **Step 2: Add reverse subcommand handler**

```typescript
        case "reverse": {
            const shortId = interaction.options.getString("id", true);
            try {
                const result = await EconomyAdminService.reverseTransaction(shortId, guildId, interaction.user.id);
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "economy.admin.reverse.success", {
                        shortId,
                        type: result.original.type,
                        coinDelta: String(result.original.coinDelta),
                        gemDelta: String(result.original.gemDelta),
                        reversedId: result.reversedId,
                    }))
                    .setColor(0x57f287);
                await interaction.editReply({ embeds: [embed] });

                // Fire-and-forget log
                EconomyLogService.shouldLog(guildId, "admin_action").then((should) => {
                    if (!should) return;
                    const logEmbed = new EmbedBuilder()
                        .setTitle(t("en", "economy.log.admin_action"))
                        .setDescription(`<@${interaction.user.id}> reversed transaction \`#${shortId}\` (${result.original.type}: ${result.original.coinDelta} coin, ${result.original.gemDelta} gem)`)
                        .setColor(0xfee75c)
                        .setTimestamp();
                    EconomyLogService.sendLog(guildId, logEmbed);
                }).catch(() => {});
            } catch (error) {
                const msg = error instanceof Error ? error.message : "";
                if (msg === "TRANSACTION_NOT_FOUND") { await interaction.editReply(t(locale, "economy.admin.reverse.not_found")); return; }
                if (msg === "AMBIGUOUS_ID") { await interaction.editReply(t(locale, "economy.admin.reverse.ambiguous")); return; }
                if (msg === "ALREADY_REVERSED") { await interaction.editReply(t(locale, "economy.admin.reverse.already_reversed")); return; }
                if (msg === "NOT_REVERSIBLE") { await interaction.editReply(t(locale, "economy.admin.reverse.not_reversible")); return; }
                throw error;
            }
            return;
        }
```

- [ ] **Step 3: Add freeze and unfreeze handlers**

```typescript
        case "freeze": {
            const target = interaction.options.getUser("user", true);
            const reason = interaction.options.getString("reason") ?? "";
            await EconomyAdminService.freeze(target.id, guildId, interaction.user.id, reason);
            const reasonSuffix = reason ? t(locale, "economy.admin.freeze.reason_suffix", { reason }) : "";
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "economy.admin.freeze.success", { userId: target.id, reason: reasonSuffix }))
                .setColor(0xed4245);
            await interaction.editReply({ embeds: [embed] });

            // Fire-and-forget log
            EconomyLogService.shouldLog(guildId, "freeze").then((should) => {
                if (!should) return;
                const logEmbed = new EmbedBuilder()
                    .setTitle(t("en", "economy.log.freeze"))
                    .setDescription(`<@${interaction.user.id}> froze <@${target.id}>${reason ? `: "${reason}"` : ""}`)
                    .setColor(0xed4245)
                    .setTimestamp();
                EconomyLogService.sendLog(guildId, logEmbed);
            }).catch(() => {});
            return;
        }
        case "unfreeze": {
            const target = interaction.options.getUser("user", true);
            const removed = await EconomyAdminService.unfreeze(target.id, guildId);
            if (!removed) {
                await interaction.editReply(t(locale, "economy.admin.unfreeze.not_found"));
                return;
            }
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "economy.admin.unfreeze.success", { userId: target.id }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });

            EconomyLogService.shouldLog(guildId, "freeze").then((should) => {
                if (!should) return;
                const logEmbed = new EmbedBuilder()
                    .setTitle(t("en", "economy.log.unfreeze"))
                    .setDescription(`<@${interaction.user.id}> unfroze <@${target.id}>`)
                    .setColor(0x57f287)
                    .setTimestamp();
                EconomyLogService.sendLog(guildId, logEmbed);
            }).catch(() => {});
            return;
        }
```

- [ ] **Step 4: Add required imports at the top of economy.ts**

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import EconomyLogService from "../../services/economy/economyLog.service";
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add history, reverse, freeze/unfreeze admin subcommands"
```

---

## Task 13: `/economy admin` — Reset, Rollback, Log Setup/Config

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add reset subcommand handler with confirmation gate**

Add to the `handleAdmin` switch:

```typescript
        case "reset": {
            const scope = interaction.options.getString("scope", true) as SnapshotScope;
            const targetUser = interaction.options.getUser("target");
            const target = targetUser?.id ?? "server";
            const targetLabel = targetUser ? `<@${targetUser.id}>` : "entire server";
            const affected = await EconomyAdminService.countAffected(guildId, scope, target);

            const confirmBtn = new ButtonBuilder().setCustomId("eco_reset_confirm").setLabel("Confirm Reset").setStyle(ButtonStyle.Danger);
            const cancelBtn = new ButtonBuilder().setCustomId("eco_reset_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

            const confirmEmbed = new EmbedBuilder()
                .setTitle(t(locale, "economy.admin.reset.confirm_title"))
                .setDescription(t(locale, "economy.admin.reset.confirm_desc", { scope, target: targetLabel, count: String(affected) }))
                .setColor(0xed4245);

            const reply = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

            try {
                const btn = await reply.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: 30_000 });
                if (btn.customId === "eco_reset_cancel") {
                    await btn.update({ content: t(locale, "economy.admin.reset.cancelled"), embeds: [], components: [] });
                    return;
                }
                await btn.deferUpdate();
                const result = await EconomyAdminService.resetEconomy(guildId, scope, target, interaction.user.id);
                const successEmbed = new EmbedBuilder()
                    .setDescription(t(locale, "economy.admin.reset.success", { scope, count: String(result.affectedCount), snapshotId: result.snapshotId }))
                    .setColor(0x57f287);
                await btn.editReply({ embeds: [successEmbed], components: [] });

                EconomyLogService.shouldLog(guildId, "reset").then((should) => {
                    if (!should) return;
                    const logEmbed = new EmbedBuilder()
                        .setTitle(t("en", "economy.log.reset"))
                        .setDescription(`<@${interaction.user.id}> reset **${scope}** for ${targetLabel} (${result.affectedCount} users, snapshot: \`${result.snapshotId}\`)`)
                        .setColor(0xed4245)
                        .setTimestamp();
                    EconomyLogService.sendLog(guildId, logEmbed);
                }).catch(() => {});
            } catch {
                await interaction.editReply({ content: t(locale, "economy.admin.reset.timeout"), embeds: [], components: [] }).catch(() => {});
            }
            return;
        }
```

- [ ] **Step 2: Add rollback subcommand handler**

```typescript
        case "rollback": {
            const snapshotId = interaction.options.getString("id", true);
            const snapshot = await EconomySnapshotModel.findOne({ snapshotId, guildId, restoredAt: null });
            if (!snapshot) {
                await interaction.editReply(t(locale, "economy.admin.rollback.not_found"));
                return;
            }

            const confirmBtn = new ButtonBuilder().setCustomId("eco_rollback_confirm").setLabel("Confirm Rollback").setStyle(ButtonStyle.Danger);
            const cancelBtn = new ButtonBuilder().setCustomId("eco_rollback_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

            const confirmEmbed = new EmbedBuilder()
                .setTitle(t(locale, "economy.admin.rollback.confirm_title"))
                .setDescription(t(locale, "economy.admin.rollback.confirm_desc", {
                    snapshotId,
                    scope: snapshot.scope,
                    date: snapshot.createdAt.toISOString().slice(0, 16).replace("T", " "),
                    count: String(snapshot.data.length),
                }))
                .setColor(0xfee75c);

            const reply = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

            try {
                const btn = await reply.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: 30_000 });
                if (btn.customId === "eco_rollback_cancel") {
                    await btn.update({ content: t(locale, "economy.admin.rollback.cancelled"), embeds: [], components: [] });
                    return;
                }
                await btn.deferUpdate();
                const result = await EconomyAdminService.rollbackSnapshot(snapshotId, guildId);
                const successEmbed = new EmbedBuilder()
                    .setDescription(t(locale, "economy.admin.rollback.success", { count: String(result.restoredCount), scope: snapshot.scope }))
                    .setColor(0x57f287);
                await btn.editReply({ embeds: [successEmbed], components: [] });
            } catch (error) {
                if (error instanceof Error && error.message === "SNAPSHOT_NOT_FOUND") {
                    await interaction.editReply(t(locale, "economy.admin.rollback.not_found"));
                    return;
                }
                await interaction.editReply({ content: t(locale, "economy.admin.rollback.timeout"), embeds: [], components: [] }).catch(() => {});
            }
            return;
        }
```

- [ ] **Step 3: Add log-setup and log-config handlers**

```typescript
        case "log-setup": {
            const channel = interaction.options.getChannel("channel", true);
            if (!channel.isTextBased() || channel.isDMBased()) {
                await interaction.editReply(t(locale, "economy.admin.log.setup_invalid"));
                return;
            }
            // Check bot permissions
            const botMember = interaction.guild?.members.me;
            const perms = channel.permissionsFor(botMember!);
            if (!perms?.has(["SendMessages", "EmbedLinks"])) {
                await interaction.editReply(t(locale, "economy.admin.log.setup_invalid"));
                return;
            }

            await EconomyLogConfigModel.findOneAndUpdate(
                { guildId },
                { $set: { channelId: channel.id, enabled: true }, $setOnInsert: { guildId } },
                { upsert: true }
            );
            await EconomyLogService.invalidateConfigCache(guildId);

            const embed = new EmbedBuilder()
                .setDescription(t(locale, "economy.admin.log.setup_success", { channelId: channel.id }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "log-config": {
            const setting = interaction.options.getString("setting", true);
            const value = interaction.options.getInteger("value", true);

            const existing = await EconomyLogConfigModel.findOne({ guildId });
            if (!existing) {
                await interaction.editReply(t(locale, "economy.admin.log.not_setup"));
                return;
            }

            const booleanSettings = ["robSuccess", "adminActions", "bulkOperations"];
            const updateValue = booleanSettings.includes(setting) ? value !== 0 : value;
            await EconomyLogConfigModel.updateOne({ guildId }, { $set: { [`thresholds.${setting}`]: updateValue } });
            await EconomyLogService.invalidateConfigCache(guildId);

            const embed = new EmbedBuilder()
                .setDescription(t(locale, "economy.admin.log.config_updated", { setting, value: String(value) }))
                .setColor(0x57f287);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
```

- [ ] **Step 4: Add required imports**

```typescript
import EconomySnapshotModel from "../../models/economySnapshot.model";
import type { SnapshotScope } from "../../models/economySnapshot.model";
import EconomyLogConfigModel from "../../models/economyLogConfig.model";
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add reset, rollback, log-setup, log-config admin subcommands"
```

---

## Task 14: `/economy bulk` Group

**Files:**
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Add the bulk subcommand group to the builder**

Add after the admin group:

```typescript
    // ─── bulk group ────────────────────────────────────
    .addSubcommandGroup((group) =>
        group
            .setName("bulk")
            .setDescription("Bulk currency operations")
            .setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.desc"))
            .addSubcommand((sub) =>
                sub.setName("distribute").setDescription("Distribute currency to members").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.distribute.desc"))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount per member").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.distribute.amount.desc")).setMinValue(1).setRequired(true))
                    .addStringOption((opt) => opt.setName("currency").setDescription("Currency type").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.distribute.currency.desc")).setRequired(true).addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }))
                    .addRoleOption((opt) => opt.setName("role").setDescription("Target role (blank = all)").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.distribute.role.desc")))
            )
            .addSubcommand((sub) =>
                sub.setName("tax").setDescription("Collect currency from members").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.tax.desc"))
                    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount per member").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.tax.amount.desc")).setMinValue(1).setRequired(true))
                    .addStringOption((opt) => opt.setName("currency").setDescription("Currency type").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.tax.currency.desc")).setRequired(true).addChoices({ name: "coin", value: "coin" }, { name: "gem", value: "gem" }))
                    .addRoleOption((opt) => opt.setName("role").setDescription("Target role (blank = all)").setDescriptionLocalizations(descriptionLocales("cmd.economy.bulk.tax.role.desc")))
            )
    )
```

- [ ] **Step 2: Implement the `handleBulk` function**

```typescript
import EconomyBulkService from "../../services/economy/economyBulk.service";

async function handleBulk(
    interaction: ChatInputCommandInteraction,
    subcommand: string,
    locale: SupportedLocale,
    guildId: string
): Promise<void> {
    const amount = interaction.options.getInteger("amount", true);
    const currency = interaction.options.getString("currency", true) as "coin" | "gem";
    const role = interaction.options.getRole("role");
    const action = subcommand === "distribute" ? "Distribute" : "Tax";

    // Check cooldown
    const cdRemaining = await EconomyBulkService.checkCooldown(guildId);
    if (cdRemaining > 0) {
        await interaction.editReply(t(locale, "economy.bulk.cooldown", { seconds: String(cdRemaining) }));
        return;
    }

    // Fetch members
    const members = await interaction.guild!.members.fetch();
    const eligible = [...members.values()].filter((m) => {
        if (m.user.bot) return false;
        if (role) return m.roles.cache.has(role.id);
        return true;
    });

    if (eligible.length === 0) {
        await interaction.editReply(t(locale, "economy.bulk.no_members"));
        return;
    }

    const targetLabel = role ? `<@&${role.id}>` : "all members";

    // Confirmation
    const confirmBtn = new ButtonBuilder().setCustomId("eco_bulk_confirm").setLabel(`Confirm ${action}`).setStyle(ButtonStyle.Danger);
    const cancelBtn = new ButtonBuilder().setCustomId("eco_bulk_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

    const confirmEmbed = new EmbedBuilder()
        .setTitle(t(locale, "economy.bulk.confirm_title", { action }))
        .setDescription(t(locale, "economy.bulk.confirm_desc", { action, amount: amount.toLocaleString(), currency, target: targetLabel, count: String(eligible.length) }))
        .setColor(0xfee75c);

    const reply = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

    try {
        const btn = await reply.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: 30_000 });
        if (btn.customId === "eco_bulk_cancel") {
            await btn.update({ content: t(locale, "economy.bulk.cancelled"), embeds: [], components: [] });
            return;
        }

        await btn.deferUpdate();

        const result = subcommand === "distribute"
            ? await EconomyBulkService.distribute(guildId, eligible, amount, currency, interaction.user.id, role?.id)
            : await EconomyBulkService.tax(guildId, eligible, amount, currency, interaction.user.id, role?.id);

        const successKey = subcommand === "distribute" ? "economy.bulk.distribute_success" : "economy.bulk.tax_success";
        const successEmbed = new EmbedBuilder()
            .setDescription(t(locale, successKey, { amount: amount.toLocaleString(), currency, count: String(result.affectedCount) }))
            .setColor(0x57f287);
        await btn.editReply({ embeds: [successEmbed], components: [] });

        // Fire-and-forget log
        EconomyLogService.shouldLog(guildId, "bulk_operation").then((should) => {
            if (!should) return;
            const logEmbed = new EmbedBuilder()
                .setTitle(t("en", "economy.log.bulk_op"))
                .setDescription(`<@${interaction.user.id}> ${subcommand}d **${amount.toLocaleString()}** ${currency} to **${result.affectedCount}** members${role ? ` (role: <@&${role.id}>)` : ""}`)
                .setColor(0x5865f2)
                .setTimestamp();
            EconomyLogService.sendLog(guildId, logEmbed);
        }).catch(() => {});
    } catch {
        await interaction.editReply({ content: t(locale, "economy.bulk.timeout"), embeds: [], components: [] }).catch(() => {});
    }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add bulk distribute and tax subcommand group"
```

---

## Task 15: Freeze Check Integration — All Economy Commands

**Files:**
- Modify: `src/commands/slash/pray.ts`, `src/commands/slash/curse.ts`, `src/commands/slash/work.ts`, `src/commands/slash/gamble.ts`, `src/commands/slash/gift.ts`, `src/commands/slash/rob.ts`, `src/commands/slash/shop.ts`, `src/commands/slash/mine.ts`, `src/commands/slash/dungeon.ts`

- [ ] **Step 1: Add freeze check to pray.ts**

In `src/commands/slash/pray.ts`, add import at the top:

```typescript
import EconomyAdminService from "../../services/economy/economyAdmin.service";
```

After `await interaction.deferReply();` (line 72), inside the try block (after line 75 where locale is resolved), add:

```typescript
            const locale = await resolveLocale(interaction);
            // Freeze check
            if (await EconomyAdminService.isFrozen(interaction.user.id, interaction.guildId!)) {
                await interaction.editReply(t(locale, "common.frozen"));
                return;
            }
```

- [ ] **Step 2: Add freeze check to curse.ts**

Same pattern — import `EconomyAdminService`, add freeze check after `resolveLocale()` inside the try block (after line 59).

- [ ] **Step 3: Add freeze check to work.ts**

Same pattern — after `resolveLocale()` (line 47), add freeze check.

- [ ] **Step 4: Add freeze check to gamble.ts**

Same pattern — after `resolveLocale()` (line 76), add freeze check.

- [ ] **Step 5: Add freeze check to gift.ts**

Same pattern — after `resolveLocale()` (line 48), add freeze check.

- [ ] **Step 6: Add freeze check to rob.ts**

Same pattern — after `resolveLocale()` (line 46), add freeze check.

- [ ] **Step 7: Add freeze check to shop.ts**

In `src/commands/slash/shop.ts`, add freeze check inside the `handleBuy` function after `deferReply()` (line 66). Only the buy flow needs freeze check — viewing is fine.

- [ ] **Step 8: Add freeze check to mine.ts**

Same pattern — after `resolveLocale()` (line 29), add freeze check.

- [ ] **Step 9: Add freeze check to dungeon.ts**

Same pattern — after `resolveLocale()` (line 451), add freeze check.

- [ ] **Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add src/commands/slash/pray.ts src/commands/slash/curse.ts src/commands/slash/work.ts src/commands/slash/gamble.ts src/commands/slash/gift.ts src/commands/slash/rob.ts src/commands/slash/shop.ts src/commands/slash/mine.ts src/commands/slash/dungeon.ts
git commit -m "feat(economy): add freeze check to all economy commands"
```

---

## Task 16: Wire EconomyLogService Client Reference

**Files:**
- Modify: `src/events/ready.ts`

- [ ] **Step 1: Set the log service client in the ready event**

In `src/events/ready.ts`, add import at the top:

```typescript
import EconomyLogService from "../services/economy/economyLog.service";
```

Inside the `execute(client: Client<true>)` function, add at line 10 (after the function starts, before guild/user logging):

```typescript
        EconomyLogService.setClient(client);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/events/ready.ts
git commit -m "feat(economy): wire EconomyLogService client reference on ready"
```

---

## Task 17: Build & Smoke Test

- [ ] **Step 1: Run full TypeScript build**

Run: `npm run build`
Expected: No errors, compiles to `dist/`

- [ ] **Step 2: Verify locale files are copied**

Run: `ls dist/locales/en.json`
Expected: File exists

- [ ] **Step 3: Run the bot in development mode briefly**

Run: `npm run start:dev`
Expected: Bot starts, connects to Discord, no crash. Check console for any errors related to the new economy command registration.

- [ ] **Step 4: Test command deployment**

In Discord, type `/economy` and verify autocomplete shows the 4 groups: `balance`, `config`, `admin`, `bulk`.

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix(economy): build and smoke test fixes"
```
