"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const economyFreezeSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    frozenBy: { type: String, required: true },
    reason: { type: String, default: "" },
}, {
    timestamps: true,
    collection: "EconomyFreezes",
});
economyFreezeSchema.index({ userId: 1, guildId: 1 }, { unique: true });
const EconomyFreezeModel = (0, mongoose_1.model)("EconomyFreeze", economyFreezeSchema);
exports.default = EconomyFreezeModel;
