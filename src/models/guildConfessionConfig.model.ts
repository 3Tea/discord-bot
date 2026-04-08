import { model, Schema, Document } from "mongoose";

export type ConfessionMode = "instant" | "review";

export interface IGuildConfessionConfig extends Document {
    guildId: string;
    enabled: boolean;
    mode: ConfessionMode;
    publicChannelId: string;
    reviewChannelId: string | null;
    cooldownMinutes: number;
    /** Increments atomically with each new confession number issued for this guild. */
    lastConfessionNumber: number;
    blockedKeywords: string[];
}

const guildConfessionConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ["instant", "review"], default: "instant" },
        publicChannelId: { type: String, required: true },
        reviewChannelId: { type: String, default: null },
        cooldownMinutes: { type: Number, default: 10, min: 1, max: 120 },
        lastConfessionNumber: { type: Number, default: 0 },
        blockedKeywords: { type: [String], default: [] },
    },
    { timestamps: true, collection: "GuildConfessionConfigs" }
);

export default model<IGuildConfessionConfig>("GuildConfessionConfig", guildConfessionConfigSchema);
