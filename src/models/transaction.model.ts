import { model, Schema, Document } from "mongoose";

export type TransactionType =
    | "pray"
    | "curse"
    | "purchase"
    | "exchange"
    | "streak_bonus"
    | "admin"
    | "confession_vip"
    | "confession_skip_cd"
    | "confession_refund"
    | "confession_reply";

export interface ITransaction extends Document {
    userId: string;
    guildId: string;
    type: TransactionType;
    coinDelta: number;
    gemDelta: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

const transactionSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        type: {
            type: String,
            enum: [
                "pray",
                "curse",
                "purchase",
                "exchange",
                "streak_bonus",
                "admin",
                "confession_vip",
                "confession_skip_cd",
                "confession_refund",
                "confession_reply",
            ],
            required: true,
        },
        coinDelta: { type: Number, default: 0 },
        gemDelta: { type: Number, default: 0 },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: true,
        collection: "Transactions",
    }
);

transactionSchema.index({ userId: 1, guildId: 1, createdAt: -1 });

const TransactionModel = model<ITransaction>("Transaction", transactionSchema);

export default TransactionModel;
