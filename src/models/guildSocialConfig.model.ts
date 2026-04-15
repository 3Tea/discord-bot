import { model, Schema, Document } from "mongoose";

export interface IGuildSocialConfig extends Document {
    guildId: string;
    enabled: boolean;
    giftMaxAmount: number;
    robSuccessRate: number;
    robStealMinPct: number;
    robStealMaxPct: number;
    robPenaltyMinPct: number;
    robPenaltyMaxPct: number;
    robMinBalance: number;
}

const guildSocialConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        giftMaxAmount: { type: Number, default: 1000 },
        robSuccessRate: { type: Number, default: 0.4 },
        robStealMinPct: { type: Number, default: 10 },
        robStealMaxPct: { type: Number, default: 30 },
        robPenaltyMinPct: { type: Number, default: 10 },
        robPenaltyMaxPct: { type: Number, default: 20 },
        robMinBalance: { type: Number, default: 100 },
    },
    {
        timestamps: true,
        collection: "GuildSocialConfigs",
    }
);

const GuildSocialConfigModel = model<IGuildSocialConfig>("GuildSocialConfig", guildSocialConfigSchema);

export default GuildSocialConfigModel;
