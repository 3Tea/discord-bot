import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IGuildGamblingConfig {
    guildId: string;
    enabled: boolean;
    minBet: number;
    maxBet: number;
}
export type GuildGamblingConfigDoc = HydratedDocument<IGuildGamblingConfig>;

const guildGamblingConfigSchema = new Schema<IGuildGamblingConfig>(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        minBet: { type: Number, default: 10, min: 1, max: 1_000_000 },
        maxBet: { type: Number, default: 500, min: 1, max: 10_000_000 },
    },
    {
        timestamps: true,
        collection: "GuildGamblingConfigs",
    }
);

const GuildGamblingConfigModel = model<IGuildGamblingConfig>("GuildGamblingConfig", guildGamblingConfigSchema);

export default GuildGamblingConfigModel;
