"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/equipment.model.ts
const mongoose_1 = require("mongoose");
const equipmentSchema = new mongoose_1.Schema({
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    slot: {
        type: String,
        required: true,
        enum: ["weapon", "shield", "helmet", "armor", "boots", "accessory"],
    },
    type: { type: String, required: true },
    rarity: {
        type: String,
        required: true,
        enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
    },
    stats: {
        hp: { type: Number, default: 0 },
        str: { type: Number, default: 0 },
        def: { type: Number, default: 0 },
        mag: { type: Number, default: 0 },
        magDef: { type: Number, default: 0 },
        spd: { type: Number, default: 0 },
    },
    classRestriction: [{ type: String }],
    requiredLevel: { type: Number, default: 1, min: 1 },
    equipped: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "Equipment",
});
equipmentSchema.index({ ownerId: 1 });
equipmentSchema.index({ ownerId: 1, equipped: 1 });
const EquipmentModel = (0, mongoose_1.model)("Equipment", equipmentSchema);
exports.default = EquipmentModel;
