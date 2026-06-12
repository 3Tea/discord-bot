"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const confessionVoteSchema = new mongoose_1.Schema({
    confessionId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "Confession" },
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    vote: { type: String, enum: ["up", "down"], required: true },
}, { timestamps: true, collection: "ConfessionVotes" });
confessionVoteSchema.index({ confessionId: 1, userId: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("ConfessionVote", confessionVoteSchema);
