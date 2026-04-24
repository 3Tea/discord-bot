"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const questProgressSchema = new mongoose_1.Schema({
    questId: { type: String, required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    rewardPaid: { type: Boolean, default: false },
}, { _id: false });
const userQuestSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    quests: { type: [questProgressSchema], default: [] },
    claimed: { type: Boolean, default: false },
    questStreak: { type: Number, default: 0 },
    lastQuestDate: { type: String, default: null },
}, { timestamps: true, collection: "UserQuests" });
userQuestSchema.index({ userId: 1, date: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("UserQuest", userQuestSchema);
