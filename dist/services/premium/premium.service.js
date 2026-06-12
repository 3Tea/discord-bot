"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userWallet_model_1 = __importDefault(require("../../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const index_1 = __importDefault(require("../../connector/redis/index"));
const premium_config_1 = require("./premium.config");
const GLOBAL_GUILD_ID = "global";
const CACHE_TTL = 300;
function cacheKey(userId) {
    return `premium:${userId}`;
}
async function cacheGet(userId) {
    return index_1.default.getJson(cacheKey(userId));
}
async function cacheSet(userId, status) {
    await index_1.default.setJson(cacheKey(userId), status, CACHE_TTL);
}
async function cacheClear(userId) {
    await index_1.default.deleteKey(cacheKey(userId));
}
async function logPremiumTransaction(userId, type, metadata = {}) {
    await transaction_model_1.default.create({
        userId,
        guildId: GLOBAL_GUILD_ID,
        type,
        coinDelta: 0,
        gemDelta: 0,
        metadata,
    });
}
const DURATION_MS = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "365d": 365 * 24 * 60 * 60 * 1000,
};
function computeExpiry(duration, existingUntil) {
    if (duration === "lifetime")
        return null;
    const baseDate = existingUntil && existingUntil.getTime() > Date.now() ? existingUntil : new Date();
    return new Date(baseDate.getTime() + DURATION_MS[duration]);
}
async function getPremiumStatus(userId) {
    const cached = await cacheGet(userId);
    if (cached)
        return cached;
    const wallet = await userWallet_model_1.default.findOne({ userId }).lean();
    if (!wallet || !wallet.premiumTier) {
        const status = { tier: null, isActive: false, until: null, source: null, grantedBy: null };
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
        const status = { tier: null, isActive: false, until: null, source: null, grantedBy: null };
        await cacheSet(userId, status);
        return status;
    }
    const status = {
        tier: wallet.premiumTier,
        isActive: true,
        until: wallet.premiumUntil,
        source: wallet.premiumSource,
        grantedBy: wallet.premiumGrantedBy ?? null,
    };
    await cacheSet(userId, status);
    return status;
}
async function getTier(userId) {
    const { tier } = await getPremiumStatus(userId);
    return tier;
}
async function getConfig(userId) {
    const tier = await getTier(userId);
    return (0, premium_config_1.getTierConfig)(tier);
}
async function activate(userId, tier, duration, source, grantedBy) {
    const current = await getPremiumStatus(userId);
    let action;
    let transactionType;
    let premiumUntil;
    if (!current.isActive) {
        action = "activate";
        transactionType = "premium_activate";
        premiumUntil = computeExpiry(duration, null);
    }
    else if (current.tier === tier) {
        action = "extend";
        transactionType = "premium_extend";
        premiumUntil = computeExpiry(duration, current.until);
    }
    else if (current.tier === "star" && tier === "galaxy") {
        action = "upgrade";
        transactionType = "premium_upgrade";
        premiumUntil = computeExpiry(duration, null);
    }
    else {
        action = "downgrade";
        transactionType = "premium_downgrade";
        premiumUntil = computeExpiry(duration, null);
    }
    await userWallet_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId, star: 0, dailyStreak: 0, claimedMilestones: [] } }, { upsert: true });
    await userWallet_model_1.default.updateOne({ userId }, {
        $set: {
            premiumTier: tier,
            premiumUntil,
            premiumSource: source,
            premiumGrantedBy: grantedBy ?? null,
        },
    });
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
async function revoke(userId, revokedBy, reason) {
    const current = await getPremiumStatus(userId);
    if (!current.isActive)
        return false;
    await clearPremium(userId);
    await logPremiumTransaction(userId, "premium_revoke", {
        revokedTier: current.tier,
        revokedBy,
        reason: reason ?? null,
    });
    return true;
}
async function clearPremium(userId) {
    await userWallet_model_1.default.updateOne({ userId }, {
        $set: {
            premiumTier: null,
            premiumUntil: null,
            premiumSource: null,
            premiumGrantedBy: null,
        },
    });
    await cacheClear(userId);
}
exports.default = { getPremiumStatus, getTier, getConfig, activate, revoke };
