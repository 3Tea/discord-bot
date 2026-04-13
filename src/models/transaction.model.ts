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
    | "confession_reply"
    | "level_up"
    | "voice_reward"
    | "gambling"
    | "work"
    | "fish"
    | "gift"
    | "rob"
    | "rob_penalty"
    | "global_daily"
    | "global_streak_bonus"
    | "global_milestone"
    | "global_spend"
    | "global_refund"
    | "command_charge"
    | "command_refund"
    | "star_drop"
    | "mine"
    | "dungeon"
    | "premium_activate"
    | "premium_expire"
    | "premium_revoke"
    | "premium_upgrade"
    | "premium_downgrade"
    | "premium_extend";

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
                "level_up",
                "voice_reward",
                "gambling",
                "work",
                "fish",
                "gift",
                "rob",
                "rob_penalty",
                "global_daily",
                "global_streak_bonus",
                "global_milestone",
                "global_spend",
                "global_refund",
                "command_charge",
                "command_refund",
                "star_drop",
                "mine",
                "dungeon",
                "premium_activate",
                "premium_expire",
                "premium_revoke",
                "premium_upgrade",
                "premium_downgrade",
                "premium_extend",
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
