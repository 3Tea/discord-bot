import UserModel from "../../models/user.model";

/**
 * Increment global totalPoint for a user. Creates the User doc if needed.
 */
export async function syncGlobalXP(userId: string, xpDelta: number): Promise<void> {
    if (xpDelta === 0) return;

    const result = await UserModel.findOneAndUpdate(
        { userID: userId },
        {
            $inc: { totalPoint: xpDelta },
            $set: { lastActivity: new Date() },
            $setOnInsert: { userID: userId, totalCoin: 0, topAllServer: 0, status: true },
        },
        { upsert: true, new: true }
    );

    // Clamp totalPoint to 0 if it went negative (admin remove edge case)
    if (result.totalPoint < 0) {
        await UserModel.updateOne({ _id: result._id }, { $set: { totalPoint: 0 } });
    }
}

/**
 * Get the global rank position for a user.
 * Returns 0 if user has no record.
 */
export async function getGlobalRank(userId: string): Promise<{ rank: number; totalPoint: number }> {
    const user = await UserModel.findOne({ userID: userId });
    if (!user) return { rank: 0, totalPoint: 0 };

    const higherCount = await UserModel.countDocuments({
        totalPoint: { $gt: user.totalPoint },
    });

    return { rank: higherCount + 1, totalPoint: user.totalPoint };
}
