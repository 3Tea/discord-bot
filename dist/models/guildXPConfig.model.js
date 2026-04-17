"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildXPConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    blacklistedChannels: { type: [String], default: [] },
    xpPerMessage: { type: Number, default: 20 },
    xpPerVoiceMinute: { type: Number, default: 5 },
    xpPerReaction: { type: Number, default: 3 },
    messageCooldown: { type: Number, default: 60 },
    minMessageLength: { type: Number, default: 3 },
    enabled: { type: Boolean, default: true },
}, {
    timestamps: true,
    collection: "GuildXPConfigs",
});
const GuildXPConfigModel = (0, mongoose_1.model)("GuildXPConfig", guildXPConfigSchema);
exports.default = GuildXPConfigModel;
