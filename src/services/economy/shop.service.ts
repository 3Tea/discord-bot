import ShopItemModel, { IShopItem, ShopItemType, CurrencyType } from "../../models/shopItem.model";
import CurrencyService from "./currency.service";
import { Guild } from "discord.js";

export interface PurchaseResult {
    item: IShopItem;
    coinSpent: number;
    gemSpent: number;
}

interface AddItemInput {
    itemId: string;
    name: string;
    description: string;
    type: ShopItemType;
    price: number;
    currencyType: CurrencyType;
    roleId?: string;
    stock?: number | null;
}

const ITEMS_PER_PAGE = 5;

async function getItems(guildId: string, page: number): Promise<{ items: IShopItem[]; totalPages: number }> {
    const total = await ShopItemModel.countDocuments({ guildId, enabled: true });
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const items = await ShopItemModel.find({ guildId, enabled: true })
        .sort({ price: 1 })
        .skip((safePage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);

    return { items, totalPages };
}

async function buyItem(userId: string, guildId: string, itemId: string, guild: Guild): Promise<PurchaseResult> {
    const item = await ShopItemModel.findOne({ guildId, itemId, enabled: true });
    if (!item) {
        throw new Error("ITEM_NOT_FOUND");
    }

    if (item.stock !== null && item.stock <= 0) {
        throw new Error("OUT_OF_STOCK");
    }

    // Deduct currency
    const coinCost = item.currencyType === "coin" ? item.price : 0;
    const gemCost = item.currencyType === "gem" ? item.price : 0;

    await CurrencyService.deduct(userId, guildId, coinCost, gemCost, "purchase", { itemId });

    // Apply effect
    try {
        if (item.type === "role" && item.roleId) {
            const member = await guild.members.fetch(userId);
            if (member.roles.cache.has(item.roleId)) {
                // Rollback: refund the currency
                if (coinCost > 0)
                    await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
                if (gemCost > 0)
                    await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
                throw new Error("ALREADY_HAS_ROLE");
            }
            await member.roles.add(item.roleId);
        }
        // "cosmetic" and "currency_exchange" — no additional effect in phase 1
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_HAS_ROLE") {
            throw error;
        }
        // Rollback on unexpected failure
        if (coinCost > 0)
            await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
        if (gemCost > 0) await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
        throw new Error("EFFECT_FAILED");
    }

    // Decrement stock if not unlimited
    if (item.stock !== null) {
        await ShopItemModel.updateOne({ _id: item._id }, { $inc: { stock: -1 } });
    }

    return { item, coinSpent: coinCost, gemSpent: gemCost };
}

async function addItem(guildId: string, data: AddItemInput): Promise<IShopItem> {
    const existing = await ShopItemModel.findOne({ guildId, itemId: data.itemId });
    if (existing) {
        throw new Error("ITEM_ALREADY_EXISTS");
    }

    return ShopItemModel.create({ guildId, ...data });
}

async function removeItem(guildId: string, itemId: string): Promise<void> {
    const result = await ShopItemModel.updateOne({ guildId, itemId }, { $set: { enabled: false } });
    if (result.matchedCount === 0) {
        throw new Error("ITEM_NOT_FOUND");
    }
}

const ShopService = { getItems, buyItem, addItem, removeItem };

export default ShopService;
