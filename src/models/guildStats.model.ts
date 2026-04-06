import { model, Schema, Document } from "mongoose";

export interface IGuildStats extends Document {
    guildId: string;
    totalXP: number;
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    activeMembers: number;
    lastAggregatedAt: Date | null;
}

const guildStatsSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        totalXP: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 },
        totalVoiceMinutes: { type: Number, default: 0 },
        totalReactions: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
        lastAggregatedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "GuildStats",
    }
);

guildStatsSchema.index({ totalXP: -1 });

const GuildStatsModel = model<IGuildStats>("GuildStats", guildStatsSchema);

export default GuildStatsModel;
