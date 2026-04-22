import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export const NotificationType = {
    Welcome: "welcome",
    Goodbye: "goodbye",
    LevelUp: "level_up",
    Boost: "boost",
    Milestone: "milestone",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface IGuildNotificationConfig {
    guildId: string;
    type: NotificationType;
    enabled: boolean;
    channelId: string | null;
    options: {
        thresholds?: number[];
    };
}
export type GuildNotificationConfigDoc = HydratedDocument<IGuildNotificationConfig>;

const guildNotificationConfigSchema = new Schema<IGuildNotificationConfig>(
    {
        guildId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["welcome", "goodbye", "level_up", "boost", "milestone"],
        },
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        options: {
            thresholds: { type: [Number], default: undefined },
        },
    },
    {
        timestamps: true,
        collection: "GuildNotificationConfigs",
    }
);

guildNotificationConfigSchema.index({ guildId: 1, type: 1 }, { unique: true });

export default model<IGuildNotificationConfig>("GuildNotificationConfig", guildNotificationConfigSchema);
