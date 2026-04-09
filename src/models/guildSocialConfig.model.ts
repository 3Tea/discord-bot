import { model, Schema, Document } from "mongoose";

export interface IGuildSocialConfig extends Document {
    guildId: string;
    enabled: boolean;
    giftMaxAmount: number;
    robCooldown: number;
    robSuccessRate: number;
    robStealMinPct: number;
    robStealMaxPct: number;
    robPenaltyMinPct: number;
    robPenaltyMaxPct: number;
    robMinBalance: number;
    robImmunityDuration: number;
}

const guildSocialConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: true },
        giftMaxAmount: { type: Number, default: 1000 },
        robCooldown: { type: Number, default: 21600 },
        robSuccessRate: { type: Number, default: 0.4 },
        robStealMinPct: { type: Number, default: 10 },
        robStealMaxPct: { type: Number, default: 30 },
        robPenaltyMinPct: { type: Number, default: 10 },
        robPenaltyMaxPct: { type: Number, default: 20 },
        robMinBalance: { type: Number, default: 100 },
        robImmunityDuration: { type: Number, default: 7200 },
    },
    {
        timestamps: true,
        collection: "GuildSocialConfigs",
    }
);

const GuildSocialConfigModel = model<IGuildSocialConfig>("GuildSocialConfig", guildSocialConfigSchema);

export default GuildSocialConfigModel;
