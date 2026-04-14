import { Document, model, Schema } from "mongoose";

export interface IQuestProgress {
    questId: string;
    progress: number;
    target: number;
    completed: boolean;
    rewardPaid: boolean;
}

export interface IUserQuest extends Document {
    userId: string;
    date: string;
    quests: IQuestProgress[];
    claimed: boolean;
    questStreak: number;
    lastQuestDate: string | null;
}

const questProgressSchema = new Schema(
    {
        questId: { type: String, required: true },
        progress: { type: Number, default: 0 },
        target: { type: Number, required: true },
        completed: { type: Boolean, default: false },
        rewardPaid: { type: Boolean, default: false },
    },
    { _id: false }
);

const userQuestSchema = new Schema(
    {
        userId: { type: String, required: true },
        date: { type: String, required: true },
        quests: { type: [questProgressSchema], default: [] },
        claimed: { type: Boolean, default: false },
        questStreak: { type: Number, default: 0 },
        lastQuestDate: { type: String, default: null },
    },
    { timestamps: true, collection: "UserQuests" }
);

userQuestSchema.index({ userId: 1, date: 1 }, { unique: true });

export default model<IUserQuest>("UserQuest", userQuestSchema);
