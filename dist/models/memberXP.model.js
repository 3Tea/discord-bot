"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const memberXPSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: null },
    lastMessageHash: { type: String, default: "" },
}, {
    timestamps: true,
    collection: "MemberXPs",
});
memberXPSchema.index({ guildId: 1, userId: 1 }, { unique: true });
memberXPSchema.index({ guildId: 1, xp: -1 });
const MemberXPModel = (0, mongoose_1.model)("MemberXP", memberXPSchema);
exports.default = MemberXPModel;
