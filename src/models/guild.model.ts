import { model, Schema, Document } from "mongoose";

export interface IGuild extends Document {
    guildID: string;
    totalPoint: number;
    topAllGuild: number;
    status: boolean;
    verify: boolean;
}

const guildSchema = new Schema(
    {
        guildID: {
            type: String,
            default: null,
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
    },
    {
        timestamps: true,
        collection: "Guilds",
    }
);

guildSchema.post("save", (error: any, doc: any, next: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error.name === "MongoServerError" && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

guildSchema.set("toJSON", {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
    },
});

guildSchema.set("toObject", {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
    },
});

const GuildModel = model<IGuild>("Guild", guildSchema);

export default GuildModel;
