import { model, Schema, Document } from "mongoose";

export interface IGuildWorkConfig extends Document {
    guildId: string;
    enabled: boolean;
    workCooldown: number;
    workMinReward: number;
    workMaxReward: number;
    fishCooldown: number;
    fishRewardMultiplier: number;
}

const guildWorkConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        workCooldown: { type: Number, default: 14400 },
        workMinReward: { type: Number, default: 80 },
        workMaxReward: { type: Number, default: 200 },
        fishCooldown: { type: Number, default: 3600 },
        fishRewardMultiplier: { type: Number, default: 1.0 },
    },
    {
        timestamps: true,
        collection: "GuildWorkConfigs",
    }
);

const GuildWorkConfigModel = model<IGuildWorkConfig>(
    "GuildWorkConfig",
    guildWorkConfigSchema
);

export default GuildWorkConfigModel;
