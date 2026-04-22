import { model, Schema } from "mongoose";
import type { CallbackError, HydratedDocument } from "mongoose";

import { logger } from "../util/log/logger.mixed";

// Legacy naming: uses guildID/userID (uppercase) — newer models use guildId/userId
export interface IGuild {
    guildID: string;
    totalPoint: number;
    topAllGuild: number;
    status: boolean;
    verify: boolean;
    locale?: string;
}
export type GuildDoc = HydratedDocument<IGuild>;

const guildSchema = new Schema<IGuild>(
    {
        guildID: {
            type: String,
            required: true,
        },
        totalPoint: {
            type: Number,
            default: null,
        },
        topAllGuild: {
            type: Number,
            default: null,
        },
        status: {
            type: Boolean,
            default: true,
        },
        verify: {
            type: Boolean,
            default: true,
        },
        locale: {
            type: String,
            default: undefined,
        },
    },
    {
        timestamps: true,
        collection: "Guilds",
    }
);

guildSchema.index({ guildID: 1 }, { unique: true });

guildSchema.post("save", (error: CallbackError, doc: IGuild, next: (err?: CallbackError) => void) => {
    if (process.env.NODE_ENV === "development") {
        logger.debug(doc);
    }
    if (error && "code" in error && (error as Record<string, unknown>).code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

guildSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete (ret as unknown as Record<string, unknown>).__v;
    },
});

guildSchema.set("toObject", {
    transform: (_doc, ret) => {
        delete (ret as unknown as Record<string, unknown>).__v;
    },
});

const GuildModel = model<IGuild>("Guild", guildSchema);

export default GuildModel;
