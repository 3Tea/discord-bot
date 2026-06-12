"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGlobalXP = syncGlobalXP;
exports.getGlobalRank = getGlobalRank;
const user_model_1 = __importDefault(require("../../models/user.model"));
/**
 * Increment global totalPoint for a user, clamping to >= 0 atomically.
 * Creates the User doc if needed. The clamp is applied inside the same
 * aggregation-pipeline update so concurrent increments cannot be lost
 * to a non-atomic read-then-set.
 */
async function syncGlobalXP(userId, xpDelta) {
    if (xpDelta === 0)
        return;
    await user_model_1.default.updateOne({ userID: userId }, [
        {
            $set: {
                userID: { $ifNull: ["$userID", userId] },
                totalPoint: {
                    $max: [{ $add: [{ $ifNull: ["$totalPoint", 0] }, xpDelta] }, 0],
                },
                totalCoin: { $ifNull: ["$totalCoin", 0] },
                topAllServer: { $ifNull: ["$topAllServer", 0] },
                status: { $ifNull: ["$status", true] },
                lastActivity: "$$NOW",
            },
        },
    ], { upsert: true, updatePipeline: true });
}
/**
 * Get the global rank position for a user.
 * Returns 0 if user has no record.
 */
async function getGlobalRank(userId) {
    const user = await user_model_1.default.findOne({ userID: userId }).lean();
    if (!user)
        return { rank: 0, totalPoint: 0 };
    const higherCount = await user_model_1.default.countDocuments({
        totalPoint: { $gt: user.totalPoint },
    });
    return { rank: higherCount + 1, totalPoint: user.totalPoint };
}
