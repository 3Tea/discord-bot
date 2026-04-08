import { model, Schema, Document, Types } from "mongoose";

export interface IConfessionVote extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    userId: string;
    vote: "up" | "down";
}

const confessionVoteSchema = new Schema(
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
