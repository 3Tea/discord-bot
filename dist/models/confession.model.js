"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const confessionSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, index: true },
    number: { type: Number, required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    image: {
        type: {
            url: { type: String, required: true },
            name: { type: String, default: null },
            contentType: { type: String, default: null },
        },
        default: null,
    },
    audio: {
        type: {
            url: { type: String, required: true },
            name: { type: String, default: null },
            contentType: { type: String, default: null },
        },
        default: null,
    },
    isVip: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    threadId: { type: String, default: null },
    replyCount: { type: Number, default: 0 },
    tag: { type: String, default: null },
    status: {
        type: String,
        enum: ["pending", "published", "rejected"],
        required: true,
        index: true,
    },
    reviewMessageId: { type: String, default: null },
    publicMessageId: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
}, { timestamps: true, collection: "Confessions" });
confessionSchema.index({ guildId: 1, number: 1 }, { unique: true });
confessionSchema.index({ guildId: 1, status: 1 });
exports.default = (0, mongoose_1.model)("Confession", confessionSchema);
