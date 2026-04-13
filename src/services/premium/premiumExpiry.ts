import UserWalletModel from "../../models/userWallet.model";
import TransactionModel from "../../models/transaction.model";
import redis from "../../connector/redis/index";
import { logger } from "../../util/log/logger.mixed";

const INTERVAL_MS = 10 * 60 * 1000;
const GLOBAL_GUILD_ID = "global";

async function expireStale(): Promise<void> {
    const now = new Date();

    const expired = await UserWalletModel.find({
        premiumTier: { $ne: null },
        premiumUntil: { $ne: null, $lt: now },
    }).lean();

    if (expired.length === 0) return;

    const userIds = expired.map((w) => w.userId);

    await UserWalletModel.updateMany(
        { userId: { $in: userIds } },
        {
            $set: {
                premiumTier: null,
                premiumUntil: null,
                premiumSource: null,
                premiumGrantedBy: null,
            },
        }
    );

    const transactions = expired.map((w) => ({
        userId: w.userId,
        guildId: GLOBAL_GUILD_ID,
        type: "premium_expire" as const,
        coinDelta: 0,
        gemDelta: 0,
        metadata: { expiredTier: w.premiumTier, expiredAt: w.premiumUntil },
    }));
    await TransactionModel.insertMany(transactions);

    await Promise.all(userIds.map((id) => redis.deleteKey(`premium:${id}`)));

    logger.info(`[premiumExpiry] Expired ${expired.length} premium subscription(s)`);
}

export function startPremiumExpiry(): void {
    setTimeout(() => {
        expireStale().catch((error) => {
            logger.error(`[premiumExpiry] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, 10_000);

    setInterval(() => {
        expireStale().catch((error) => {
            logger.error(`[premiumExpiry] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, INTERVAL_MS);
}
