"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/events/guildDelete.ts
const discord_js_1 = require("discord.js");
const audit_service_1 = require("../services/audit/audit.service");
exports.default = {
    name: discord_js_1.Events.GuildDelete,
    once: false,
    async execute(guild) {
        if (!guild.available)
            return;
        await audit_service_1.AuditService.onGuildDelete(guild);
    },
};
