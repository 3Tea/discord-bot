"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const transaction_model_1 = __importDefault(require("../../models/transaction.model"));
class InsufficientFundsError extends Error {
    constructor(currency, required, available) {
        super(`Insufficient ${currency}: need ${required}, have ${available}`);
        this.name = "InsufficientFundsError";
    }
}
async function logTransaction(userId, guildId, type, coinDelta, gemDelta, metadata = {}) {
    await transaction_model_1.default.create({ userId, guildId, type, coinDelta, gemDelta, metadata });
}
async function getOrCreate(userId, guildId) {
    const doc = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, { $setOnInsert: { userId, guildId } }, { upsert: true, new: true });
    return doc;
}
async function getBalance(userId, guildId) {
    const eco = await getOrCreate(userId, guildId);
    return {
        coin: eco.coin,
        gem: eco.gem,
        prayStreak: eco.prayStreak,
        lastPray: eco.lastPray,
        lastCurse: eco.lastCurse,
    };
}
async function addCoin(userId, guildId, amount, reason, metadata = {}) {
    const updated = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, {
        $inc: { coin: amount },
        $setOnInsert: { userId, guildId },
    }, { upsert: true, new: true });
    await logTransaction(userId, guildId, reason, amount, 0, metadata);
    return updated;
}
async function addGem(userId, guildId, amount, reason, metadata = {}) {
    const updated = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, {
        $inc: { gem: amount },
        $setOnInsert: { userId, guildId },
    }, { upsert: true, new: true });
    await logTransaction(userId, guildId, reason, 0, amount, metadata);
    return updated;
}
async function deduct(userId, guildId, coinAmount, gemAmount, reason, metadata = {}) {
    // Ensure the record exists first
    await getOrCreate(userId, guildId);
    // Atomic check + update: only deducts if balance is sufficient
    const filter = { userId, guildId };
    if (coinAmount > 0)
        filter.coin = { $gte: coinAmount };
    if (gemAmount > 0)
        filter.gem = { $gte: gemAmount };
    const updated = await userEconomy_model_1.default.findOneAndUpdate(filter, { $inc: { coin: -coinAmount, gem: -gemAmount } }, { new: true });
    if (!updated) {
        // Re-read to provide accurate error message
        const eco = await userEconomy_model_1.default.findOne({ userId, guildId });
        if (coinAmount > 0 && (eco?.coin ?? 0) < coinAmount) {
            throw new InsufficientFundsError("coin", coinAmount, eco?.coin ?? 0);
        }
        throw new InsufficientFundsError("gem", gemAmount, eco?.gem ?? 0);
    }
    await logTransaction(userId, guildId, reason, -coinAmount, -gemAmount, metadata);
    return updated;
}
async function setCoin(userId, guildId, amount) {
    const eco = await getOrCreate(userId, guildId);
    const delta = amount - eco.coin;
    const updated = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, { $set: { coin: amount } }, { new: true });
    await logTransaction(userId, guildId, "admin", delta, 0, { action: "set-coin" });
    return updated;
}
async function setGem(userId, guildId, amount) {
    const eco = await getOrCreate(userId, guildId);
    const delta = amount - eco.gem;
    const updated = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, { $set: { gem: amount } }, { new: true });
    await logTransaction(userId, guildId, "admin", 0, delta, { action: "set-gem" });
    return updated;
}
async function exchange(userId, guildId, gemAmount, ratePerGem) {
    const coinCost = gemAmount * ratePerGem;
    await deduct(userId, guildId, coinCost, 0, "exchange", { gemAmount, ratePerGem });
    try {
        return await addGem(userId, guildId, gemAmount, "exchange", { coinCost, ratePerGem });
    }
    catch (error) {
        await addCoin(userId, guildId, coinCost, "exchange", { gemAmount, ratePerGem, refund: true });
        throw error;
    }
}
const CurrencyService = {
    getBalance,
    addCoin,
    addGem,
    deduct,
    exchange,
    setCoin,
    setGem,
    InsufficientFundsError,
};
exports.default = CurrencyService;
