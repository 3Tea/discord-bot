import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IEconomyFreeze {
    userId: string;
    guildId: string;
    frozenBy: string;
    reason: string;
    createdAt: Date;
}
export type EconomyFreezeDoc = HydratedDocument<IEconomyFreeze>;

const economyFreezeSchema = new Schema<IEconomyFreeze>(
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
