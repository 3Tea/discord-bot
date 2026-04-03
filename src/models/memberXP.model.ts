import { model, Schema, Document } from "mongoose";

export interface IMemberXP extends Document {
    guildId: string;
    userId: string;
    xp: number;
    level: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    lastMessageAt: Date | null;
    lastMessageHash: string;
}

const memberXPSchema = new Schema(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
        lastMessageAt: { type: Date, default: null },
        lastMessageHash: { type: String, default: "" },
    },
    {
        timestamps: true,
        collection: "MemberXPs",
    }
);

memberXPSchema.index({ guildId: 1, userId: 1 }, { unique: true });
memberXPSchema.index({ guildId: 1, xp: -1 });

const MemberXPModel = model<IMemberXP>("MemberXP", memberXPSchema);

export default MemberXPModel;
