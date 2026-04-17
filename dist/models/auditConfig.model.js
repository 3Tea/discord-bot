"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/auditConfig.model.ts
const mongoose_1 = require("mongoose");
const auditConfigSchema = new mongoose_1.Schema({
    _id: { type: String, default: "singleton" },
    criticalChannelId: { type: String, default: null },
    commandsChannelId: { type: String, default: null },
    snapshotEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, default: null },
}, {
    timestamps: true,
    collection: "AuditConfigs",
});
exports.default = (0, mongoose_1.model)("AuditConfig", auditConfigSchema);
