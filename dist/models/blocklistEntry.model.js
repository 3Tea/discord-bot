"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const blocklistEntrySchema = new mongoose_1.Schema({
    type: { type: String, required: true, enum: ["user", "guild"] },
    targetId: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    blockedBy: { type: String, required: true },
    blockedAt: { type: Date, required: true, default: () => new Date() },
    guildName: { type: String },
    leftAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: "Blocklist",
});
blocklistEntrySchema.index({ type: 1, targetId: 1 }, { unique: true });
const BlocklistEntryModel = (0, mongoose_1.model)("BlocklistEntry", blocklistEntrySchema);
exports.default = BlocklistEntryModel;
