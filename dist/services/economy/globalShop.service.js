"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BUY_QUANTITY = exports.IDEMPOTENCY_SECONDS = exports.BUY_COOLDOWN_SECONDS = exports.INVENTORY_PAGE_SIZE = exports.SHOP_PAGE_SIZE = void 0;
const globalInventory_model_1 = __importDefault(require("../../models/globalInventory.model"));
const globalShopItem_model_1 = __importDefault(require("../../models/globalShopItem.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const wallet_service_1 = __importDefault(require("./wallet.service"));
exports.SHOP_PAGE_SIZE = 8;
exports.INVENTORY_PAGE_SIZE = 10;
exports.BUY_COOLDOWN_SECONDS = 3;
exports.IDEMPOTENCY_SECONDS = 60;
exports.MAX_BUY_QUANTITY = 10;
const REDIS_IDEMPOTENCY_PREFIX = "global_shop:idem:";
const REDIS_COOLDOWN_PREFIX = "global_shop:cd:";
/**
 * Paginated enabled global shop items, optionally filtered by type.
 */
async function getItems(page, type) {
    const filter = { enabled: true };
    if (type !== undefined) {
        filter.type = type;
    }
    const total = await globalShopItem_model_1.default.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / exports.SHOP_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const items = await globalShopItem_model_1.default.find(filter)
        .sort({ priceStar: 1 })
        .skip((safePage - 1) * exports.SHOP_PAGE_SIZE)
        .limit(exports.SHOP_PAGE_SIZE);
    return { items, totalPages, safePage };
}
/**
 * Refund stars after a successful deduct when a later step fails (inventory, etc.).
 */
async function refundAfterFailedPurchase(userId, starSpent, itemId, quantity, requestId) {
    await wallet_service_1.default.addStar(userId, starSpent, "global_refund", {
        itemId,
        quantity,
        requestId,
        reason: "rollback",
    });
}
/**
 * Validate the shop item exists, is enabled, and has enough stock.
 * Cleans up idempotency/cooldown keys and throws on any validation failure.
 */
async function validateItem(itemId, quantity, idemKey, cdKey) {
    const item = await globalShopItem_model_1.default.findOne({ itemId });
    if (!item || !item.enabled || (item.stock !== null && item.stock < quantity)) {
        await redis_1.default.deleteKey(idemKey);
        await redis_1.default.deleteKey(cdKey);
        const reason = !item ? "ITEM_NOT_FOUND" : !item.enabled ? "ITEM_DISABLED" : "OUT_OF_STOCK";
        throw new Error(reason);
    }
    return item;
}
/**
 * Purchase a global shop item: idempotency (requestId), per-user cooldown, atomic stock,
 * wallet deduct, then inventory upsert. Throws exact error messages listed in the service spec.
 */
async function buyItem(userId, itemId, quantity, requestId) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > exports.MAX_BUY_QUANTITY) {
        throw new Error("INVALID_QUANTITY");
    }
    const cdKey = `${REDIS_COOLDOWN_PREFIX}${userId}`;
    const cooldownTtl = await redis_1.default.ttlKey(cdKey);
    if (cooldownTtl > 0) {
        throw new Error("BUY_COOLDOWN");
    }
    // Atomic idempotency check-and-set (prevents TOCTOU race)
    const idemKey = `${REDIS_IDEMPOTENCY_PREFIX}${userId}:${requestId}`;
    const idemSet = await redis_1.default.setKeyNX(idemKey, "1", exports.IDEMPOTENCY_SECONDS);
    if (!idemSet) {
        throw new Error("DUPLICATE_PURCHASE");
    }
    // Set cooldown early to prevent concurrent rapid requests
    await redis_1.default.setKey(cdKey, "1", exports.BUY_COOLDOWN_SECONDS);
    // Validate item — cleans up keys and throws on failure
    const item = await validateItem(itemId, quantity, idemKey, cdKey);
    const starSpent = item.priceStar * quantity;
    // Step 1: Decrement stock atomically first to avoid refund noise on race
    let itemForResult = item;
    let stockDecremented = false;
    if (item.stock !== null) {
        const updated = await globalShopItem_model_1.default.findOneAndUpdate({ itemId, enabled: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
        if (!updated) {
            await redis_1.default.deleteKey(idemKey);
            await redis_1.default.deleteKey(cdKey);
            throw new Error("OUT_OF_STOCK");
        }
        stockDecremented = true;
        itemForResult = updated;
    }
    // Step 2: Deduct stars (rollback stock on failure)
    try {
        await wallet_service_1.default.deductStar(userId, starSpent, "global_spend", {
            itemId,
            quantity,
            priceStar: item.priceStar,
            requestId,
            effectStatus: "applied",
        });
    }
    catch (deductError) {
        if (stockDecremented) {
            await globalShopItem_model_1.default.updateOne({ itemId }, { $inc: { stock: quantity } });
        }
        throw deductError;
    }
    // Step 3: Upsert inventory (rollback stars + stock on failure)
    let inv;
    try {
        const doc = await globalInventory_model_1.default.findOneAndUpdate({ userId, itemId }, {
            $inc: { quantity },
            $set: { lastObtainedAt: new Date() },
            $setOnInsert: {
                userId,
                itemId,
                activatedAt: null,
                expiresAt: null,
                metadata: {},
            },
        }, { upsert: true, new: true });
        if (!doc) {
            throw new Error("INVENTORY_UPSERT_FAILED");
        }
        inv = doc;
    }
    catch (inventoryError) {
        if (stockDecremented) {
            await globalShopItem_model_1.default.updateOne({ itemId }, { $inc: { stock: quantity } });
        }
        await refundAfterFailedPurchase(userId, starSpent, itemId, quantity, requestId);
        throw inventoryError;
    }
    return {
        item: itemForResult,
        quantity,
        starSpent,
        inventoryQuantity: inv.quantity,
    };
}
/**
 * Paginated global inventory rows for a user (sorted by last obtained, newest first).
 */
async function getInventory(userId, page) {
    const total = await globalInventory_model_1.default.countDocuments({ userId });
    const totalPages = Math.max(1, Math.ceil(total / exports.INVENTORY_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const items = await globalInventory_model_1.default.find({ userId })
        .sort({ lastObtainedAt: -1, itemId: 1 })
        .skip((safePage - 1) * exports.INVENTORY_PAGE_SIZE)
        .limit(exports.INVENTORY_PAGE_SIZE);
    return { items, totalPages, safePage };
}
/**
 * Aggregate counts across all inventory rows for the user.
 */
async function getInventorySummary(userId) {
    const [row] = await globalInventory_model_1.default.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: null,
                distinctItems: {
                    $sum: {
                        $cond: [{ $gt: ["$quantity", 0] }, 1, 0],
                    },
                },
                totalQuantity: { $sum: "$quantity" },
                lastObtainedAt: { $max: "$lastObtainedAt" },
            },
        },
    ]);
    if (!row) {
        return { distinctItems: 0, totalQuantity: 0, lastObtainedAt: null };
    }
    return {
        distinctItems: row.distinctItems,
        totalQuantity: row.totalQuantity,
        lastObtainedAt: row.lastObtainedAt ?? null,
    };
}
const GlobalShopService = {
    getItems,
    buyItem,
    getInventory,
    getInventorySummary,
};
exports.default = GlobalShopService;
