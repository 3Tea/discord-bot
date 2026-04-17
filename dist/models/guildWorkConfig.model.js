"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildWorkConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    workMinReward: { type: Number, default: 80, min: 1, max: 1_000_000 },
    workMaxReward: { type: Number, default: 200, min: 1, max: 10_000_000 },
    fishRewardMultiplier: { type: Number, default: 1.0, min: 0.1, max: 10 },
}, {
    timestamps: true,
    collection: "GuildWorkConfigs",
});
const GuildWorkConfigModel = (0, mongoose_1.model)("GuildWorkConfig", guildWorkConfigSchema);
exports.default = GuildWorkConfigModel;
