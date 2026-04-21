import { model, Schema, Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IConfessionReply {
    confessionId: Types.ObjectId;
    guildId: string;
    authorId: string;
    replyNumber: number;
    content: string;
    messageId: string;
}
export type ConfessionReplyDoc = HydratedDocument<IConfessionReply>;

const confessionReplySchema = new Schema<IConfessionReply>(
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
