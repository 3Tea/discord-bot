import { model, Schema, Document } from "mongoose";

export type ConfessionStatus = "pending" | "published" | "rejected";

export interface IConfessionImage {
    url: string;
    name: string | null;
    contentType: string | null;
}

export interface IConfession extends Document {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    isVip: boolean;
    status: ConfessionStatus;
    reviewMessageId: string | null;
    publicMessageId: string | null;
    resolvedAt: Date | null;
}

const confessionSchema = new Schema(
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
        isVip: { type: Boolean, default: false },
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
