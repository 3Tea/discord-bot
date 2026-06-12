"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/auditConfig.model.ts
const mongoose_1 = require("mongoose");
const auditConfigSchema = new mongoose_1.Schema({
    _id: { type: String, default: "singleton" },
    criticalChannelId: { type: String, default: null },
    commandsChannelId: { type: String, default: null },
    outputsChannelId: { type: String, default: null },
    snapshotEnabled: { type: Boolean, default: true },
    alertMemberDropPct: { type: Number, default: 20, min: 0, max: 100 },
    alertBgErrorsPerHour: { type: Number, default: 10, min: 0 },
    alertGuildLeavesPerHour: { type: Number, default: 3, min: 0 },
    alertRoleId: { type: String, default: null },
    alertCooldownMinutes: { type: Number, default: 60, min: 1 },
    updatedBy: { type: String, default: null },
}, {
    timestamps: true,
    collection: "AuditConfigs",
});
exports.default = (0, mongoose_1.model)("AuditConfig", auditConfigSchema);
