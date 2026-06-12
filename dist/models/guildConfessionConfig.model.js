"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildConfessionConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    mode: { type: String, enum: ["instant", "review"], default: "instant" },
    publicChannelId: { type: String, required: true },
    reviewChannelId: { type: String, default: null },
    cooldownMinutes: { type: Number, default: 10, min: 1, max: 120 },
    lastConfessionNumber: { type: Number, default: 0 },
    blockedKeywords: { type: [String], default: [] },
}, { timestamps: true, collection: "GuildConfessionConfigs" });
exports.default = (0, mongoose_1.model)("GuildConfessionConfig", guildConfessionConfigSchema);
