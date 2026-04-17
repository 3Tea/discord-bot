"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGlobalXP = syncGlobalXP;
exports.getGlobalRank = getGlobalRank;
const user_model_1 = __importDefault(require("../../models/user.model"));
/**
 * Increment global totalPoint for a user. Creates the User doc if needed.
 */
async function syncGlobalXP(userId, xpDelta) {
    if (xpDelta === 0)
        return;
    const result = await user_model_1.default.findOneAndUpdate({ userID: userId }, {
        $inc: { totalPoint: xpDelta },
        $set: { lastActivity: new Date() },
        $setOnInsert: { userID: userId, totalCoin: 0, topAllServer: 0, status: true },
    }, { upsert: true, new: true });
    // Clamp totalPoint to 0 if it went negative (admin remove edge case)
    if (result.totalPoint < 0) {
        await user_model_1.default.updateOne({ _id: result._id }, { $set: { totalPoint: 0 } });
    }
}
/**
 * Get the global rank position for a user.
 * Returns 0 if user has no record.
 */
async function getGlobalRank(userId) {
    const user = await user_model_1.default.findOne({ userID: userId });
    if (!user)
        return { rank: 0, totalPoint: 0 };
    const higherCount = await user_model_1.default.countDocuments({
        totalPoint: { $gt: user.totalPoint },
    });
    return { rank: higherCount + 1, totalPoint: user.totalPoint };
}
