import { model, Schema, Document } from "mongoose";

export interface IGlobalInventory extends Document {
    userId: string;
    itemId: string;
    quantity: number;
    activatedAt: Date | null;
    expiresAt: Date | null;
    metadata: Record<string, unknown>;
    lastObtainedAt: Date | null;
}

const globalInventorySchema = new Schema(
    {
        userId: { type: String, required: true },
        itemId: { type: String, required: true },
        quantity: { type: Number, default: 0 },
        activatedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        // Extra per-stack or per-user-item data (e.g. source, cosmetic variant).
        metadata: { type: Schema.Types.Mixed, default: {} },
        lastObtainedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "GlobalInventories",
    }
);

globalInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });
globalInventorySchema.index({ userId: 1, lastObtainedAt: -1 });

const GlobalInventoryModel = model<IGlobalInventory>("GlobalInventory", globalInventorySchema);

export default GlobalInventoryModel;
