"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryStarDrop = tryStarDrop;
const wallet_service_1 = __importDefault(require("../../services/economy/wallet.service"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const logger_mixed_1 = __importDefault(require("../log/logger.mixed"));
/**
 * Rolls for a star drop with premium multiplier.
 * @param userId - The user to potentially award
 * @param rate - Base drop probability (0.0 to 1.0)
 * @param source - Command name for transaction metadata
 * @returns true if a star was awarded
 */
async function tryStarDrop(userId, rate, source) {
    const config = await premium_service_1.default.getConfig(userId);
    const effectiveRate = Math.min(rate * config.starDropMultiplier, 1);
    if (Math.random() >= effectiveRate)
        return false;
    try {
        await wallet_service_1.default.addStar(userId, 1, "star_drop", { source });
        return true;
    }
    catch (error) {
        (0, logger_mixed_1.default)(`[star_drop] Failed for ${userId}: ${error instanceof Error ? error.message : "Unknown"}`, "error");
        return false;
    }
}
