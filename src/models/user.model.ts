import { model, Schema, Document } from "mongoose";
import type { CallbackError } from "mongoose";

export interface IUser extends Document {
    userID: string;
    totalPoint: number;
    totalCoin: number;
    topAllServer: number;
    lastActivity: Date;
    status: boolean;
    locale?: string;
}

const userSchema = new Schema(
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
        console.log(doc);
    }
    if (error && "code" in error && (error as Record<string, unknown>).code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
    },
});

userSchema.set("toObject", {
    transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
    },
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
