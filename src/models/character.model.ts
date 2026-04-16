// src/models/character.model.ts
import { model, Schema, Document, Types } from "mongoose";
import type { ClassType } from "../services/rpg/rpg.config";

export interface ICharacter extends Document {
    userId: string;
    class: ClassType;
    level: number;
    exp: number;
    gold: number;
    dungeonDepth: number;
    dungeonCheckpoint: number;
    equipment: {
        weapon: Types.ObjectId | null;
        shield: Types.ObjectId | null;
        helmet: Types.ObjectId | null;
        armor: Types.ObjectId | null;
        boots: Types.ObjectId | null;
        accessory: Types.ObjectId | null;
    };
    materials: Map<string, number>;
    crates: {
        bronze: number;
        silver: number;
        gold: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const characterSchema = new Schema(
    {
        userId: { type: String, required: true },
        class: {
            type: String,
            required: true,
            enum: ["swordsman", "tank", "mage", "archer", "assassin", "healer"],
        },
        level: { type: Number, default: 1, min: 1 },
        exp: { type: Number, default: 0, min: 0 },
        gold: { type: Number, default: 0, min: 0 },
        dungeonDepth: { type: Number, default: 1, min: 1 },
        dungeonCheckpoint: { type: Number, default: 1, min: 1 },
        equipment: {
            weapon: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            shield: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            helmet: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            armor: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            boots: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            accessory: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
        },
        materials: { type: Map, of: Number, default: new Map() },
        crates: {
            bronze: { type: Number, default: 0, min: 0 },
            silver: { type: Number, default: 0, min: 0 },
            gold: { type: Number, default: 0, min: 0 },
        },
    },
    {
        timestamps: true,
        collection: "Characters",
    }
);

characterSchema.index({ userId: 1 }, { unique: true });

const CharacterModel = model<ICharacter>("Character", characterSchema);

export default CharacterModel;
