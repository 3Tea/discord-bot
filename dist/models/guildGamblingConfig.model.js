"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildGamblingConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    minBet: { type: Number, default: 10, min: 1, max: 1_000_000 },
    maxBet: { type: Number, default: 500, min: 1, max: 10_000_000 },
}, {
    timestamps: true,
    collection: "GuildGamblingConfigs",
});
const GuildGamblingConfigModel = (0, mongoose_1.model)("GuildGamblingConfig", guildGamblingConfigSchema);
exports.default = GuildGamblingConfigModel;
