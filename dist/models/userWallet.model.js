"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userWalletSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    star: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    dailyStreak: { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null },
    claimedMilestones: { type: [String], default: [] },
    premiumTier: { type: String, enum: ["star", "galaxy", null], default: null },
    premiumUntil: { type: Date, default: null },
    premiumSource: { type: String, enum: ["auto", "manual", null], default: null },
    premiumGrantedBy: { type: String, default: null },
}, { timestamps: true, collection: "UserWallets" });
userWalletSchema.index({ userId: 1 }, { unique: true });
userWalletSchema.index({ star: -1 });
userWalletSchema.index({ premiumTier: 1, premiumUntil: 1 });
exports.default = (0, mongoose_1.model)("UserWallet", userWalletSchema);
