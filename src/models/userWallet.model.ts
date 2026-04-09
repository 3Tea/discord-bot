import { Document, model, Schema } from "mongoose";

export interface IUserWallet extends Document {
    userId: string;
    star: number;
    lastDaily: Date | null;
    dailyStreak: number;
    lastStreakDate: Date | null;
    claimedMilestones: string[];
}

const userWalletSchema = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        star: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        dailyStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
        claimedMilestones: { type: [String], default: [] },
    },
    { timestamps: true, collection: "UserWallets" }
);

userWalletSchema.index({ userId: 1 }, { unique: true });
userWalletSchema.index({ star: -1 });

export default model<IUserWallet>("UserWallet", userWalletSchema);
