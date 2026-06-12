"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const globalInventorySchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    itemId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    activatedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    // Extra per-stack or per-user-item data (e.g. source, cosmetic variant).
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    lastObtainedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: "GlobalInventories",
});
globalInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });
globalInventorySchema.index({ userId: 1, lastObtainedAt: -1 });
const GlobalInventoryModel = (0, mongoose_1.model)("GlobalInventory", globalInventorySchema);
exports.default = GlobalInventoryModel;
