import UserWalletModel, { PremiumTier, PremiumSource } from "../../models/userWallet.model";
import TransactionModel, { TransactionType } from "../../models/transaction.model";
import redis from "../../connector/redis/index";
import { getTierConfig, TierConfig } from "./premium.config";

const GLOBAL_GUILD_ID = "global";
const CACHE_TTL = 300;

export interface PremiumStatus {
    tier: PremiumTier | null;
    isActive: boolean;
    until: Date | null;
    source: PremiumSource | null;
}

function cacheKey(userId: string): string {
    return `premium:${userId}`;
}

async function cacheGet(userId: string): Promise<PremiumStatus | null> {
    return redis.getJson(cacheKey(userId));
}

async function cacheSet(userId: string, status: PremiumStatus): Promise<void> {
    await redis.setJson(cacheKey(userId), status, CACHE_TTL);
}

async function cacheClear(userId: string): Promise<void> {
    await redis.deleteKey(cacheKey(userId));
}

async function logPremiumTransaction(
    userId: string,
    type: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await TransactionModel.create({
        userId,
        guildId: GLOBAL_GUILD_ID,
        type,
        coinDelta: 0,
        gemDelta: 0,
        metadata,
    });
}

export type DurationKey = "7d" | "30d" | "90d" | "365d" | "lifetime";

const DURATION_MS: Record<Exclude<DurationKey, "lifetime">, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "365d": 365 * 24 * 60 * 60 * 1000,
};

function computeExpiry(duration: DurationKey, existingUntil: Date | null): Date | null {
    if (duration === "lifetime") return null;
    const baseDate = existingUntil && existingUntil.getTime() > Date.now() ? existingUntil : new Date();
    return new Date(baseDate.getTime() + DURATION_MS[duration]);
}

async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
    const cached = await cacheGet(userId);
    if (cached) return cached;

    const wallet = await UserWalletModel.findOne({ userId }).lean();
    if (!wallet || !wallet.premiumTier) {
        const status: PremiumStatus = { tier: null, isActive: false, until: null, source: null };
        await cacheSet(userId, status);
        return status;
    }

    const isExpired = wallet.premiumUntil !== null && wallet.premiumUntil.getTime() < Date.now();
    if (isExpired) {
        await clearPremium(userId);
        await logPremiumTransaction(userId, "premium_expire", {
            expiredTier: wallet.premiumTier,
            expiredAt: wallet.premiumUntil,
        });
        const status: PremiumStatus = { tier: null, isActive: false, until: null, source: null };
        await cacheSet(userId, status);
        return status;
    }

    const status: PremiumStatus = {
        tier: wallet.premiumTier as PremiumTier,
        isActive: true,
        until: wallet.premiumUntil,
        source: wallet.premiumSource as PremiumSource | null,
    };
    await cacheSet(userId, status);
    return status;
}

async function getTier(userId: string): Promise<PremiumTier | null> {
    const { tier } = await getPremiumStatus(userId);
    return tier;
}

async function getConfig(userId: string): Promise<TierConfig> {
    const tier = await getTier(userId);
    return getTierConfig(tier);
}

async function activate(
    userId: string,
    tier: PremiumTier,
    duration: DurationKey,
    source: PremiumSource,
    grantedBy?: string
): Promise<{ action: "activate" | "extend" | "upgrade" | "downgrade"; until: Date | null }> {
    const current = await getPremiumStatus(userId);
    let action: "activate" | "extend" | "upgrade" | "downgrade";
    let transactionType: TransactionType;
    let premiumUntil: Date | null;

    if (!current.isActive) {
        action = "activate";
        transactionType = "premium_activate";
        premiumUntil = computeExpiry(duration, null);
    } else if (current.tier === tier) {
        action = "extend";
        transactionType = "premium_extend";
        premiumUntil = computeExpiry(duration, current.until);
    } else if (current.tier === "star" && tier === "galaxy") {
        action = "upgrade";
        transactionType = "premium_upgrade";
        premiumUntil = computeExpiry(duration, null);
    } else {
        action = "downgrade";
        transactionType = "premium_downgrade";
        premiumUntil = computeExpiry(duration, null);
    }

    await UserWalletModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, star: 0, dailyStreak: 0, claimedMilestones: [] } },
        { upsert: true }
    );

    await UserWalletModel.updateOne(
        { userId },
        {
            $set: {
                premiumTier: tier,
                premiumUntil,
                premiumSource: source,
                premiumGrantedBy: grantedBy ?? null,
            },
        }
    );

    await logPremiumTransaction(userId, transactionType, {
        tier,
        duration,
        source,
        grantedBy: grantedBy ?? null,
        until: premiumUntil?.toISOString() ?? "lifetime",
        previousTier: current.tier,
    });

    await cacheClear(userId);

    return { action, until: premiumUntil };
}

async function revoke(userId: string, revokedBy: string, reason?: string): Promise<boolean> {
    const current = await getPremiumStatus(userId);
    if (!current.isActive) return false;

    await clearPremium(userId);

    await logPremiumTransaction(userId, "premium_revoke", {
        revokedTier: current.tier,
        revokedBy,
        reason: reason ?? null,
    });

    return true;
}

async function clearPremium(userId: string): Promise<void> {
    await UserWalletModel.updateOne(
        { userId },
        {
            $set: {
                premiumTier: null,
                premiumUntil: null,
                premiumSource: null,
                premiumGrantedBy: null,
            },
        }
    );
    await cacheClear(userId);
}

export default { getPremiumStatus, getTier, getConfig, activate, revoke };
