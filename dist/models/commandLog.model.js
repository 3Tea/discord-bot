"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const commandLogSchema = new mongoose_1.Schema({
    commandName: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    options: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    success: { type: Boolean, required: true },
    errorMessage: { type: String },
    latencyMs: { type: Number, required: true },
}, {
    timestamps: true,
    collection: "CommandLogs",
});
commandLogSchema.index({ commandName: 1, createdAt: -1 });
commandLogSchema.index({ userId: 1, createdAt: -1 });
commandLogSchema.index({ guildId: 1, createdAt: -1 });
const CommandLogModel = (0, mongoose_1.model)("CommandLog", commandLogSchema);
exports.default = CommandLogModel;
