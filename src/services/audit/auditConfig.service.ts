// src/services/audit/auditConfig.service.ts
import type { UpdateQuery } from "mongoose";
import AuditConfigModel, { IAuditConfig } from "../../models/auditConfig.model";
import redis from "../../connector/redis/index";

const CACHE_KEY = "audit:config";
const CACHE_TTL_SECONDS = 300;

export interface AuditConfigSnapshot {
    criticalChannelId: string | null;
    commandsChannelId: string | null;
    outputsChannelId: string | null;
    snapshotEnabled: boolean;
    alertMemberDropPct: number;
    alertBgErrorsPerHour: number;
    alertGuildLeavesPerHour: number;
    alertRoleId: string | null;
    alertCooldownMinutes: number;
    updatedBy: string | null;
}

export interface AlertThresholdsPatch {
    memberDropPct?: number;
    bgErrorsPerHour?: number;
    guildLeavesPerHour?: number;
    roleId?: string | null;
    cooldownMinutes?: number;
}

function toSnapshot(doc: IAuditConfig): AuditConfigSnapshot {
    return {
        criticalChannelId: doc.criticalChannelId ?? null,
        commandsChannelId: doc.commandsChannelId ?? null,
        outputsChannelId: doc.outputsChannelId ?? null,
        snapshotEnabled: doc.snapshotEnabled,
        alertMemberDropPct: doc.alertMemberDropPct ?? 20,
        alertBgErrorsPerHour: doc.alertBgErrorsPerHour ?? 10,
        alertGuildLeavesPerHour: doc.alertGuildLeavesPerHour ?? 3,
        alertRoleId: doc.alertRoleId ?? null,
        alertCooldownMinutes: doc.alertCooldownMinutes ?? 60,
        updatedBy: doc.updatedBy ?? null,
    };
}

async function ensureDoc(): Promise<IAuditConfig> {
    const doc = await AuditConfigModel.findOneAndUpdate(
        { _id: "singleton" },
        { $setOnInsert: { snapshotEnabled: true } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return doc as IAuditConfig;
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

async function setOutputsChannel(channelId: string, updatedBy: string): Promise<void> {
    await AuditConfigModel.updateOne(
        { _id: "singleton" },
        { $set: { outputsChannelId: channelId, updatedBy } },
        { upsert: true }
    );
    await invalidate();
}

async function clearChannel(target: "critical" | "commands" | "outputs", updatedBy: string): Promise<void> {
    let field: string;
    if (target === "critical") {
        field = "criticalChannelId";
    } else if (target === "commands") {
        field = "commandsChannelId";
    } else {
        field = "outputsChannelId";
    }
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

async function setAlertThresholds(patch: AlertThresholdsPatch, updatedBy: string): Promise<void> {
    const set: UpdateQuery<IAuditConfig>["$set"] = { updatedBy };
    if (patch.memberDropPct !== undefined) set.alertMemberDropPct = patch.memberDropPct;
    if (patch.bgErrorsPerHour !== undefined) set.alertBgErrorsPerHour = patch.bgErrorsPerHour;
    if (patch.guildLeavesPerHour !== undefined) set.alertGuildLeavesPerHour = patch.guildLeavesPerHour;
    if (patch.roleId !== undefined) set.alertRoleId = patch.roleId;
    if (patch.cooldownMinutes !== undefined) set.alertCooldownMinutes = patch.cooldownMinutes;

    await AuditConfigModel.updateOne({ _id: "singleton" }, { $set: set }, { upsert: true });
    await invalidate();
}

export const AuditConfigService = {
    getConfig,
    invalidate,
    setCriticalChannel,
    setCommandsChannel,
    setOutputsChannel,
    clearChannel,
    setSnapshotEnabled,
    setAlertThresholds,
};
