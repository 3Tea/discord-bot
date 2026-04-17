"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/guildAudit.model.ts
const mongoose_1 = require("mongoose");
const guildAuditSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true },
    memberCount: { type: Number, required: true, default: 0 },
    iconURL: { type: String, default: null },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
    currentlyIn: { type: Boolean, required: true, default: true },
}, { timestamps: true, collection: "GuildAudits" });
guildAuditSchema.index({ guildId: 1 }, { unique: true });
guildAuditSchema.index({ currentlyIn: 1, updatedAt: -1 });
exports.default = (0, mongoose_1.model)("GuildAudit", guildAuditSchema);
