"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/character.model.ts
const mongoose_1 = require("mongoose");
const characterSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    class: {
        type: String,
        required: true,
        enum: ["swordsman", "tank", "mage", "archer", "assassin", "healer"],
    },
    advancedClass: { type: String, default: null },
    level: { type: Number, default: 1, min: 1 },
    exp: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 0, min: 0 },
    dungeonDepth: { type: Number, default: 1, min: 1 },
    dungeonCheckpoint: { type: Number, default: 1, min: 1 },
    bossKills: { type: Number, default: 0, min: 0 },
    monstersKilled: { type: Number, default: 0, min: 0 },
    goldEarned: { type: Number, default: 0, min: 0 },
    itemsCrafted: { type: Number, default: 0, min: 0 },
    equipment: {
        weapon: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
        shield: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
        helmet: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
        armor: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
        boots: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
        accessory: { type: mongoose_1.Schema.Types.ObjectId, ref: "Equipment", default: null },
    },
    materials: { type: Map, of: Number, default: new Map() },
    crates: {
        bronze: { type: Number, default: 0, min: 0 },
        silver: { type: Number, default: 0, min: 0 },
        gold: { type: Number, default: 0, min: 0 },
    },
}, {
    timestamps: true,
    collection: "Characters",
});
characterSchema.index({ userId: 1 }, { unique: true });
const CharacterModel = (0, mongoose_1.model)("Character", characterSchema);
exports.default = CharacterModel;
