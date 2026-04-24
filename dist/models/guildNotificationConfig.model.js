"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = void 0;
const mongoose_1 = require("mongoose");
exports.NotificationType = {
    Welcome: "welcome",
    Goodbye: "goodbye",
    LevelUp: "level_up",
    Boost: "boost",
    Milestone: "milestone",
};
const guildNotificationConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ["welcome", "goodbye", "level_up", "boost", "milestone"],
    },
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    options: {
        thresholds: { type: [Number], default: undefined },
    },
}, {
    timestamps: true,
    collection: "GuildNotificationConfigs",
});
guildNotificationConfigSchema.index({ guildId: 1, type: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("GuildNotificationConfig", guildNotificationConfigSchema);
