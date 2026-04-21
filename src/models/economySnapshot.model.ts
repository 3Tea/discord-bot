import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface ISnapshotEntry {
    userId: string;
    coin?: number;
    gem?: number;
    prayStreak?: number;
    lastStreakDate?: Date | null;
}

export type SnapshotScope = "coin" | "gem" | "streak" | "all";

export interface IEconomySnapshot {
    snapshotId: string;
    guildId: string;
    createdBy: string;
    scope: SnapshotScope;
    target: string;
    data: ISnapshotEntry[];
    restoredAt: Date | null;
    createdAt: Date;
}
export type EconomySnapshotDoc = HydratedDocument<IEconomySnapshot>;

const economySnapshotSchema = new Schema<IEconomySnapshot>(
    {
        snapshotId: { type: String, required: true },
        guildId: { type: String, required: true },
        createdBy: { type: String, required: true },
        scope: { type: String, enum: ["coin", "gem", "streak", "all"], required: true },
        target: { type: String, required: true },
        data: [
            {
                userId: { type: String, required: true },
                coin: { type: Number },
                gem: { type: Number },
                prayStreak: { type: Number },
                lastStreakDate: { type: Date },
            },
        ],
        restoredAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "EconomySnapshots",
    }
);

economySnapshotSchema.index({ guildId: 1, createdAt: -1 });
economySnapshotSchema.index({ snapshotId: 1 }, { unique: true });

const EconomySnapshotModel = model<IEconomySnapshot>("EconomySnapshot", economySnapshotSchema);

export default EconomySnapshotModel;
