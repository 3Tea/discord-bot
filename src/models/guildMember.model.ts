// src/models/guildMember.model.ts
import { model, Schema, Document } from "mongoose";
import type { AdventurerRank } from "../services/rpg/guild.config";

export interface IGuildMember extends Document {
    userId: string;
    rank: AdventurerRank;
    gp: number;
    questsCompleted: number;
    activeQuests: string[];
    lastBoardDate: string;
    lastPersonalDate: string;
    createdAt: Date;
    updatedAt: Date;
}

const guildMemberSchema = new Schema(
    {
        userId: { type: String, required: true },
        rank: { type: String, default: "f", enum: ["f", "e", "d", "c", "b", "a", "s", "ss", "sss", "legendary"] },
        gp: { type: Number, default: 0, min: 0 },
        questsCompleted: { type: Number, default: 0, min: 0 },
        activeQuests: [{ type: String }],
        lastBoardDate: { type: String, default: "" },
        lastPersonalDate: { type: String, default: "" },
    },
    { timestamps: true, collection: "GuildMembers" }
);

guildMemberSchema.index({ userId: 1 }, { unique: true });

const GuildMemberModel = model<IGuildMember>("GuildMember", guildMemberSchema);
export default GuildMemberModel;
