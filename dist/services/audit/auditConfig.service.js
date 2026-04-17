"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditConfigService = void 0;
// src/services/audit/auditConfig.service.ts
const auditConfig_model_1 = __importDefault(require("../../models/auditConfig.model"));
const index_1 = __importDefault(require("../../connector/redis/index"));
const CACHE_KEY = "audit:config";
const CACHE_TTL_SECONDS = 300;
function toSnapshot(doc) {
    return {
        criticalChannelId: doc.criticalChannelId ?? null,
        commandsChannelId: doc.commandsChannelId ?? null,
        snapshotEnabled: doc.snapshotEnabled,
        updatedBy: doc.updatedBy ?? null,
    };
}
async function ensureDoc() {
    const doc = await auditConfig_model_1.default.findOneAndUpdate({ _id: "singleton" }, { $setOnInsert: { snapshotEnabled: true } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return doc;
}
async function getConfig() {
    const cached = await index_1.default.getJson(CACHE_KEY);
    if (cached)
        return cached;
    const doc = await ensureDoc();
    const snap = toSnapshot(doc);
    await index_1.default.setJson(CACHE_KEY, snap, CACHE_TTL_SECONDS);
    return snap;
}
async function invalidate() {
    await index_1.default.deleteKey(CACHE_KEY);
}
async function setCriticalChannel(channelId, updatedBy) {
    await auditConfig_model_1.default.updateOne({ _id: "singleton" }, { $set: { criticalChannelId: channelId, updatedBy } }, { upsert: true });
    await invalidate();
}
async function setCommandsChannel(channelId, updatedBy) {
    await auditConfig_model_1.default.updateOne({ _id: "singleton" }, { $set: { commandsChannelId: channelId, updatedBy } }, { upsert: true });
    await invalidate();
}
async function clearChannel(target, updatedBy) {
    const field = target === "critical" ? "criticalChannelId" : "commandsChannelId";
    await auditConfig_model_1.default.updateOne({ _id: "singleton" }, { $set: { [field]: null, updatedBy } }, { upsert: true });
    await invalidate();
}
async function setSnapshotEnabled(enabled, updatedBy) {
    await auditConfig_model_1.default.updateOne({ _id: "singleton" }, { $set: { snapshotEnabled: enabled, updatedBy } }, { upsert: true });
    await invalidate();
}
exports.AuditConfigService = {
    getConfig,
    invalidate,
    setCriticalChannel,
    setCommandsChannel,
    clearChannel,
    setSnapshotEnabled,
};
