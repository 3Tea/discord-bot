"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/events/guildCreate.ts
const discord_js_1 = require("discord.js");
const audit_service_1 = require("../services/audit/audit.service");
const blocklist_service_1 = require("../services/blocklist/blocklist.service");
const logger_mixed_1 = require("../util/log/logger.mixed");
exports.default = {
    name: discord_js_1.Events.GuildCreate,
    once: false,
    async execute(guild) {
        const { blocked, reason } = await blocklist_service_1.BlocklistService.isGuildBlocked(guild.id);
        if (blocked) {
            try {
                await guild.leave();
                await blocklist_service_1.BlocklistService.markGuildLeft(guild.id);
                audit_service_1.AuditService.recordBlocklistAction({
                    action: "rejoin-blocked",
                    type: "guild",
                    targetId: guild.id,
                    guildName: guild.name,
                    reason,
                });
                logger_mixed_1.logger.warn(`[Blocklist] auto-left blocked guild on rejoin: ${guild.id} (${guild.name})`);
            }
            catch (error) {
                logger_mixed_1.logger.error(`[Blocklist] failed to auto-leave guild ${guild.id}: ${error instanceof Error ? error.message : "Unknown"}`);
            }
            return;
        }
        await audit_service_1.AuditService.onGuildCreate(guild);
    },
};
