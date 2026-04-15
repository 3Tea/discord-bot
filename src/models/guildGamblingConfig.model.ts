import { model, Schema, Document } from "mongoose";

export interface IGuildGamblingConfig extends Document {
    guildId: string;
    enabled: boolean;
    minBet: number;
    maxBet: number;
}

const guildGamblingConfigSchema = new Schema(
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
