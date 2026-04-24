"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const shopItemSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: "ShopItems",
});
shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, enabled: 1 });
const ShopItemModel = (0, mongoose_1.model)("ShopItem", shopItemSchema);
exports.default = ShopItemModel;
