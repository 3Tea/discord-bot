import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export type ConfessionStatus = "pending" | "published" | "rejected";

export interface IConfessionImage {
    url: string;
    name: string | null;
    contentType: string | null;
}

export interface IConfessionAudio {
    url: string;
    name: string | null;
    contentType: string | null;
}

export interface IConfession {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    audio: IConfessionAudio | null;
    isVip: boolean;
    upvotes: number;
    downvotes: number;
    threadId: string | null;
    replyCount: number;
    tag: string | null;
    status: ConfessionStatus;
    reviewMessageId: string | null;
    publicMessageId: string | null;
    resolvedAt: Date | null;
}
export type ConfessionDoc = HydratedDocument<IConfession>;

const confessionSchema = new Schema<IConfession>(
    {
        guildId: { type: String, required: true, index: true },
        number: { type: Number, required: true },
        authorId: { type: String, required: true },
        content: { type: String, required: true },
        image: {
            type: {
                url: { type: String, required: true },
                name: { type: String, default: null },
                contentType: { type: String, default: null },
            },
            default: null,
        },
        audio: {
            type: {
                url: { type: String, required: true },
                name: { type: String, default: null },
                contentType: { type: String, default: null },
            },
            default: null,
        },
        isVip: { type: Boolean, default: false },
        upvotes: { type: Number, default: 0 },
        downvotes: { type: Number, default: 0 },
        threadId: { type: String, default: null },
        replyCount: { type: Number, default: 0 },
        tag: { type: String, default: null },
        status: {
            type: String,
            enum: ["pending", "published", "rejected"],
            required: true,
            index: true,
        },
        reviewMessageId: { type: String, default: null },
        publicMessageId: { type: String, default: null },
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: "Confessions" }
);

confessionSchema.index({ guildId: 1, number: 1 }, { unique: true });
confessionSchema.index({ guildId: 1, status: 1 });

export default model<IConfession>("Confession", confessionSchema);
