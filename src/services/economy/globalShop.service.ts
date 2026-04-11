import GlobalInventoryModel, { IGlobalInventory } from "../../models/globalInventory.model";
import GlobalShopItemModel, {
    type GlobalShopItemType,
    type IGlobalShopItem,
} from "../../models/globalShopItem.model";
import redis from "../../connector/redis";
import WalletService from "./wallet.service";

export const SHOP_PAGE_SIZE = 8;
export const INVENTORY_PAGE_SIZE = 10;
export const BUY_COOLDOWN_SECONDS = 3;
export const IDEMPOTENCY_SECONDS = 60;
export const MAX_BUY_QUANTITY = 10;

const REDIS_IDEMPOTENCY_PREFIX = "global_shop:idem:";
const REDIS_COOLDOWN_PREFIX = "global_shop:cd:";

export interface GlobalShopListResult {
    items: IGlobalShopItem[];
    totalPages: number;
    safePage: number;
}

export interface GlobalShopPurchaseResult {
    item: IGlobalShopItem;
    quantity: number;
    starSpent: number;
    inventoryQuantity: number;
}

export interface GlobalInventoryListResult {
    items: IGlobalInventory[];
    totalPages: number;
    safePage: number;
}

export interface GlobalInventorySummary {
    distinctItems: number;
    totalQuantity: number;
    lastObtainedAt: Date | null;
}

/**
 * Paginated enabled global shop items, optionally filtered by type.
 */
async function getItems(page: number, type?: GlobalShopItemType): Promise<GlobalShopListResult> {
    const filter: Record<string, unknown> = { enabled: true };
    if (type !== undefined) {
        filter.type = type;
    }

    const total = await GlobalShopItemModel.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const items = await GlobalShopItemModel.find(filter)
        .sort({ priceStar: 1 })
        .skip((safePage - 1) * SHOP_PAGE_SIZE)
        .limit(SHOP_PAGE_SIZE);

    return { items, totalPages, safePage };
}

/**
 * Refund stars after a successful deduct when a later step fails (inventory, etc.).
 */
async function refundAfterFailedPurchase(
    userId: string,
    starSpent: number,
    itemId: string,
    quantity: number,
    requestId: string
): Promise<void> {
    await WalletService.addStar(userId, starSpent, "global_refund", {
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
async function validateItem(
    itemId: string,
    quantity: number,
    idemKey: string,
    cdKey: string
): Promise<IGlobalShopItem> {
    const item = await GlobalShopItemModel.findOne({ itemId });
    if (!item || !item.enabled || (item.stock !== null && item.stock < quantity)) {
        await redis.deleteKey(idemKey);
        await redis.deleteKey(cdKey);
        const reason = !item ? "ITEM_NOT_FOUND" : !item.enabled ? "ITEM_DISABLED" : "OUT_OF_STOCK";
        throw new Error(reason);
    }
    return item;
}

/**
 * Purchase a global shop item: idempotency (requestId), per-user cooldown, atomic stock,
 * wallet deduct, then inventory upsert. Throws exact error messages listed in the service spec.
 */
async function buyItem(
    userId: string,
    itemId: string,
    quantity: number,
    requestId: string
): Promise<GlobalShopPurchaseResult> {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BUY_QUANTITY) {
        throw new Error("INVALID_QUANTITY");
    }

    const cdKey = `${REDIS_COOLDOWN_PREFIX}${userId}`;
    const cooldownTtl = await redis.ttlKey(cdKey);
    if (cooldownTtl > 0) {
        throw new Error("BUY_COOLDOWN");
    }

    // Atomic idempotency check-and-set (prevents TOCTOU race)
    const idemKey = `${REDIS_IDEMPOTENCY_PREFIX}${userId}:${requestId}`;
    const idemSet = await redis.setKeyNX(idemKey, "1", IDEMPOTENCY_SECONDS);
    if (!idemSet) {
        throw new Error("DUPLICATE_PURCHASE");
    }

    // Set cooldown early to prevent concurrent rapid requests
    await redis.setKey(cdKey, "1", BUY_COOLDOWN_SECONDS);

    // Validate item — cleans up keys and throws on failure
    const item = await validateItem(itemId, quantity, idemKey, cdKey);

    const starSpent = item.priceStar * quantity;

    // Step 1: Decrement stock atomically first to avoid refund noise on race
    let itemForResult: IGlobalShopItem = item;
    let stockDecremented = false;

    if (item.stock !== null) {
        const updated = await GlobalShopItemModel.findOneAndUpdate(
            { itemId, enabled: true, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true }
        );
        if (!updated) {
            throw new Error("OUT_OF_STOCK");
        }
        stockDecremented = true;
        itemForResult = updated;
    }

    // Step 2: Deduct stars (rollback stock on failure)
    try {
        await WalletService.deductStar(userId, starSpent, "global_spend", {
            itemId,
            quantity,
            priceStar: item.priceStar,
            requestId,
            effectStatus: "applied",
        });
    } catch (deductError) {
        if (stockDecremented) {
            await GlobalShopItemModel.updateOne({ itemId }, { $inc: { stock: quantity } });
        }
        throw deductError;
    }

    // Step 3: Upsert inventory (rollback stars + stock on failure)
    let inv: IGlobalInventory;
    try {
        const doc = await GlobalInventoryModel.findOneAndUpdate(
            { userId, itemId },
            {
                $inc: { quantity },
                $set: { lastObtainedAt: new Date() },
                $setOnInsert: {
                    userId,
                    itemId,
                    activatedAt: null,
                    expiresAt: null,
                    metadata: {},
                },
            },
            { upsert: true, new: true }
        );
        if (!doc) {
            throw new Error("INVENTORY_UPSERT_FAILED");
        }
        inv = doc;
    } catch (inventoryError) {
        if (stockDecremented) {
            await GlobalShopItemModel.updateOne({ itemId }, { $inc: { stock: quantity } });
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
async function getInventory(userId: string, page: number): Promise<GlobalInventoryListResult> {
    const total = await GlobalInventoryModel.countDocuments({ userId });
    const totalPages = Math.max(1, Math.ceil(total / INVENTORY_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const items = await GlobalInventoryModel.find({ userId })
        .sort({ lastObtainedAt: -1, itemId: 1 })
        .skip((safePage - 1) * INVENTORY_PAGE_SIZE)
        .limit(INVENTORY_PAGE_SIZE);

    return { items, totalPages, safePage };
}

/**
 * Aggregate counts across all inventory rows for the user.
 */
async function getInventorySummary(userId: string): Promise<GlobalInventorySummary> {
    const [row] = await GlobalInventoryModel.aggregate<{
        distinctItems: number;
        totalQuantity: number;
        lastObtainedAt: Date | null;
    }>([
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

export default GlobalShopService;
