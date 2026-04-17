"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/guildSnapshot.model.ts
const mongoose_1 = require("mongoose");
const guildSnapshotSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    memberCount: { type: Number, required: true },
    takenAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "GuildSnapshots" });
guildSnapshotSchema.index({ guildId: 1, takenAt: -1 });
exports.default = (0, mongoose_1.model)("GuildSnapshot", guildSnapshotSchema);
