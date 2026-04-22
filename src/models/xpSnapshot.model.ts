// src/models/xpSnapshot.model.ts
import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { Period } from "../util/xp/periodKey";

export interface IXPSnapshot {
    userId: string;
    guildId: string | null;
    period: Period;
    periodKey: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}
export type XPSnapshotDoc = HydratedDocument<IXPSnapshot>;

const xpSnapshotSchema = new Schema<IXPSnapshot>(
    {
        userId: { type: String, required: true },
        guildId: { type: String, default: null },
        period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
        periodKey: { type: String, required: true },
        xp: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: "XPSnapshots",
    }
);

// Leaderboard queries: find top users for a given period in a guild (or global)
xpSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1, xp: -1 });

// Upsert & individual user lookup
xpSnapshotSchema.index({ userId: 1, guildId: 1, period: 1, periodKey: 1 }, { unique: true });

const XPSnapshotModel = model<IXPSnapshot>("XPSnapshot", xpSnapshotSchema);

export default XPSnapshotModel;
