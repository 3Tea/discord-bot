"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const confessionReplySchema = new mongoose_1.Schema({
    confessionId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "Confession" },
    guildId: { type: String, required: true },
    authorId: { type: String, required: true },
    replyNumber: { type: Number, required: true },
    content: { type: String, required: true },
    messageId: { type: String, required: true },
}, { timestamps: true, collection: "ConfessionReplies" });
confessionReplySchema.index({ confessionId: 1, replyNumber: 1 }, { unique: true });
confessionReplySchema.index({ confessionId: 1, authorId: 1 });
exports.default = (0, mongoose_1.model)("ConfessionReply", confessionReplySchema);
