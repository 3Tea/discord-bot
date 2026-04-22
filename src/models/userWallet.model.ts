import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export type PremiumTier = "star" | "galaxy";
export type PremiumSource = "auto" | "manual";

export interface IUserWallet {
    userId: string;
    star: number;
    lastDaily: Date | null;
    dailyStreak: number;
    lastStreakDate: Date | null;
    claimedMilestones: string[];
    premiumTier: PremiumTier | null;
    premiumUntil: Date | null;
    premiumSource: PremiumSource | null;
    premiumGrantedBy: string | null;
}
export type UserWalletDoc = HydratedDocument<IUserWallet>;

const userWalletSchema = new Schema<IUserWallet>(
    {
        userId: { type: String, required: true },
        star: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        dailyStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
        claimedMilestones: { type: [String], default: [] },
        premiumTier: { type: String, enum: ["star", "galaxy", null], default: null },
        premiumUntil: { type: Date, default: null },
        premiumSource: { type: String, enum: ["auto", "manual", null], default: null },
        premiumGrantedBy: { type: String, default: null },
    },
    { timestamps: true, collection: "UserWallets" }
);

userWalletSchema.index({ userId: 1 }, { unique: true });
userWalletSchema.index({ star: -1 });
userWalletSchema.index({ premiumTier: 1, premiumUntil: 1 });

export default model<IUserWallet>("UserWallet", userWalletSchema);
