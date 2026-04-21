import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export type ShopItemType = "role" | "cosmetic" | "currency_exchange";
export type CurrencyType = "coin" | "gem";

export interface IShopItem {
    guildId: string;
    itemId: string;
    name: string;
    description: string;
    type: ShopItemType;
    price: number;
    currencyType: CurrencyType;
    roleId?: string;
    stock: number | null;
    enabled: boolean;
}
export type ShopItemDoc = HydratedDocument<IShopItem>;

const shopItemSchema = new Schema<IShopItem>(
    {
        guildId: { type: String, required: true },
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        type: { type: String, enum: ["role", "cosmetic", "currency_exchange"], required: true },
        price: { type: Number, required: true },
        currencyType: { type: String, enum: ["coin", "gem"], required: true },
        roleId: { type: String },
        stock: { type: Number, default: null },
        enabled: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "ShopItems",
    }
);

shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, enabled: 1 });

const ShopItemModel = model<IShopItem>("ShopItem", shopItemSchema);

export default ShopItemModel;
