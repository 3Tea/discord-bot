"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userEconomySchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    coin: { type: Number, default: 0, min: 0 },
    gem: { type: Number, default: 0, min: 0 },
    lastPray: { type: Date, default: null },
    lastCurse: { type: Date, default: null },
    prayStreak: { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null },
    mineDepth: { type: Number, default: 1 },
    mineCheckpoint: { type: Number, default: 1 },
    dungeonDepth: { type: Number, default: 1 },
    dungeonCheckpoint: { type: Number, default: 1 },
}, {
    timestamps: true,
    collection: "UserEconomies",
});
userEconomySchema.index({ userId: 1, guildId: 1 }, { unique: true });
userEconomySchema.index({ guildId: 1, coin: -1 });
const UserEconomyModel = (0, mongoose_1.model)("UserEconomy", userEconomySchema);
exports.default = UserEconomyModel;
