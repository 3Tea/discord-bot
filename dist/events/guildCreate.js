"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/events/guildCreate.ts
const discord_js_1 = require("discord.js");
const audit_service_1 = require("../services/audit/audit.service");
exports.default = {
    name: discord_js_1.Events.GuildCreate,
    once: false,
    async execute(guild) {
        await audit_service_1.AuditService.onGuildCreate(guild);
    },
};
