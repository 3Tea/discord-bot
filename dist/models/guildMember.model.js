"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/guildMember.model.ts
const mongoose_1 = require("mongoose");
const guildMemberSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    rank: { type: String, default: "f", enum: ["f", "e", "d", "c", "b", "a", "s", "ss", "sss", "legendary"] },
    gp: { type: Number, default: 0, min: 0 },
    questsCompleted: { type: Number, default: 0, min: 0 },
    activeQuests: [{ type: String }],
    lastBoardDate: { type: String, default: "" },
    lastPersonalDate: { type: String, default: "" },
    pvpRating: { type: Number, default: 1000 },
    pvpWins: { type: Number, default: 0, min: 0 },
    pvpLosses: { type: Number, default: 0, min: 0 },
}, { timestamps: true, collection: "GuildMembers" });
guildMemberSchema.index({ userId: 1 }, { unique: true });
guildMemberSchema.index({ gp: -1 });
guildMemberSchema.index({ questsCompleted: -1 });
guildMemberSchema.index({ pvpRating: -1 });
const GuildMemberModel = (0, mongoose_1.model)("GuildMember", guildMemberSchema);
exports.default = GuildMemberModel;
