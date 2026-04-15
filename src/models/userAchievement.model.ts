import { model, Schema, Document } from "mongoose";

export interface IUserAchievement extends Document {
    userId: string;
    guildId: string;
    achievementId: string;
    unlockedAt: Date;
    rewardPaid: boolean;
}

const userAchievementSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        achievementId: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
        rewardPaid: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "UserAchievements",
    }
);

userAchievementSchema.index({ userId: 1, guildId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, guildId: 1 });

const UserAchievementModel = model<IUserAchievement>("UserAchievement", userAchievementSchema);

export default UserAchievementModel;
