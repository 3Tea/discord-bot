import { model, Schema, Document } from "mongoose";

export interface IBranchGuild extends Document {
    guildId: string;
    name: string;
    questChannelId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const branchGuildSchema = new Schema(
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
