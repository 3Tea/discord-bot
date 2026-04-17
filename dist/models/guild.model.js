"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guildSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: "Guilds",
});
guildSchema.index({ guildID: 1 }, { unique: true });
guildSchema.post("save", (error, doc, next) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error && "code" in error && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else
        next(error);
});
guildSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.__v;
    },
});
guildSchema.set("toObject", {
    transform: (_doc, ret) => {
        delete ret.__v;
    },
});
const GuildModel = (0, mongoose_1.model)("Guild", guildSchema);
exports.default = GuildModel;
