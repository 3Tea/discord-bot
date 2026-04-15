import { model, Schema, Document } from "mongoose";

export interface IEconomyLogThresholds {
    coinTransaction: number;
    gemTransaction: number;
    gamblingWin: number;
    robSuccess: boolean;
    adminActions: boolean;
    bulkOperations: boolean;
}

export interface IEconomyLogConfig extends Document {
    guildId: string;
    channelId: string;
    enabled: boolean;
    thresholds: IEconomyLogThresholds;
}

const economyLogConfigSchema = new Schema(
    {
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        thresholds: {
            coinTransaction: { type: Number, default: 500 },
            gemTransaction: { type: Number, default: 5 },
            gamblingWin: { type: Number, default: 1000 },
            robSuccess: { type: Boolean, default: true },
            adminActions: { type: Boolean, default: true },
            bulkOperations: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
        collection: "EconomyLogConfigs",
    }
);

economyLogConfigSchema.index({ guildId: 1 }, { unique: true });

const EconomyLogConfigModel = model<IEconomyLogConfig>("EconomyLogConfig", economyLogConfigSchema);

export default EconomyLogConfigModel;
