"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/xpSnapshot.model.ts
const mongoose_1 = require("mongoose");
const xpSnapshotSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, default: null },
    period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
    periodKey: { type: String, required: true },
    xp: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: "XPSnapshots",
});
// Leaderboard queries: find top users for a given period in a guild (or global)
xpSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1, xp: -1 });
// Upsert & individual user lookup
xpSnapshotSchema.index({ userId: 1, guildId: 1, period: 1, periodKey: 1 }, { unique: true });
const XPSnapshotModel = (0, mongoose_1.model)("XPSnapshot", xpSnapshotSchema);
exports.default = XPSnapshotModel;
