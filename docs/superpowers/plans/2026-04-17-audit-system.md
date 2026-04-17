# Audit System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only audit system that logs guild lifecycle events, command executions, and background errors to configurable Discord text channels, with daily member-count snapshots and a `/audit` slash command for setup/query.

**Architecture:** Dual-channel dispatcher pattern — an `AuditDispatcherService` buffers embeds and flushes to two channels (`critical` + `commands`) configured via a MongoDB singleton. `AuditService` orchestrates event sources (`guildCreate`, `guildDelete`, `ready`, `interactionCreate`, cron) and forwards to the dispatcher. Two data models (`GuildAudit` for lifecycle, `GuildSnapshot` for trend). One dev-only slash command `/audit` with `setup` and `query` subcommand groups.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, Node.js >= 24.

**Spec:** [docs/superpowers/specs/2026-04-17-audit-system-design.md](../specs/2026-04-17-audit-system-design.md)

**Testing note:** Project has no test framework (no jest/vitest). Each task verifies via `npm run build` (TypeScript compile check) and ends with a commit. Runtime verification checklist at end of plan.

---

## File Structure

**New:**
- `src/models/auditConfig.model.ts` — singleton config (channel IDs, snapshot toggle)
- `src/models/guildAudit.model.ts` — guild lifecycle metadata
- `src/models/guildSnapshot.model.ts` — daily member-count snapshots
- `src/services/audit/auditConfig.service.ts` — config CRUD + Redis cache
- `src/services/audit/auditEmbeds.ts` — pure embed builders
- `src/services/audit/auditDispatcher.service.ts` — buffered channel dispatcher
- `src/services/audit/audit.service.ts` — event orchestrator
- `src/events/guildCreate.ts` — bot joined guild handler
- `src/events/guildDelete.ts` — bot left guild handler
- `src/util/audit/snapshotJob.ts` — daily snapshot cron
- `src/commands/slash/audit.ts` — dev slash command
- `docs/steering/audit-system.md` — steering doc

**Modified:**
- `src/events/ready.ts` — reconcile guilds + init dispatcher
- `src/events/interactionCreate.ts` — bridge `pushLog` to audit service
- `src/services/premium/premiumExpiry.ts` — forward errors to audit
- `src/util/xp/guildStatsAggregator.ts` — forward errors to audit
- `src/services/commandLog.service.ts` — forward flush errors to audit
- `src/bin/www.ts` — start snapshot job + drain dispatcher on shutdown
- `src/util/help/commandCategories.ts` — add `audit` to `other` category
- `src/locales/*.json` (15 files) — add `cmd.audit.*` keys
- `CHANGELOG.md` — feature entry under `[Unreleased]`
- `CLAUDE.md` — add audit services + steering doc reference
- `package.json` — bump version to `5.7.0`

---

## Task 1: Create `AuditConfig` singleton model

**Files:**
- Create: `src/models/auditConfig.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/models/auditConfig.model.ts
import { Document, model, Schema } from "mongoose";

export interface IAuditConfig extends Document {
    _id: string;
    criticalChannelId?: string | null;
    commandsChannelId?: string | null;
    snapshotEnabled: boolean;
    updatedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const auditConfigSchema = new Schema<IAuditConfig>(
    {
        _id: { type: String, default: "singleton" },
        criticalChannelId: { type: String, default: null },
        commandsChannelId: { type: String, default: null },
        snapshotEnabled: { type: Boolean, default: true },
        updatedBy: { type: String, default: null },
    },
    {
        timestamps: true,
        collection: "AuditConfigs",
        _id: false,
    }
);

export default model<IAuditConfig>("AuditConfig", auditConfigSchema);
```

- [ ] **Step 2: Build to verify TypeScript compiles**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/auditConfig.model.ts
git commit -m "feat(audit): add AuditConfig singleton model"
```

---

## Task 2: Create `GuildAudit` lifecycle model

**Files:**
- Create: `src/models/guildAudit.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/models/guildAudit.model.ts
import { Document, model, Schema } from "mongoose";

export interface IGuildAudit extends Document {
    guildId: string;
    name: string;
    ownerId: string;
    memberCount: number;
    iconURL?: string | null;
    joinedAt: Date;
    leftAt?: Date | null;
    currentlyIn: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const guildAuditSchema = new Schema<IGuildAudit>(
    {
        guildId: { type: String, required: true },
        name: { type: String, required: true },
        ownerId: { type: String, required: true },
        memberCount: { type: Number, required: true, default: 0 },
        iconURL: { type: String, default: null },
        joinedAt: { type: Date, required: true },
        leftAt: { type: Date, default: null },
        currentlyIn: { type: Boolean, required: true, default: true },
    },
    { timestamps: true, collection: "GuildAudits" }
);

guildAuditSchema.index({ guildId: 1 }, { unique: true });
guildAuditSchema.index({ currentlyIn: 1, updatedAt: -1 });

export default model<IGuildAudit>("GuildAudit", guildAuditSchema);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/models/guildAudit.model.ts
git commit -m "feat(audit): add GuildAudit lifecycle model"
```

---

## Task 3: Create `GuildSnapshot` trend model

**Files:**
- Create: `src/models/guildSnapshot.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/models/guildSnapshot.model.ts
import { Document, model, Schema } from "mongoose";

export interface IGuildSnapshot extends Document {
    guildId: string;
    memberCount: number;
    takenAt: Date;
    createdAt: Date;
}

const guildSnapshotSchema = new Schema<IGuildSnapshot>(
    {
        guildId: { type: String, required: true },
        memberCount: { type: Number, required: true },
        takenAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "GuildSnapshots" }
);

guildSnapshotSchema.index({ guildId: 1, takenAt: -1 });

export default model<IGuildSnapshot>("GuildSnapshot", guildSnapshotSchema);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/models/guildSnapshot.model.ts
git commit -m "feat(audit): add GuildSnapshot trend model"
```

---

## Task 4: Create `AuditConfigService`

Reads/writes config with Redis cache (5min TTL, pattern matches `premium.service.ts`).

**Files:**
- Create: `src/services/audit/auditConfig.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/audit/auditConfig.service.ts
import AuditConfigModel, { IAuditConfig } from "../../models/auditConfig.model";
import redis from "../../connector/redis/index";

const CACHE_KEY = "audit:config";
const CACHE_TTL_SECONDS = 300;

export interface AuditConfigSnapshot {
    criticalChannelId: string | null;
    commandsChannelId: string | null;
    snapshotEnabled: boolean;
    updatedBy: string | null;
}

function toSnapshot(doc: IAuditConfig): AuditConfigSnapshot {
    return {
        criticalChannelId: doc.criticalChannelId ?? null,
        commandsChannelId: doc.commandsChannelId ?? null,
        snapshotEnabled: doc.snapshotEnabled,
        updatedBy: doc.updatedBy ?? null,
    };
}

async function ensureDoc(): Promise<IAuditConfig> {
    const existing = await AuditConfigModel.findById("singleton");
    if (existing) return existing;
    return AuditConfigModel.create({ _id: "singleton" });
}

async function getConfig(): Promise<AuditConfigSnapshot> {
    const cached = await redis.getJson<AuditConfigSnapshot>(CACHE_KEY);
    if (cached) return cached;

    const doc = await ensureDoc();
    const snap = toSnapshot(doc);
    await redis.setJson(CACHE_KEY, snap, CACHE_TTL_SECONDS);
    return snap;
}

async function invalidate(): Promise<void> {
    await redis.deleteKey(CACHE_KEY);
}

async function setCriticalChannel(channelId: string, updatedBy: string): Promise<void> {
    await AuditConfigModel.updateOne(
        { _id: "singleton" },
        { $set: { criticalChannelId: channelId, updatedBy } },
        { upsert: true }
    );
    await invalidate();
}

async function setCommandsChannel(channelId: string, updatedBy: string): Promise<void> {
    await AuditConfigModel.updateOne(
        { _id: "singleton" },
        { $set: { commandsChannelId: channelId, updatedBy } },
        { upsert: true }
    );
    await invalidate();
}

async function clearChannel(target: "critical" | "commands", updatedBy: string): Promise<void> {
    const field = target === "critical" ? "criticalChannelId" : "commandsChannelId";
    await AuditConfigModel.updateOne(
        { _id: "singleton" },
        { $set: { [field]: null, updatedBy } },
        { upsert: true }
    );
    await invalidate();
}

async function setSnapshotEnabled(enabled: boolean, updatedBy: string): Promise<void> {
    await AuditConfigModel.updateOne(
        { _id: "singleton" },
        { $set: { snapshotEnabled: enabled, updatedBy } },
        { upsert: true }
    );
    await invalidate();
}

export const AuditConfigService = {
    getConfig,
    invalidate,
    setCriticalChannel,
    setCommandsChannel,
    clearChannel,
    setSnapshotEnabled,
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/audit/auditConfig.service.ts
git commit -m "feat(audit): add AuditConfigService with Redis caching"
```

---

## Task 5: Create embed builders `auditEmbeds.ts`

Pure functions — no side effects, no i18n (English only, dev-facing).

**Files:**
- Create: `src/services/audit/auditEmbeds.ts`

- [ ] **Step 1: Create the embed builders**

```typescript
// src/services/audit/auditEmbeds.ts
import { EmbedBuilder, Guild } from "discord.js";
import type { IGuildAudit } from "../../models/guildAudit.model";

const COLOR = {
    JOIN: 0x22c55e,
    LEAVE: 0xef4444,
    ERROR: 0xef4444,
    SUCCESS: 0x3b82f6,
    ADMIN: 0xa855f7,
    SUMMARY: 0xeab308,
};

export interface CommandEntry {
    commandName: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    options: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
}

function truncate(str: string, max: number): string {
    return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

export function guildJoinEmbed(guild: Guild, totalGuildsNow: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("🟢 Bot joined guild")
        .setColor(COLOR.JOIN)
        .setThumbnail(guild.iconURL() ?? null)
        .addFields(
            { name: "Name", value: guild.name, inline: true },
            { name: "Guild ID", value: guild.id, inline: true },
            { name: "Members", value: String(guild.memberCount), inline: true },
            { name: "Owner ID", value: guild.ownerId, inline: true },
            { name: "Total guilds now", value: String(totalGuildsNow), inline: true }
        )
        .setTimestamp();
}

export function guildLeaveEmbed(audit: IGuildAudit, totalGuildsNow: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("🔴 Bot left guild")
        .setColor(COLOR.LEAVE)
        .setThumbnail(audit.iconURL ?? null)
        .addFields(
            { name: "Name", value: audit.name, inline: true },
            { name: "Guild ID", value: audit.guildId, inline: true },
            { name: "Last member count", value: String(audit.memberCount), inline: true },
            { name: "Was in for", value: `<t:${Math.floor(audit.joinedAt.getTime() / 1000)}:R>`, inline: true },
            { name: "Total guilds now", value: String(totalGuildsNow), inline: true }
        )
        .setTimestamp();
}

function optionsToString(opts: Record<string, unknown>): string {
    const keys = Object.keys(opts);
    if (keys.length === 0) return "—";
    const parts = keys.map((k) => `${k}: ${truncate(String(opts[k]), 50)}`);
    return truncate(parts.join(", "), 500);
}

export function commandSuccessEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`/${entry.commandName}`)
        .setColor(COLOR.SUCCESS)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Latency", value: `${entry.latencyMs}ms`, inline: true },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function commandErrorEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`❌ /${entry.commandName}`)
        .setColor(COLOR.ERROR)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Latency", value: `${entry.latencyMs}ms`, inline: true },
            { name: "Error", value: truncate(entry.errorMessage ?? "Unknown error", 1000), inline: false },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function adminActionEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`🛡️ Admin action: /${entry.commandName}`)
        .setColor(COLOR.ADMIN)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function startupSummaryEmbed(params: {
    totalGuilds: number;
    totalMembers: number;
    topGuilds: Array<{ name: string; memberCount: number }>;
}): EmbedBuilder {
    const top = params.topGuilds
        .slice(0, 10)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new EmbedBuilder()
        .setTitle("🚀 Bot started")
        .setColor(COLOR.SUMMARY)
        .addFields(
            { name: "Total guilds", value: String(params.totalGuilds), inline: true },
            { name: "Total members", value: params.totalMembers.toLocaleString(), inline: true },
            { name: "Top guilds", value: top, inline: false }
        )
        .setTimestamp();
}

export function snapshotSummaryEmbed(params: {
    totalGuilds: number;
    totalMembers: number;
    memberDelta: number;
    top5: Array<{ name: string; memberCount: number }>;
}): EmbedBuilder {
    const deltaStr = params.memberDelta >= 0 ? `+${params.memberDelta}` : `${params.memberDelta}`;
    const top = params.top5
        .slice(0, 5)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new EmbedBuilder()
        .setTitle("📊 Daily snapshot")
        .setColor(COLOR.SUMMARY)
        .addFields(
            { name: "Total guilds", value: String(params.totalGuilds), inline: true },
            { name: "Total members", value: `${params.totalMembers.toLocaleString()} (${deltaStr})`, inline: true },
            { name: "Top 5", value: top, inline: false }
        )
        .setTimestamp();
}

export function backgroundErrorEmbed(jobName: string, error: Error): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`⚠️ Background job error: ${jobName}`)
        .setColor(COLOR.ERROR)
        .addFields(
            { name: "Error", value: truncate(error.message, 1000), inline: false },
            { name: "Stack", value: truncate(error.stack ?? "No stack", 1000), inline: false }
        )
        .setTimestamp();
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/audit/auditEmbeds.ts
git commit -m "feat(audit): add embed builders for audit events"
```

---

## Task 6: Create `AuditDispatcherService`

Buffered queue, resolves channel via client, flushes every 2s or at 10 embeds.

**Files:**
- Create: `src/services/audit/auditDispatcher.service.ts`

- [ ] **Step 1: Create the dispatcher**

```typescript
// src/services/audit/auditDispatcher.service.ts
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { logger } from "../../util/log/logger.mixed";
import { AuditConfigService } from "./auditConfig.service";

const FLUSH_INTERVAL_MS = 2_000;
const BUFFER_THRESHOLD = 10;
const MAX_EMBEDS_PER_MESSAGE = 10;

let clientRef: Client | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let criticalQueue: EmbedBuilder[] = [];
let commandsQueue: EmbedBuilder[] = [];
const channelCache = new Map<string, TextChannel | null>();
const warnedChannels = new Set<string>();

async function resolveChannel(channelId: string): Promise<TextChannel | null> {
    if (channelCache.has(channelId)) return channelCache.get(channelId) ?? null;
    if (!clientRef) return null;

    try {
        const ch = await clientRef.channels.fetch(channelId);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
            const text = ch as TextChannel;
            channelCache.set(channelId, text);
            return text;
        }
    } catch {
        /* fall through */
    }
    channelCache.set(channelId, null);
    if (!warnedChannels.has(channelId)) {
        warnedChannels.add(channelId);
        logger.warn(`[AuditDispatcher] channel ${channelId} unreachable — disabling until re-setup`);
    }
    return null;
}

async function sendBatch(channel: TextChannel, embeds: EmbedBuilder[]): Promise<void> {
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
        const batch = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
        try {
            await channel.send({ embeds: batch });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.warn(`[AuditDispatcher] send failed for ${channel.id}: ${msg}`);
            // Invalidate cache so next flush re-fetches (permission may have changed)
            channelCache.delete(channel.id);
            return;
        }
    }
}

async function flush(): Promise<void> {
    if (criticalQueue.length === 0 && commandsQueue.length === 0) return;

    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config) {
        criticalQueue = [];
        commandsQueue = [];
        return;
    }

    const critBatch = criticalQueue;
    const cmdBatch = commandsQueue;
    criticalQueue = [];
    commandsQueue = [];

    if (critBatch.length > 0 && config.criticalChannelId) {
        const ch = await resolveChannel(config.criticalChannelId);
        if (ch) await sendBatch(ch, critBatch);
    }
    if (cmdBatch.length > 0 && config.commandsChannelId) {
        const ch = await resolveChannel(config.commandsChannelId);
        if (ch) await sendBatch(ch, cmdBatch);
    }
}

function pushCritical(embed: EmbedBuilder): void {
    criticalQueue.push(embed);
    if (criticalQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function pushCommands(embed: EmbedBuilder): void {
    commandsQueue.push(embed);
    if (commandsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function init(client: Client): void {
    clientRef = client;
    if (flushTimer) return;
    flushTimer = setInterval(() => {
        flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
}

function invalidateChannelCache(): void {
    channelCache.clear();
    warnedChannels.clear();
}

async function drain(): Promise<void> {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flush();
}

export const AuditDispatcherService = {
    init,
    pushCritical,
    pushCommands,
    flush,
    drain,
    invalidateChannelCache,
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/audit/auditDispatcher.service.ts
git commit -m "feat(audit): add buffered dispatcher for critical+commands channels"
```

---

## Task 7: Create `AuditService` orchestrator

Ties event sources to dispatcher and models.

**Files:**
- Create: `src/services/audit/audit.service.ts`

- [ ] **Step 1: Create the orchestrator**

```typescript
// src/services/audit/audit.service.ts
import { Client, Guild } from "discord.js";
import GuildAuditModel, { IGuildAudit } from "../../models/guildAudit.model";
import GuildSnapshotModel from "../../models/guildSnapshot.model";
import { logger } from "../../util/log/logger.mixed";
import { AuditDispatcherService } from "./auditDispatcher.service";
import {
    adminActionEmbed,
    backgroundErrorEmbed,
    CommandEntry,
    commandErrorEmbed,
    commandSuccessEmbed,
    guildJoinEmbed,
    guildLeaveEmbed,
    snapshotSummaryEmbed,
    startupSummaryEmbed,
} from "./auditEmbeds";

// Commands that should also post to critical channel in addition to commands channel.
// Match by exact commandName; subcommand-group checks are done in the handler if needed.
const ADMIN_COMMAND_NAMES = new Set<string>([
    "economy",
    "guild-admin",
    "commandlog",
    "audit",
]);

async function onGuildCreate(guild: Guild): Promise<void> {
    try {
        await GuildAuditModel.updateOne(
            { guildId: guild.id },
            {
                $set: {
                    name: guild.name,
                    ownerId: guild.ownerId,
                    memberCount: guild.memberCount,
                    iconURL: guild.iconURL() ?? null,
                    currentlyIn: true,
                    leftAt: null,
                },
                $setOnInsert: { joinedAt: new Date() },
            },
            { upsert: true }
        );
        const total = guild.client.guilds.cache.size;
        AuditDispatcherService.pushCritical(guildJoinEmbed(guild, total));
    } catch (error) {
        logger.error(`[AuditService] onGuildCreate failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function onGuildDelete(guild: Guild): Promise<void> {
    try {
        const updated = await GuildAuditModel.findOneAndUpdate(
            { guildId: guild.id },
            {
                $set: {
                    currentlyIn: false,
                    leftAt: new Date(),
                    name: guild.name || undefined,
                },
            },
            { new: true }
        );
        if (!updated) {
            logger.warn(`[AuditService] onGuildDelete: no GuildAudit doc for ${guild.id}`);
            return;
        }
        const total = guild.client.guilds.cache.size;
        AuditDispatcherService.pushCritical(guildLeaveEmbed(updated, total));
    } catch (error) {
        logger.error(`[AuditService] onGuildDelete failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function onReady(client: Client): Promise<void> {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        const now = new Date();

        // Upsert all currently-cached guilds
        const ops = guilds.map((g) => ({
            updateOne: {
                filter: { guildId: g.id },
                update: {
                    $set: {
                        name: g.name,
                        ownerId: g.ownerId,
                        memberCount: g.memberCount,
                        iconURL: g.iconURL() ?? null,
                        currentlyIn: true,
                        leftAt: null,
                    },
                    $setOnInsert: { joinedAt: now },
                },
                upsert: true,
            },
        }));
        if (ops.length > 0) {
            await GuildAuditModel.bulkWrite(ops);
        }

        // Mark guilds not in cache as left
        const currentIds = guilds.map((g) => g.id);
        await GuildAuditModel.updateMany(
            { guildId: { $nin: currentIds }, currentlyIn: true },
            { $set: { currentlyIn: false, leftAt: now } }
        );

        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const topGuilds = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 10)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));

        AuditDispatcherService.pushCritical(
            startupSummaryEmbed({
                totalGuilds: guilds.length,
                totalMembers,
                topGuilds,
            })
        );
    } catch (error) {
        logger.error(`[AuditService] onReady failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

function onCommandExecuted(entry: CommandEntry): void {
    try {
        if (!entry.success) {
            AuditDispatcherService.pushCommands(commandErrorEmbed(entry));
            AuditDispatcherService.pushCritical(commandErrorEmbed(entry));
            return;
        }
        AuditDispatcherService.pushCommands(commandSuccessEmbed(entry));
        if (ADMIN_COMMAND_NAMES.has(entry.commandName)) {
            AuditDispatcherService.pushCritical(adminActionEmbed(entry));
        }
    } catch (error) {
        logger.error(`[AuditService] onCommandExecuted failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function snapshotAllGuilds(client: Client): Promise<void> {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        if (guilds.length === 0) return;
        const takenAt = new Date();

        const snapshotDocs = guilds.map((g) => ({
            guildId: g.id,
            memberCount: g.memberCount,
            takenAt,
        }));
        await GuildSnapshotModel.insertMany(snapshotDocs, { ordered: false });

        const bulkOps = guilds.map((g) => ({
            updateOne: {
                filter: { guildId: g.id },
                update: { $set: { memberCount: g.memberCount, name: g.name } },
            },
        }));
        await GuildAuditModel.bulkWrite(bulkOps);

        // Delta vs previous snapshot batch
        const twoDaysAgo = new Date(takenAt.getTime() - 2 * 24 * 60 * 60 * 1000);
        const prev = await GuildSnapshotModel.aggregate<{ _id: null; total: number }>([
            { $match: { takenAt: { $gte: twoDaysAgo, $lt: new Date(takenAt.getTime() - 60 * 60 * 1000) } } },
            { $sort: { takenAt: -1 } },
            { $group: { _id: "$guildId", memberCount: { $first: "$memberCount" } } },
            { $group: { _id: null, total: { $sum: "$memberCount" } } },
        ]);
        const prevTotal = prev[0]?.total ?? 0;
        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const memberDelta = prevTotal === 0 ? 0 : totalMembers - prevTotal;

        const top5 = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));

        AuditDispatcherService.pushCritical(
            snapshotSummaryEmbed({
                totalGuilds: guilds.length,
                totalMembers,
                memberDelta,
                top5,
            })
        );
    } catch (error) {
        logger.error(`[AuditService] snapshotAllGuilds failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

function logBackgroundError(jobName: string, error: Error): void {
    try {
        AuditDispatcherService.pushCritical(backgroundErrorEmbed(jobName, error));
    } catch {
        // never let audit logging crash the job
    }
}

export const AuditService = {
    onGuildCreate,
    onGuildDelete,
    onReady,
    onCommandExecuted,
    snapshotAllGuilds,
    logBackgroundError,
    ADMIN_COMMAND_NAMES,
};

export type { IGuildAudit };
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/audit/audit.service.ts
git commit -m "feat(audit): add AuditService orchestrator"
```

---

## Task 8: Create `guildCreate` event handler

**Files:**
- Create: `src/events/guildCreate.ts`

- [ ] **Step 1: Create the event file**

```typescript
// src/events/guildCreate.ts
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild) {
        await AuditService.onGuildCreate(guild);
    },
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/events/guildCreate.ts
git commit -m "feat(audit): add guildCreate event handler"
```

---

## Task 9: Create `guildDelete` event handler

**Files:**
- Create: `src/events/guildDelete.ts`

- [ ] **Step 1: Create the event file**

```typescript
// src/events/guildDelete.ts
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildDelete,
    once: false,
    async execute(guild: Guild) {
        await AuditService.onGuildDelete(guild);
    },
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/events/guildDelete.ts
git commit -m "feat(audit): add guildDelete event handler"
```

---

## Task 10: Wire `ready` event to init dispatcher + reconcile

**Files:**
- Modify: `src/events/ready.ts`

- [ ] **Step 1: Update the file**

Replace the full contents of `src/events/ready.ts` with:

```typescript
import { ActivityType, Client, Events } from "discord.js";

import botInfo from "../../package.json";
import { getNumberOfDays } from "../util/date/day";
import EconomyLogService from "../services/economy/economyLog.service";
import { AuditDispatcherService } from "../services/audit/auditDispatcher.service";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client<true>) {
        EconomyLogService.setClient(client);

        const guilds = client.guilds.cache.map((guild) => guild.id);
        console.log("Total guilds:", guilds.length);

        const users = client.users.cache.map((user) => user.id);
        console.log("Total users:", users.length);

        console.log(`Ready! Logged in as ${client.user.tag}`);

        AuditDispatcherService.init(client);
        await AuditService.onReady(client);

        const numberOfDays = getNumberOfDays(new Date("2019/08/25"), new Date());
        setTimeout(() => {
            client.user.setPresence({
                activities: [
                    {
                        name: `/help v${botInfo.version}, ${numberOfDays} days of uptime: `,
                        type: ActivityType.Watching,
                    },
                ],
            });
        }, 5_000);
    },
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/events/ready.ts
git commit -m "feat(audit): init dispatcher and reconcile guilds on ready"
```

---

## Task 11: Wire `interactionCreate` to `AuditService.onCommandExecuted`

**Files:**
- Modify: `src/events/interactionCreate.ts`

- [ ] **Step 1: Update the file**

Add import at top (after existing imports):

```typescript
import { AuditService } from "../services/audit/audit.service";
```

Replace the final block (lines ~68-78, the `CommandLogService.pushLog({...})` call) with:

```typescript
        const entry = {
            commandName: interaction.commandName,
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guildId ?? "DM",
            channelId: interaction.channelId,
            options: serializeOptions(interaction.options.data),
            success,
            errorMessage,
            latencyMs,
        };

        CommandLogService.pushLog(entry);
        AuditService.onCommandExecuted(entry);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/events/interactionCreate.ts
git commit -m "feat(audit): forward command executions to AuditService"
```

---

## Task 12: Forward background job errors to `AuditService`

Three callers lose errors silently today — wire them through audit.

**Files:**
- Modify: `src/services/premium/premiumExpiry.ts`
- Modify: `src/util/xp/guildStatsAggregator.ts`
- Modify: `src/services/commandLog.service.ts`

- [ ] **Step 1: Update `premiumExpiry.ts`**

Add import near top:

```typescript
import { AuditService } from "../audit/audit.service";
```

Replace both `catch` blocks in `startPremiumExpiry()` (there are two — one in `setTimeout`, one in `setInterval`). New form for each:

```typescript
        expireStale().catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger.error(`[premiumExpiry] ${err.message}`);
            AuditService.logBackgroundError("premiumExpiry", err);
        });
```

- [ ] **Step 2: Update `guildStatsAggregator.ts`**

Read the file first to find the catch block. Add import at top:

```typescript
import { AuditService } from "../../services/audit/audit.service";
```

Inside every `.catch(...)` in `startGuildStatsAggregator()`, use the same pattern:

```typescript
        .catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger.error(`[guildStatsAggregator] ${err.message}`);
            AuditService.logBackgroundError("guildStatsAggregator", err);
        });
```

- [ ] **Step 3: Update `commandLog.service.ts` flush error path**

Add import:

```typescript
import { AuditService } from "./audit/audit.service";
```

Update the existing `catch (error)` block in `flush()`:

```typescript
    } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger.error(`[CommandLogService] flush failed: ${err.message}`);
        AuditService.logBackgroundError("CommandLogService.flush", err);
    }
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exits 0. If errors, check that `AuditService` import paths resolve correctly (the file paths differ per file — relative to each module).

- [ ] **Step 5: Commit**

```bash
git add src/services/premium/premiumExpiry.ts src/util/xp/guildStatsAggregator.ts src/services/commandLog.service.ts
git commit -m "feat(audit): forward background job errors to audit dispatcher"
```

---

## Task 13: Create snapshot cron job

**Files:**
- Create: `src/util/audit/snapshotJob.ts`

- [ ] **Step 1: Create the cron**

```typescript
// src/util/audit/snapshotJob.ts
import { Client } from "discord.js";
import { AuditConfigService } from "../../services/audit/auditConfig.service";
import { AuditService } from "../../services/audit/audit.service";
import { logger } from "../log/logger.mixed";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

let timer: ReturnType<typeof setInterval> | null = null;

async function tick(client: Client): Promise<void> {
    try {
        const config = await AuditConfigService.getConfig();
        if (!config.snapshotEnabled) return;
        await AuditService.snapshotAllGuilds(client);
    } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger.error(`[auditSnapshotJob] ${err.message}`);
        AuditService.logBackgroundError("auditSnapshotJob", err);
    }
}

export function startAuditSnapshotJob(client: Client): void {
    if (timer) return;
    timer = setInterval(() => {
        tick(client).catch(() => {});
    }, INTERVAL_MS);
}

export function stopAuditSnapshotJob(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/util/audit/snapshotJob.ts
git commit -m "feat(audit): add daily snapshot cron job"
```

---

## Task 14: Wire snapshot job + graceful shutdown drain

**Files:**
- Modify: `src/bin/www.ts`

- [ ] **Step 1: Update startup block**

Inside `main()`, after `CommandLogService.startFlusher();`, append:

```typescript
    const { startAuditSnapshotJob } = await import("../util/audit/snapshotJob");
    const { default: clientSingleton } = await import("../client");
    startAuditSnapshotJob(clientSingleton);
```

- [ ] **Step 2: Update shutdown block**

Inside `shutdown()`, after the `CommandLogService.flush()` line but before `mongoose.disconnect()`, add:

```typescript
    const { AuditDispatcherService } = await import("../services/audit/auditDispatcher.service");
    await AuditDispatcherService.drain();
    const { stopAuditSnapshotJob } = await import("../util/audit/snapshotJob");
    stopAuditSnapshotJob();
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/bin/www.ts
git commit -m "feat(audit): start snapshot job and drain dispatcher on shutdown"
```

---

## Task 15: Add i18n keys for `/audit` command

All 15 locale files need `cmd.audit.*` keys for Discord description localizations. For dev-facing strings, Vietnamese + English are primary; other locales can share the English text.

**Files:**
- Modify: `src/locales/en.json`, `vi.json`, `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`

- [ ] **Step 1: Add keys to `en.json`**

Under the existing `"cmd"` object, add:

```json
        "audit": {
            "desc": "Audit system (dev only)",
            "setup": {
                "desc": "Configure audit channels and options",
                "critical_channel": { "desc": "Set the critical-events channel" },
                "commands_channel": { "desc": "Set the command-log channel" },
                "clear": { "desc": "Clear an audit channel", "target": { "desc": "Which channel to clear" } },
                "snapshot": { "desc": "Toggle daily snapshot cron", "enabled": { "desc": "Enable or disable" } },
                "view": { "desc": "View current audit config" }
            },
            "query": {
                "desc": "Query audit data",
                "guilds": { "desc": "List all guilds the bot is currently in", "page": { "desc": "Page number" } },
                "guild": { "desc": "Detailed info for one guild", "target": { "desc": "Guild ID" } },
                "history": { "desc": "Recent join/leave events", "limit": { "desc": "Number of entries (1-25)" } },
                "summary": { "desc": "Realtime summary of all guilds" }
            }
        }
```

(Place inside the existing top-level `"cmd"` object alongside `"commandlog"`.)

- [ ] **Step 2: Add keys to `vi.json`**

Same structure with Vietnamese text:

```json
        "audit": {
            "desc": "Hệ thống audit (chỉ dev)",
            "setup": {
                "desc": "Cấu hình channel audit và tùy chọn",
                "critical_channel": { "desc": "Đặt channel nhận event critical" },
                "commands_channel": { "desc": "Đặt channel log command" },
                "clear": { "desc": "Xóa cấu hình channel", "target": { "desc": "Channel nào cần xóa" } },
                "snapshot": { "desc": "Bật/tắt cron snapshot hằng ngày", "enabled": { "desc": "Bật hoặc tắt" } },
                "view": { "desc": "Xem cấu hình audit hiện tại" }
            },
            "query": {
                "desc": "Truy vấn dữ liệu audit",
                "guilds": { "desc": "Liệt kê tất cả guild bot đang ở", "page": { "desc": "Số trang" } },
                "guild": { "desc": "Thông tin chi tiết 1 guild", "target": { "desc": "Guild ID" } },
                "history": { "desc": "Các sự kiện join/leave gần đây", "limit": { "desc": "Số entry (1-25)" } },
                "summary": { "desc": "Tổng hợp realtime tất cả guild" }
            }
        }
```

- [ ] **Step 3: Add keys to the 13 remaining locale files**

For each of `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`: add the same block as `en.json` (English text is acceptable fallback for dev-only strings, but translate if capacity allows). Minimum: copy `en.json` block into each file.

- [ ] **Step 4: Build (verifies JSON is valid and no syntax errors)**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "i18n(audit): add cmd.audit.* keys across 15 locales"
```

---

## Task 16: Create `/audit` slash command — skeleton + setup subcommands

**Files:**
- Create: `src/commands/slash/audit.ts`

- [ ] **Step 1: Create the command file**

```typescript
// src/commands/slash/audit.ts
import {
    ChannelType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { AuditConfigService } from "../../services/audit/auditConfig.service";
import { AuditDispatcherService } from "../../services/audit/auditDispatcher.service";
import { DEV_USER_ID, GUILD_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";

function isDevAuthorized(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guildId === GUILD_ID && interaction.user.id === DEV_USER_ID;
}

function botHasRequiredPerms(channel: TextChannel, botId: string): boolean {
    const perms = channel.permissionsFor(botId);
    if (!perms) return false;
    return perms.has(
        PermissionsBitField.Flags.ViewChannel |
            PermissionsBitField.Flags.SendMessages |
            PermissionsBitField.Flags.EmbedLinks
    );
}

export default {
    data: new SlashCommandBuilder()
        .setName("audit")
        .setDescription("Audit system (dev only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.audit.desc"))
        .addSubcommandGroup((group) =>
            group
                .setName("setup")
                .setDescription("Configure audit channels and options")
                .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.desc"))
                .addSubcommand((sub) =>
                    sub
                        .setName("critical-channel")
                        .setDescription("Set the critical-events channel")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.critical_channel.desc"))
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Text channel")
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("commands-channel")
                        .setDescription("Set the command-log channel")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.commands_channel.desc"))
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Text channel")
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("clear")
                        .setDescription("Clear an audit channel")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.clear.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("target")
                                .setDescription("Which channel to clear")
                                .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.clear.target.desc"))
                                .addChoices(
                                    { name: "critical", value: "critical" },
                                    { name: "commands", value: "commands" }
                                )
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("snapshot")
                        .setDescription("Toggle daily snapshot cron")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.snapshot.desc"))
                        .addBooleanOption((opt) =>
                            opt
                                .setName("enabled")
                                .setDescription("Enable or disable")
                                .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.snapshot.enabled.desc"))
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("view")
                        .setDescription("View current audit config")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.setup.view.desc"))
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand(true);

        if (group === "setup") {
            return handleSetup(interaction, sub);
        }
        await interaction.editReply("Unknown subcommand.");
    },
};

async function handleSetup(interaction: ChatInputCommandInteraction, sub: string): Promise<void> {
    const userId = interaction.user.id;

    switch (sub) {
        case "critical-channel":
        case "commands-channel": {
            const channel = interaction.options.getChannel("channel", true) as TextChannel;
            const botId = interaction.client.user?.id ?? "";
            if (!botHasRequiredPerms(channel, botId)) {
                await interaction.editReply("Bot is missing ViewChannel/SendMessages/EmbedLinks in that channel.");
                return;
            }
            if (sub === "critical-channel") {
                await AuditConfigService.setCriticalChannel(channel.id, userId);
            } else {
                await AuditConfigService.setCommandsChannel(channel.id, userId);
            }
            AuditDispatcherService.invalidateChannelCache();
            await interaction.editReply(`Saved. ${sub} → <#${channel.id}>`);
            return;
        }
        case "clear": {
            const target = interaction.options.getString("target", true) as "critical" | "commands";
            await AuditConfigService.clearChannel(target, userId);
            AuditDispatcherService.invalidateChannelCache();
            await interaction.editReply(`Cleared ${target} channel.`);
            return;
        }
        case "snapshot": {
            const enabled = interaction.options.getBoolean("enabled", true);
            await AuditConfigService.setSnapshotEnabled(enabled, userId);
            await interaction.editReply(`Snapshot cron ${enabled ? "enabled" : "disabled"}.`);
            return;
        }
        case "view": {
            const config = await AuditConfigService.getConfig();
            const embed = new EmbedBuilder()
                .setTitle("Audit config")
                .setColor(0x3b82f6)
                .addFields(
                    {
                        name: "Critical channel",
                        value: config.criticalChannelId ? `<#${config.criticalChannelId}>` : "not set",
                        inline: false,
                    },
                    {
                        name: "Commands channel",
                        value: config.commandsChannelId ? `<#${config.commandsChannelId}>` : "not set",
                        inline: false,
                    },
                    { name: "Snapshot enabled", value: String(config.snapshotEnabled), inline: true },
                    { name: "Updated by", value: config.updatedBy ? `<@${config.updatedBy}>` : "—", inline: true }
                )
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        default:
            await interaction.editReply("Unknown setup subcommand.");
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/audit.ts
git commit -m "feat(audit): add /audit command with setup subcommands"
```

---

## Task 17: Add `/audit query` subcommand group

**Files:**
- Modify: `src/commands/slash/audit.ts`

- [ ] **Step 1: Add imports at top of file**

Replace the existing import of Mongoose models at the top (add these 2 imports if not present):

```typescript
import GuildAuditModel from "../../models/guildAudit.model";
import GuildSnapshotModel from "../../models/guildSnapshot.model";
```

- [ ] **Step 2: Add the `query` subcommand group to `new SlashCommandBuilder()`**

Append `.addSubcommandGroup(...)` after the existing `setup` group (before the closing `,` of `data:`):

```typescript
        .addSubcommandGroup((group) =>
            group
                .setName("query")
                .setDescription("Query audit data")
                .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.desc"))
                .addSubcommand((sub) =>
                    sub
                        .setName("guilds")
                        .setDescription("List all guilds the bot is currently in")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.guilds.desc"))
                        .addIntegerOption((opt) =>
                            opt
                                .setName("page")
                                .setDescription("Page number")
                                .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.guilds.page.desc"))
                                .setMinValue(1)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("guild")
                        .setDescription("Detailed info for one guild")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.guild.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("target")
                                .setDescription("Guild ID")
                                .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.guild.target.desc"))
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("history")
                        .setDescription("Recent join/leave events")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.history.desc"))
                        .addIntegerOption((opt) =>
                            opt
                                .setName("limit")
                                .setDescription("Number of entries (1-25)")
                                .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.history.limit.desc"))
                                .setMinValue(1)
                                .setMaxValue(25)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("summary")
                        .setDescription("Realtime summary of all guilds")
                        .setDescriptionLocalizations(descriptionLocales("cmd.audit.query.summary.desc"))
                )
        ),
```

- [ ] **Step 3: Extend `execute()` to dispatch `query` group**

Inside the `execute` method, replace the `if (group === "setup")` block with:

```typescript
        if (group === "setup") {
            return handleSetup(interaction, sub);
        }
        if (group === "query") {
            return handleQuery(interaction, sub);
        }
        await interaction.editReply("Unknown subcommand.");
```

- [ ] **Step 4: Add `handleQuery` function at bottom of file**

```typescript
function sparkline(values: number[]): string {
    const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    if (values.length === 0) return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
        .map((v) => blocks[Math.min(blocks.length - 1, Math.floor(((v - min) / range) * (blocks.length - 1)))])
        .join("");
}

async function handleQuery(interaction: ChatInputCommandInteraction, sub: string): Promise<void> {
    switch (sub) {
        case "guilds": {
            const page = interaction.options.getInteger("page") ?? 1;
            const pageSize = 10;
            const [docs, total] = await Promise.all([
                GuildAuditModel.find({ currentlyIn: true })
                    .sort({ memberCount: -1 })
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .lean(),
                GuildAuditModel.countDocuments({ currentlyIn: true }),
            ]);
            const lines = docs
                .map(
                    (d, i) =>
                        `${(page - 1) * pageSize + i + 1}. **${d.name}** — ${d.memberCount.toLocaleString()} members (id: \`${d.guildId}\`, owner: \`${d.ownerId}\`)`
                )
                .join("\n") || "No guilds.";
            const embed = new EmbedBuilder()
                .setTitle(`Guilds (page ${page} / ${Math.max(1, Math.ceil(total / pageSize))})`)
                .setDescription(lines)
                .setFooter({ text: `Total: ${total}` })
                .setColor(0x3b82f6)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "guild": {
            const guildId = interaction.options.getString("target", true);
            const doc = await GuildAuditModel.findOne({ guildId }).lean();
            if (!doc) {
                await interaction.editReply("No GuildAudit record for that ID.");
                return;
            }
            const snaps = await GuildSnapshotModel.find({ guildId })
                .sort({ takenAt: -1 })
                .limit(30)
                .lean();
            const memberCounts = snaps.slice().reverse().map((s) => s.memberCount);
            const chart = sparkline(memberCounts);
            const embed = new EmbedBuilder()
                .setTitle(`Guild: ${doc.name}`)
                .setColor(doc.currentlyIn ? 0x22c55e : 0xef4444)
                .setThumbnail(doc.iconURL ?? null)
                .addFields(
                    { name: "Guild ID", value: doc.guildId, inline: true },
                    { name: "Owner", value: doc.ownerId, inline: true },
                    { name: "Currently in", value: String(doc.currentlyIn), inline: true },
                    { name: "Members", value: doc.memberCount.toLocaleString(), inline: true },
                    { name: "Joined", value: `<t:${Math.floor(doc.joinedAt.getTime() / 1000)}:R>`, inline: true },
                    {
                        name: "Left",
                        value: doc.leftAt ? `<t:${Math.floor(doc.leftAt.getTime() / 1000)}:R>` : "—",
                        inline: true,
                    },
                    { name: `Last ${memberCounts.length} snapshots`, value: chart || "—", inline: false }
                )
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "history": {
            const limit = interaction.options.getInteger("limit") ?? 20;
            const docs = await GuildAuditModel.find()
                .sort({ updatedAt: -1 })
                .limit(limit)
                .lean();
            const lines = docs
                .map((d) => {
                    const icon = d.currentlyIn ? "🟢" : "🔴";
                    const when = d.currentlyIn ? d.joinedAt : (d.leftAt ?? d.updatedAt);
                    return `${icon} **${d.name}** — <t:${Math.floor(when.getTime() / 1000)}:R>`;
                })
                .join("\n") || "No history.";
            const embed = new EmbedBuilder()
                .setTitle("Guild history")
                .setDescription(lines)
                .setColor(0x3b82f6)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "summary": {
            const client = interaction.client;
            const guilds = Array.from(client.guilds.cache.values());
            const totalMembers = guilds.reduce((s, g) => s + g.memberCount, 0);
            const top10 = guilds
                .slice()
                .sort((a, b) => b.memberCount - a.memberCount)
                .slice(0, 10)
                .map((g, i) => `${i + 1}. **${g.name}** — ${g.memberCount.toLocaleString()}`)
                .join("\n") || "—";
            const everLeft = await GuildAuditModel.countDocuments({ currentlyIn: false });
            const embed = new EmbedBuilder()
                .setTitle("Realtime summary")
                .setColor(0xeab308)
                .addFields(
                    { name: "Total guilds", value: String(guilds.length), inline: true },
                    { name: "Total members", value: totalMembers.toLocaleString(), inline: true },
                    { name: "Ever-left guilds", value: String(everLeft), inline: true },
                    { name: "Top 10", value: top10, inline: false }
                )
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        default:
            await interaction.editReply("Unknown query subcommand.");
    }
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/audit.ts
git commit -m "feat(audit): add /audit query subcommand group"
```

---

## Task 18: Add `/audit` to help category map

**Files:**
- Modify: `src/util/help/commandCategories.ts`

- [ ] **Step 1: Update category map**

Add under the `// General & utilities` block (keep alphabet-friendly):

```typescript
    audit: "other",
    commandlog: "other",
```

Note: only add `commandlog` if not already present. Check current file — add whichever are missing (`commandlog` may already be missing too).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/util/help/commandCategories.ts
git commit -m "feat(audit): register audit and commandlog in help categories"
```

---

## Task 19: Write steering doc for audit system

**Files:**
- Create: `docs/steering/audit-system.md`

- [ ] **Step 1: Write the steering doc**

```markdown
# Audit System

> Steering doc for AI assistants and contributors. Covers the dev-only audit pipeline: guild lifecycle tracking, command log bridging, daily snapshots, and the `/audit` slash command.

## Overview

Dual-channel dispatcher writes audit events to Discord text channels configured at runtime. Two MongoDB models (`GuildAudit`, `GuildSnapshot`) persist history; one singleton (`AuditConfig`) holds channel IDs and toggles. A 24h cron captures per-guild member-count snapshots for trend analysis.

## Access Control

All `/audit` subcommands require `isDevAuthorized()`:
- `interaction.guildId === GUILD_ID` (env)
- `interaction.user.id === DEV_USER_ID` (env)

All replies are ephemeral.

## Channels

| Channel | What it receives |
|---|---|
| `criticalChannelId` | Guild join/leave, command errors, admin-command actions, background job errors, startup/daily summaries |
| `commandsChannelId` | Every slash command execute (success or fail) |

Admin commands that also post to critical: `economy`, `guild-admin`, `commandlog`, `audit` (matched by top-level command name in `AuditService.ADMIN_COMMAND_NAMES`).

Channels are text channels in any guild the bot can reach. Bot must have `ViewChannel | SendMessages | EmbedLinks` — the `/audit setup critical-channel` / `commands-channel` handlers check this before saving.

## Pipeline

### Sources

| Source | Calls |
|---|---|
| `src/events/guildCreate.ts` | `AuditService.onGuildCreate(guild)` |
| `src/events/guildDelete.ts` | `AuditService.onGuildDelete(guild)` |
| `src/events/ready.ts` | `AuditDispatcherService.init(client)` + `AuditService.onReady(client)` |
| `src/events/interactionCreate.ts` | `AuditService.onCommandExecuted(entry)` after `CommandLogService.pushLog(entry)` |
| `src/util/audit/snapshotJob.ts` | `AuditService.snapshotAllGuilds(client)` (24h) |
| `premiumExpiry`, `guildStatsAggregator`, `commandLog.service` | `AuditService.logBackgroundError(jobName, err)` |

### Dispatcher

`AuditDispatcherService` (`src/services/audit/auditDispatcher.service.ts`) buffers embeds per channel (critical / commands). Flush triggers:

| Trigger | Condition |
|---|---|
| Threshold | Queue reaches **10 embeds** |
| Interval | Every **2000 ms** |

Channels are resolved via `client.channels.fetch(channelId)` and cached in memory. Resolution failure (missing channel, no access) nulls the cache entry — subsequent flushes for that channel are dropped until `invalidateChannelCache()` or process restart.

On `SIGINT`/`SIGTERM`, `AuditDispatcherService.drain()` flushes remaining buffers before exit.

## Data Models

### `AuditConfig` (singleton)

Collection: `AuditConfigs`. Single doc with `_id: "singleton"`.

| Field | Type | Description |
|---|---|---|
| `_id` | String | Always `"singleton"` |
| `criticalChannelId` | String? | Critical channel, null = disabled |
| `commandsChannelId` | String? | Commands channel, null = disabled |
| `snapshotEnabled` | Boolean | Toggle daily snapshot cron |
| `updatedBy` | String? | Dev userId that last changed config |

Redis cache: key `audit:config`, TTL 300s. Invalidated on any setter.

### `GuildAudit`

Collection: `GuildAudits`. One doc per guild the bot has ever been in.

| Field | Type | Description |
|---|---|---|
| `guildId` | String | Unique |
| `name` | String | Last known name |
| `ownerId` | String | Owner user ID |
| `memberCount` | Number | Last known member count |
| `iconURL` | String? | Guild icon |
| `joinedAt` | Date | When bot first joined |
| `leftAt` | Date? | When bot most recently left |
| `currentlyIn` | Boolean | Bot still in guild |

Indexes: `{guildId}` unique, `{currentlyIn, updatedAt: -1}`.

`onReady` reconciles: upserts guilds in cache, marks guilds not in cache as `currentlyIn=false`.

### `GuildSnapshot`

Collection: `GuildSnapshots`. Insert-only, one doc per guild per day.

| Field | Type |
|---|---|
| `guildId` | String |
| `memberCount` | Number |
| `takenAt` | Date |

Index: `{guildId, takenAt: -1}`. No TTL.

## Commands

### `/audit setup`

| Subcommand | Behavior |
|---|---|
| `critical-channel channel:#x` | Save critical channel after perm check |
| `commands-channel channel:#x` | Save commands channel after perm check |
| `clear target:<critical\|commands>` | Unset the chosen channel |
| `snapshot enabled:<bool>` | Toggle snapshot cron |
| `view` | Show current config |

### `/audit query`

| Subcommand | Output |
|---|---|
| `guilds page:N` | Paginated list of `currentlyIn: true` guilds sorted by memberCount desc |
| `guild target:<id>` | Metadata + sparkline of last 30 snapshots |
| `history limit:N` | Recent join/leave events |
| `summary` | Realtime totals from `client.guilds.cache` + ever-left count from Mongo |

## Embeds

Pure functions in `src/services/audit/auditEmbeds.ts` (English only — dev facing):

- `guildJoinEmbed` (green)
- `guildLeaveEmbed` (red)
- `commandSuccessEmbed` (blue)
- `commandErrorEmbed` (red)
- `adminActionEmbed` (purple)
- `startupSummaryEmbed` (yellow)
- `snapshotSummaryEmbed` (yellow)
- `backgroundErrorEmbed` (red)

## Key Files

| File | Purpose |
|---|---|
| `src/models/auditConfig.model.ts` | Singleton config schema |
| `src/models/guildAudit.model.ts` | Guild lifecycle schema |
| `src/models/guildSnapshot.model.ts` | Daily trend schema |
| `src/services/audit/audit.service.ts` | Event orchestrator, admin command list |
| `src/services/audit/auditConfig.service.ts` | Config CRUD + Redis cache |
| `src/services/audit/auditDispatcher.service.ts` | Buffered dispatcher |
| `src/services/audit/auditEmbeds.ts` | Embed builders |
| `src/events/guildCreate.ts` | Join handler |
| `src/events/guildDelete.ts` | Leave handler |
| `src/commands/slash/audit.ts` | Dev slash command |
| `src/util/audit/snapshotJob.ts` | 24h cron |

## Cross-References

- [command-logging.md](command-logging.md) — `CommandLog` model + `/commandlog` (separate from `/audit`, coexists)
- [premium-system.md](premium-system.md) — pattern for Redis-cached config + background expiry
```

- [ ] **Step 2: Commit**

```bash
git add docs/steering/audit-system.md
git commit -m "docs(audit): add steering doc for audit system"
```

---

## Task 20: Update CLAUDE.md, CHANGELOG.md, bump version

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Bump version in `package.json`**

Change:
```json
    "version": "5.6.0",
```
to:
```json
    "version": "5.7.0",
```

- [ ] **Step 2: Update `CHANGELOG.md`**

Under `## [Unreleased]` (or create a new section `## [5.7.0] - 2026-04-17`), add:

```markdown
## [5.7.0] - 2026-04-17

### Added

- **Audit system** — dev-only runtime observability: `/audit setup` configures two Discord text channels (critical events + all commands) with permission checks, `/audit query guilds|guild|history|summary` for Mongo-backed lookups, and a 24h cron that snapshots per-guild member counts.
- **Guild lifecycle tracking** — `guildCreate` / `guildDelete` events persist to `GuildAudit` collection and post embeds to the critical channel. `ready` reconciles guilds (marks bot-left guilds) and posts a startup summary.
- **Background error forwarding** — `premiumExpiry`, `guildStatsAggregator`, and `CommandLogService.flush` now emit errors to the audit critical channel.
```

- [ ] **Step 3: Update `CLAUDE.md`**

Under `src/models/` in the architecture tree, add:

```
    auditConfig.model.ts  # Singleton: critical/commands channel IDs + snapshot toggle
    guildAudit.model.ts    # Per-guild lifecycle (join/leave, memberCount)
    guildSnapshot.model.ts # Daily member count snapshot for trend analysis
```

Under `services/`, add:

```
    audit/                # Dev-only audit pipeline
      audit.service.ts    # Orchestrator: guildCreate/Delete/ready/commands/snapshots/errors
      auditConfig.service.ts # Config CRUD + Redis cache
      auditDispatcher.service.ts # Buffered Discord channel dispatcher
      auditEmbeds.ts      # Embed builders (English, dev-facing)
```

Under the "Feature Documentation" table, add:

```
| [docs/steering/audit-system.md](docs/steering/audit-system.md) | Dev-only audit: dual-channel dispatcher, guild lifecycle, daily snapshots, `/audit` command |
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md CLAUDE.md
git commit -m "chore(audit): bump to 5.7.0, update CHANGELOG and CLAUDE.md"
```

---

## Runtime verification (manual QA)

Run `npm run start:dev` and work through each item in the dev guild:

- [ ] `/audit setup view` → shows both channels unset initially.
- [ ] `/audit setup critical-channel channel:#audit-critical` in dev guild → reply "Saved. critical-channel → #audit-critical". `AuditConfig` Mongo doc has `criticalChannelId`.
- [ ] Restart bot → startup summary posted to `#audit-critical`.
- [ ] `/audit setup commands-channel channel:#audit-commands` → reply ok.
- [ ] Run any command (e.g. `/ping`) → embed appears in `#audit-commands` within 2s.
- [ ] Run `/economy admin dashboard` → embed in `#audit-commands` AND purple admin embed in `#audit-critical`.
- [ ] Intentionally throw inside a command handler (revert after) → red error embed appears in both channels.
- [ ] Invite bot to a second test guild → green join embed in `#audit-critical`, `GuildAudit` doc created with `currentlyIn: true`.
- [ ] Kick bot from that test guild → red leave embed, `GuildAudit.currentlyIn = false`.
- [ ] `/audit query guilds` → lists dev guild + any others still joined.
- [ ] `/audit query guild target:<dev-guild-id>` → shows metadata (sparkline may be empty until first snapshot).
- [ ] `/audit query history limit:5` → lists recent join/leave.
- [ ] `/audit query summary` → matches realtime cache.
- [ ] Temporarily change `INTERVAL_MS` in `snapshotJob.ts` to `60_000` (1 min). Restart. Wait 1 min → `GuildSnapshot` docs created, snapshot summary embed posts to `#audit-critical`. Revert the change before committing.
- [ ] Remove bot `SendMessages` perm in `#audit-commands` → next flush logs warning, subsequent commands no longer post to that channel. Re-grant + `/audit setup commands-channel channel:#audit-commands` again → resumes.
- [ ] `/audit setup clear target:commands` → commands channel unset, commands no longer post.
- [ ] `Ctrl+C` bot → `drain()` flushes queue before exit (observe final batch posts).
