import { model, Schema } from "mongoose";
import type { CallbackError, HydratedDocument } from "mongoose";

import { logger } from "../util/log/logger.mixed";

// Legacy naming: uses guildID/userID (uppercase) — newer models use guildId/userId
export interface IUser {
    userID: string;
    totalPoint: number;
    totalCoin: number;
    topAllServer: number;
    lastActivity: Date;
    status: boolean;
    locale?: string;
}
export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
    {
        userID: {
            type: String,
            required: true,
            default: null,
        },
        totalPoint: {
            type: Number,
            default: 0,
        },
        totalCoin: {
            type: Number,
            default: 0,
        },
        topAllServer: {
            type: Number,
            default: 0,
        },
        lastActivity: {
            type: Date,
            default: null,
        },
        status: {
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
        collection: "Users",
    }
);

userSchema.index({ userID: 1 }, { unique: true });
userSchema.index({ totalPoint: -1 });

userSchema.post("save", (error: CallbackError, doc: IUser, next: (err?: CallbackError) => void) => {
    if (process.env.NODE_ENV === "development") {
        logger.debug(doc);
    }
    if (error && "code" in error && (error as Record<string, unknown>).code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete (ret as unknown as Record<string, unknown>).__v;
    },
});

userSchema.set("toObject", {
    transform: (_doc, ret) => {
        delete (ret as unknown as Record<string, unknown>).__v;
    },
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
