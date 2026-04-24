"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildStatsSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    totalXP: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalVoiceMinutes: { type: Number, default: 0 },
    totalReactions: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    lastAggregatedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: "GuildStats",
});
guildStatsSchema.index({ totalXP: -1 });
const GuildStatsModel = (0, mongoose_1.model)("GuildStats", guildStatsSchema);
exports.default = GuildStatsModel;
