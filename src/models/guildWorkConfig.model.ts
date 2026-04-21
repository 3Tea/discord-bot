import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IGuildWorkConfig {
    guildId: string;
    enabled: boolean;
    workMinReward: number;
    workMaxReward: number;
    fishRewardMultiplier: number;
}
export type GuildWorkConfigDoc = HydratedDocument<IGuildWorkConfig>;

const guildWorkConfigSchema = new Schema<IGuildWorkConfig>(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        workMinReward: { type: Number, default: 80, min: 1, max: 1_000_000 },
        workMaxReward: { type: Number, default: 200, min: 1, max: 10_000_000 },
        fishRewardMultiplier: { type: Number, default: 1.0, min: 0.1, max: 10 },
    },
    {
        timestamps: true,
        collection: "GuildWorkConfigs",
    }
);

const GuildWorkConfigModel = model<IGuildWorkConfig>("GuildWorkConfig", guildWorkConfigSchema);

export default GuildWorkConfigModel;
