"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const globalShopItemSchema = new mongoose_1.Schema({
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["cosmetic_identity", "utility_token"], required: true },
    priceStar: { type: Number, required: true },
    stock: { type: Number, default: null },
    enabled: { type: Boolean, default: true },
    // Arbitrary JSON-shaped config for item effects (cosmetic IDs, token params, etc.).
    effectConfig: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 1 },
}, {
    timestamps: true,
    collection: "GlobalShopItems",
});
globalShopItemSchema.index({ itemId: 1 }, { unique: true });
globalShopItemSchema.index({ enabled: 1, type: 1, priceStar: 1 });
const GlobalShopItemModel = (0, mongoose_1.model)("GlobalShopItem", globalShopItemSchema);
exports.default = GlobalShopItemModel;
