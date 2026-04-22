import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IBranchGuild {
    guildId: string;
    name: string;
    questChannelId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export type BranchGuildDoc = HydratedDocument<IBranchGuild>;

const branchGuildSchema = new Schema<IBranchGuild>(
    {
        guildId: { type: String, required: true },
        name: { type: String, required: true },
        questChannelId: { type: String, default: null },
    },
    { timestamps: true, collection: "BranchGuilds" }
);

branchGuildSchema.index({ guildId: 1 }, { unique: true });

const BranchGuildModel = model<IBranchGuild>("BranchGuild", branchGuildSchema);
export default BranchGuildModel;
