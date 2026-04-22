import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export type BlocklistType = "user" | "guild";

export interface IBlocklistEntry {
    type: BlocklistType;
    targetId: string;
    reason: string;
    blockedBy: string;
    blockedAt: Date;
    guildName?: string;
    leftAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type BlocklistEntryDoc = HydratedDocument<IBlocklistEntry>;

const blocklistEntrySchema = new Schema<IBlocklistEntry>(
    {
        type: { type: String, required: true, enum: ["user", "guild"] },
        targetId: { type: String, required: true },
        reason: { type: String, required: true, maxlength: 500 },
        blockedBy: { type: String, required: true },
        blockedAt: { type: Date, required: true, default: () => new Date() },
        guildName: { type: String },
        leftAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "Blocklist",
    }
);

blocklistEntrySchema.index({ type: 1, targetId: 1 }, { unique: true });

const BlocklistEntryModel = model<IBlocklistEntry>("BlocklistEntry", blocklistEntrySchema);

export default BlocklistEntryModel;
