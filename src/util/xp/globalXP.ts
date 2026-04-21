import UserModel from "../../models/user.model";

/**
 * Increment global totalPoint for a user, clamping to >= 0 atomically.
 * Creates the User doc if needed. The clamp is applied inside the same
 * aggregation-pipeline update so concurrent increments cannot be lost
 * to a non-atomic read-then-set.
 */
export async function syncGlobalXP(userId: string, xpDelta: number): Promise<void> {
    if (xpDelta === 0) return;

    await UserModel.updateOne(
        { userID: userId },
        [
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
        ],
        { upsert: true }
    );
}

/**
 * Get the global rank position for a user.
 * Returns 0 if user has no record.
 */
export async function getGlobalRank(userId: string): Promise<{ rank: number; totalPoint: number }> {
    const user = await UserModel.findOne({ userID: userId }).lean();
    if (!user) return { rank: 0, totalPoint: 0 };

    const higherCount = await UserModel.countDocuments({
        totalPoint: { $gt: user.totalPoint },
    });

    return { rank: higherCount + 1, totalPoint: user.totalPoint };
}
