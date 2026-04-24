"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const DEFAULT_GEM_MILESTONES = new Map([
    ["10", 1],
    ["25", 2],
    ["50", 3],
    ["75", 4],
    ["100", 5],
]);
const guildEconomyRewardConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    levelUpCoinBase: { type: Number, default: 50 },
    levelUpCoinPerLevel: { type: Number, default: 10 },
    gemMilestones: {
        type: Map,
        of: Number,
        default: () => new Map(DEFAULT_GEM_MILESTONES),
    },
    voiceCoinInterval: { type: Number, default: 30 },
    voiceCoinReward: { type: Number, default: 10 },
}, {
    timestamps: true,
    collection: "GuildEconomyRewardConfigs",
});
const GuildEconomyRewardConfigModel = (0, mongoose_1.model)("GuildEconomyRewardConfig", guildEconomyRewardConfigSchema);
exports.default = GuildEconomyRewardConfigModel;
