// src/models/guildSnapshot.model.ts
import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IGuildSnapshot {
    guildId: string;
    memberCount: number;
    takenAt: Date;
}
export type GuildSnapshotDoc = HydratedDocument<IGuildSnapshot>;

const guildSnapshotSchema = new Schema<IGuildSnapshot>(
    {
        guildId: { type: String, required: true },
        memberCount: { type: Number, required: true },
        takenAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "GuildSnapshots" }
);

guildSnapshotSchema.index({ guildId: 1, takenAt: -1 });
guildSnapshotSchema.index({ takenAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default model<IGuildSnapshot>("GuildSnapshot", guildSnapshotSchema);
