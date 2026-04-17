"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildSocialConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    giftMaxAmount: { type: Number, default: 1000 },
    robSuccessRate: { type: Number, default: 0.4 },
    robStealMinPct: { type: Number, default: 10 },
    robStealMaxPct: { type: Number, default: 30 },
    robPenaltyMinPct: { type: Number, default: 10 },
    robPenaltyMaxPct: { type: Number, default: 20 },
    robMinBalance: { type: Number, default: 100 },
}, {
    timestamps: true,
    collection: "GuildSocialConfigs",
});
const GuildSocialConfigModel = (0, mongoose_1.model)("GuildSocialConfig", guildSocialConfigSchema);
exports.default = GuildSocialConfigModel;
