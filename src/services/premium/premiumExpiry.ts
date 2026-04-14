import { EmbedBuilder } from "discord.js";
import UserWalletModel from "../../models/userWallet.model";
import TransactionModel from "../../models/transaction.model";
import redis from "../../connector/redis/index";
import { logger } from "../../util/log/logger.mixed";
import { resolveUserLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

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

    // Best-effort DM notification — failures do not affect the expiry process
    try {
        const client = (await import("../../client")).default;
        for (const wallet of expired) {
            try {
                const locale = await resolveUserLocale(wallet.userId);
                const user = await client.users.fetch(wallet.userId);
                const embed = new EmbedBuilder()
                    .setTitle(t(locale, "premium.expire.title"))
                    .setDescription(
                        t(locale, "premium.expire.notice", { tier: String(wallet.premiumTier).toUpperCase() })
                    )
                    .setColor(0x95a5a6)
                    .setTimestamp();
                await user.send({ embeds: [embed] });
            } catch {
                // DM may fail if user has DMs closed — silently skip
            }
        }
    } catch {
        // Client not ready or import failed — skip DM notifications
    }

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
