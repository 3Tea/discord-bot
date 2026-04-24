"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const economySnapshotSchema = new mongoose_1.Schema({
    snapshotId: { type: String, required: true },
    guildId: { type: String, required: true },
    createdBy: { type: String, required: true },
    scope: { type: String, enum: ["coin", "gem", "streak", "all"], required: true },
    target: { type: String, required: true },
    data: [
        {
            userId: { type: String, required: true },
            coin: { type: Number },
            gem: { type: Number },
            prayStreak: { type: Number },
            lastStreakDate: { type: Date },
        },
    ],
    restoredAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: "EconomySnapshots",
});
economySnapshotSchema.index({ guildId: 1, createdAt: -1 });
economySnapshotSchema.index({ snapshotId: 1 }, { unique: true });
const EconomySnapshotModel = (0, mongoose_1.model)("EconomySnapshot", economySnapshotSchema);
exports.default = EconomySnapshotModel;
