import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IGuildXPConfig {
    guildId: string;
    blacklistedChannels: string[];
    xpPerMessage: number;
    xpPerVoiceMinute: number;
    xpPerReaction: number;
    messageCooldown: number;
    minMessageLength: number;
    enabled: boolean;
}
export type GuildXPConfigDoc = HydratedDocument<IGuildXPConfig>;

const guildXPConfigSchema = new Schema<IGuildXPConfig>(
    {
        guildId: { type: String, required: true, unique: true },
        blacklistedChannels: { type: [String], default: [] },
        xpPerMessage: { type: Number, default: 20 },
        xpPerVoiceMinute: { type: Number, default: 5 },
        xpPerReaction: { type: Number, default: 3 },
        messageCooldown: { type: Number, default: 60 },
        minMessageLength: { type: Number, default: 3 },
        enabled: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "GuildXPConfigs",
    }
);

const GuildXPConfigModel = model<IGuildXPConfig>("GuildXPConfig", guildXPConfigSchema);

export default GuildXPConfigModel;
