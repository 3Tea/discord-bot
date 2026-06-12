"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPremiumExpiry = startPremiumExpiry;
const discord_js_1 = require("discord.js");
const userWallet_model_1 = __importDefault(require("../../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
const index_1 = __importDefault(require("../../connector/redis/index"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const audit_service_1 = require("../audit/audit.service");
const INTERVAL_MS = 10 * 60 * 1000;
const GLOBAL_GUILD_ID = "global";
async function expireStale() {
    const now = new Date();
    const expired = await userWallet_model_1.default.find({
        premiumTier: { $ne: null },
        premiumUntil: { $ne: null, $lt: now },
    }).lean();
    if (expired.length === 0)
        return;
    const userIds = expired.map((w) => w.userId);
    await userWallet_model_1.default.updateMany({ userId: { $in: userIds } }, {
        $set: {
            premiumTier: null,
            premiumUntil: null,
            premiumSource: null,
            premiumGrantedBy: null,
        },
    });
    const transactions = expired.map((w) => ({
        userId: w.userId,
        guildId: GLOBAL_GUILD_ID,
        type: "premium_expire",
        coinDelta: 0,
        gemDelta: 0,
        metadata: { expiredTier: w.premiumTier, expiredAt: w.premiumUntil },
    }));
    await transaction_model_1.default.insertMany(transactions);
    await Promise.all(userIds.map((id) => index_1.default.deleteKey(`premium:${id}`)));
    // Best-effort DM notification — failures do not affect the expiry process
    try {
        const client = (await Promise.resolve().then(() => __importStar(require("../../client")))).default;
        for (const wallet of expired) {
            try {
                const locale = await (0, locale_1.resolveUserLocale)(wallet.userId);
                const user = await client.users.fetch(wallet.userId);
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)(locale, "premium.expire.title"))
                    .setDescription((0, t_1.t)(locale, "premium.expire.notice", { tier: String(wallet.premiumTier).toUpperCase() }))
                    .setColor(0x95a5a6)
                    .setTimestamp();
                await user.send({ embeds: [embed] });
            }
            catch {
                // DM may fail if user has DMs closed — silently skip
            }
        }
    }
    catch {
        // Client not ready or import failed — skip DM notifications
    }
    logger_mixed_1.logger.info(`[premiumExpiry] Expired ${expired.length} premium subscription(s)`);
}
function startPremiumExpiry() {
    setTimeout(() => {
        expireStale().catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger_mixed_1.logger.error(`[premiumExpiry] ${err.message}`);
            audit_service_1.AuditService.logBackgroundError("premiumExpiry", err);
        });
    }, 10_000);
    setInterval(() => {
        expireStale().catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger_mixed_1.logger.error(`[premiumExpiry] ${err.message}`);
            audit_service_1.AuditService.logBackgroundError("premiumExpiry", err);
        });
    }, INTERVAL_MS);
}
