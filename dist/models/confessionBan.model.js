"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const confessionBanSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
}, { timestamps: true, collection: "ConfessionBans" });
confessionBanSchema.index({ guildId: 1, userId: 1, active: 1 });
exports.default = (0, mongoose_1.model)("ConfessionBan", confessionBanSchema);
