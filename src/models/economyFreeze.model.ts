import { model, Schema, Document } from "mongoose";

export interface IEconomyFreeze extends Document {
    userId: string;
    guildId: string;
    frozenBy: string;
    reason: string;
    createdAt: Date;
}

const economyFreezeSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        frozenBy: { type: String, required: true },
        reason: { type: String, default: "" },
    },
    {
        timestamps: true,
        collection: "EconomyFreezes",
    }
);

economyFreezeSchema.index({ userId: 1, guildId: 1 }, { unique: true });

const EconomyFreezeModel = model<IEconomyFreeze>("EconomyFreeze", economyFreezeSchema);

export default EconomyFreezeModel;
