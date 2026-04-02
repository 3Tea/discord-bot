import { model, Schema, Document } from "mongoose";

export interface IUser extends Document {
    userID: string;
    totalPoint: number;
    totalCoin: number;
    topAllServer: number;
    lastActivity: Date;
    status: boolean;
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
    },
    {
        timestamps: true,
        collection: "Users",
    }
);

userSchema.post("save", (error: any, doc: any, next: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error.name === "MongoServerError" && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

userSchema.set("toJSON", {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
    },
});

userSchema.set("toObject", {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
    },
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
