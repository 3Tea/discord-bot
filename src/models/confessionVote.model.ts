import { model, Schema, Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IConfessionVote {
    confessionId: Types.ObjectId;
    guildId: string;
    userId: string;
    vote: "up" | "down";
}
export type ConfessionVoteDoc = HydratedDocument<IConfessionVote>;

const confessionVoteSchema = new Schema<IConfessionVote>(
    {
        confessionId: { type: Schema.Types.ObjectId, required: true, ref: "Confession" },
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        vote: { type: String, enum: ["up", "down"], required: true },
    },
    { timestamps: true, collection: "ConfessionVotes" }
);

confessionVoteSchema.index({ confessionId: 1, userId: 1 }, { unique: true });

export default model<IConfessionVote>("ConfessionVote", confessionVoteSchema);
