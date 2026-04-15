import { model, Schema, Document } from "mongoose";

export interface IGuildWorkConfig extends Document {
    guildId: string;
    enabled: boolean;
    workMinReward: number;
    workMaxReward: number;
    fishRewardMultiplier: number;
}

const guildWorkConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        workMinReward: { type: Number, default: 80 },
        workMaxReward: { type: Number, default: 200 },
        fishRewardMultiplier: { type: Number, default: 1.0 },
    },
    {
        timestamps: true,
        collection: "GuildWorkConfigs",
    }
);

const GuildWorkConfigModel = model<IGuildWorkConfig>("GuildWorkConfig", guildWorkConfigSchema);

export default GuildWorkConfigModel;
