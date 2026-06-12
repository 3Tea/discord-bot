"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const branchGuildSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    questChannelId: { type: String, default: null },
}, { timestamps: true, collection: "BranchGuilds" });
branchGuildSchema.index({ guildId: 1 }, { unique: true });
const BranchGuildModel = (0, mongoose_1.model)("BranchGuild", branchGuildSchema);
exports.default = BranchGuildModel;
