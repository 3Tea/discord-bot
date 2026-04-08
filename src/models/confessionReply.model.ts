import { model, Schema, Document, Types } from "mongoose";

export interface IConfessionReply extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    authorId: string;
    replyNumber: number;
    content: string;
    messageId: string;
}

const confessionReplySchema = new Schema(
    {
        confessionId: { type: Schema.Types.ObjectId, required: true, ref: "Confession" },
        guildId: { type: String, required: true },
        authorId: { type: String, required: true },
        replyNumber: { type: Number, required: true },
        content: { type: String, required: true },
        messageId: { type: String, required: true },
    },
    { timestamps: true, collection: "ConfessionReplies" }
);

confessionReplySchema.index({ confessionId: 1, replyNumber: 1 }, { unique: true });
confessionReplySchema.index({ confessionId: 1, authorId: 1 });

export default model<IConfessionReply>("ConfessionReply", confessionReplySchema);
