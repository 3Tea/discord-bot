import { model, Schema, Document } from "mongoose";

export interface IUserEconomy extends Document {
    userId: string;
    guildId: string;
    coin: number;
    gem: number;
    lastPray: Date | null;
    lastCurse: Date | null;
    prayStreak: number;
    lastStreakDate: Date | null;
    mineDepth: number;
    mineCheckpoint: number;
}

const userEconomySchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        coin: { type: Number, default: 0 },
        gem: { type: Number, default: 0 },
        lastPray: { type: Date, default: null },
        lastCurse: { type: Date, default: null },
        prayStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
        mineDepth: { type: Number, default: 1 },
        mineCheckpoint: { type: Number, default: 1 },
    },
    {
        timestamps: true,
        collection: "UserEconomies",
    }
);

userEconomySchema.index({ userId: 1, guildId: 1 }, { unique: true });
userEconomySchema.index({ guildId: 1, coin: -1 });

const UserEconomyModel = model<IUserEconomy>("UserEconomy", userEconomySchema);

export default UserEconomyModel;
