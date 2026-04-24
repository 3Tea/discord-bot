"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const economyLogConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    thresholds: {
        coinTransaction: { type: Number, default: 500 },
        gemTransaction: { type: Number, default: 5 },
        gamblingWin: { type: Number, default: 1000 },
        robSuccess: { type: Boolean, default: true },
        adminActions: { type: Boolean, default: true },
        bulkOperations: { type: Boolean, default: true },
    },
}, {
    timestamps: true,
    collection: "EconomyLogConfigs",
});
economyLogConfigSchema.index({ guildId: 1 }, { unique: true });
const EconomyLogConfigModel = (0, mongoose_1.model)("EconomyLogConfig", economyLogConfigSchema);
exports.default = EconomyLogConfigModel;
