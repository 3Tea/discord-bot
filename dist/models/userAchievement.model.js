"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userAchievementSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    achievementId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    rewardPaid: { type: Boolean, default: true },
}, {
    timestamps: true,
    collection: "UserAchievements",
});
userAchievementSchema.index({ userId: 1, guildId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, guildId: 1 });
const UserAchievementModel = (0, mongoose_1.model)("UserAchievement", userAchievementSchema);
exports.default = UserAchievementModel;
