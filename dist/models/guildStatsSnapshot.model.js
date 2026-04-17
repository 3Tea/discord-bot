"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/guildStatsSnapshot.model.ts
const mongoose_1 = require("mongoose");
const guildStatsSnapshotSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
    periodKey: { type: String, required: true },
    xp: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: "GuildStatsSnapshots",
});
guildStatsSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1 }, { unique: true });
guildStatsSnapshotSchema.index({ period: 1, periodKey: 1, xp: -1 });
const GuildStatsSnapshotModel = (0, mongoose_1.model)("GuildStatsSnapshot", guildStatsSnapshotSchema);
exports.default = GuildStatsSnapshotModel;
