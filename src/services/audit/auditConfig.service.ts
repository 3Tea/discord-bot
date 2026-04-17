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
