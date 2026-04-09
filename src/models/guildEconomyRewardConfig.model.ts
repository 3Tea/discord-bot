import { model, Schema, Document } from "mongoose";

export interface IGuildEconomyRewardConfig extends Document {
    guildId: string;
    enabled: boolean;
    levelUpCoinBase: number;
    levelUpCoinPerLevel: number;
    gemMilestones: Map<string, number>;
    voiceCoinInterval: number;
    voiceCoinReward: number;
}

const DEFAULT_GEM_MILESTONES = new Map([
    ["10", 1],
    ["25", 2],
    ["50", 3],
    ["75", 4],
    ["100", 5],
]);

const guildEconomyRewardConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        levelUpCoinBase: { type: Number, default: 50 },
        levelUpCoinPerLevel: { type: Number, default: 10 },
        gemMilestones: {
            type: Map,
            of: Number,
            default: () => new Map(DEFAULT_GEM_MILESTONES),
        },
        voiceCoinInterval: { type: Number, default: 30 },
        voiceCoinReward: { type: Number, default: 10 },
    },
    {
        timestamps: true,
        collection: "GuildEconomyRewardConfigs",
    }
);

const GuildEconomyRewardConfigModel = model<IGuildEconomyRewardConfig>(
    "GuildEconomyRewardConfig",
    guildEconomyRewardConfigSchema
);

export default GuildEconomyRewardConfigModel;
