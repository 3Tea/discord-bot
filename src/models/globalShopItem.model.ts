import { model, Schema, Document } from "mongoose";

export type GlobalShopItemType = "cosmetic_identity" | "utility_token";

export interface IGlobalShopItem extends Document {
    itemId: string;
    name: string;
    description: string;
    type: GlobalShopItemType;
    priceStar: number;
    stock: number | null;
    enabled: boolean;
    effectConfig: Record<string, unknown>;
    version: number;
}

const globalShopItemSchema = new Schema(
    {
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        type: { type: String, enum: ["cosmetic_identity", "utility_token"], required: true },
        priceStar: { type: Number, required: true },
        stock: { type: Number, default: null },
        enabled: { type: Boolean, default: true },
        // Arbitrary JSON-shaped config for item effects (cosmetic IDs, token params, etc.).
        effectConfig: { type: Schema.Types.Mixed, default: {} },
        version: { type: Number, default: 1 },
    },
    {
        timestamps: true,
        collection: "GlobalShopItems",
    }
);

globalShopItemSchema.index({ itemId: 1 }, { unique: true });
globalShopItemSchema.index({ enabled: 1, type: 1, priceStar: 1 });

const GlobalShopItemModel = model<IGlobalShopItem>("GlobalShopItem", globalShopItemSchema);

export default GlobalShopItemModel;
