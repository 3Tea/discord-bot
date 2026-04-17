"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shopItem_model_1 = __importDefault(require("../../models/shopItem.model"));
const currency_service_1 = __importDefault(require("./currency.service"));
const ITEMS_PER_PAGE = 5;
async function getItems(guildId, page) {
    const total = await shopItem_model_1.default.countDocuments({ guildId, enabled: true });
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const items = await shopItem_model_1.default.find({ guildId, enabled: true })
        .sort({ price: 1 })
        .skip((safePage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    return { items, totalPages };
}
async function buyItem(userId, guildId, itemId, guild) {
    const item = await shopItem_model_1.default.findOne({ guildId, itemId, enabled: true });
    if (!item) {
        throw new Error("ITEM_NOT_FOUND");
    }
    const coinCost = item.currencyType === "coin" ? item.price : 0;
    const gemCost = item.currencyType === "gem" ? item.price : 0;
    let stockDecremented = false;
    // Atomically decrement stock FIRST (if limited) to prevent overselling
    if (item.stock !== null) {
        const stockResult = await shopItem_model_1.default.findOneAndUpdate({ _id: item._id, stock: { $gte: 1 } }, { $inc: { stock: -1 } }, { new: true });
        if (!stockResult) {
            throw new Error("OUT_OF_STOCK");
        }
        stockDecremented = true;
    }
    // Deduct currency — rollback stock on failure
    try {
        await currency_service_1.default.deduct(userId, guildId, coinCost, gemCost, "purchase", { itemId });
    }
    catch (error) {
        if (stockDecremented) {
            await shopItem_model_1.default.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
        }
        throw error;
    }
    // Apply effect — rollback both currency AND stock on failure
    try {
        if (item.type === "role" && item.roleId) {
            const member = await guild.members.fetch(userId);
            if (member.roles.cache.has(item.roleId)) {
                // Rollback currency
                if (coinCost > 0)
                    await currency_service_1.default.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
                if (gemCost > 0)
                    await currency_service_1.default.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
                // Rollback stock
                if (stockDecremented) {
                    await shopItem_model_1.default.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
                }
                throw new Error("ALREADY_HAS_ROLE");
            }
            await member.roles.add(item.roleId);
        }
        // "cosmetic" and "currency_exchange" — no additional effect in phase 1
    }
    catch (error) {
        if (error instanceof Error && error.message === "ALREADY_HAS_ROLE") {
            throw error;
        }
        // Rollback currency
        if (coinCost > 0)
            await currency_service_1.default.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
        if (gemCost > 0)
            await currency_service_1.default.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
        // Rollback stock
        if (stockDecremented) {
            await shopItem_model_1.default.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
        }
        throw new Error("EFFECT_FAILED");
    }
    return { item, coinSpent: coinCost, gemSpent: gemCost };
}
async function addItem(guildId, data) {
    const existing = await shopItem_model_1.default.findOne({ guildId, itemId: data.itemId });
    if (existing) {
        throw new Error("ITEM_ALREADY_EXISTS");
    }
    return shopItem_model_1.default.create({ guildId, ...data });
}
async function removeItem(guildId, itemId) {
    const result = await shopItem_model_1.default.updateOne({ guildId, itemId }, { $set: { enabled: false } });
    if (result.matchedCount === 0) {
        throw new Error("ITEM_NOT_FOUND");
    }
}
const ShopService = { getItems, buyItem, addItem, removeItem };
exports.default = ShopService;
