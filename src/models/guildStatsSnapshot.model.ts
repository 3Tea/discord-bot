// src/models/guildStatsSnapshot.model.ts
import { model, Schema, Document } from "mongoose";
import type { Period } from "../util/xp/periodKey";

export interface IGuildStatsSnapshot extends Document {
    guildId: string;
    period: Period;
    periodKey: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    activeMembers: number;
}

const guildStatsSnapshotSchema = new Schema(
    {
        guildId: { type: String, required: true },
        period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
        periodKey: { type: String, required: true },
        xp: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: "GuildStatsSnapshots",
    }
);

guildStatsSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1 }, { unique: true });
guildStatsSnapshotSchema.index({ period: 1, periodKey: 1, xp: -1 });

const GuildStatsSnapshotModel = model<IGuildStatsSnapshot>("GuildStatsSnapshot", guildStatsSnapshotSchema);

export default GuildStatsSnapshotModel;
