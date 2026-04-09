import { model, Schema, Document } from "mongoose";

export interface IGuildGamblingConfig extends Document {
    guildId: string;
    enabled: boolean;
    minBet: number;
    maxBet: number;
    cooldown: number;
}

const guildGamblingConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        minBet: { type: Number, default: 10 },
        maxBet: { type: Number, default: 500 },
        cooldown: { type: Number, default: 30 },
    },
    {
        timestamps: true,
        collection: "GuildGamblingConfigs",
    }
);

const GuildGamblingConfigModel = model<IGuildGamblingConfig>(
    "GuildGamblingConfig",
    guildGamblingConfigSchema
);

export default GuildGamblingConfigModel;
