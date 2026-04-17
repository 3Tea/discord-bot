"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: "Users",
});
userSchema.index({ userID: 1 }, { unique: true });
userSchema.index({ totalPoint: -1 });
userSchema.post("save", (error, doc, next) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error && "code" in error && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else
        next(error);
});
userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.__v;
    },
});
userSchema.set("toObject", {
    transform: (_doc, ret) => {
        delete ret.__v;
    },
});
const UserModel = (0, mongoose_1.model)("User", userSchema);
exports.default = UserModel;
