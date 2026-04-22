// src/events/guildCreate.ts
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";
import { BlocklistService } from "../services/blocklist/blocklist.service";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild) {
        const { blocked, reason } = await BlocklistService.isGuildBlocked(guild.id);
        if (blocked) {
            try {
                await guild.leave();
                await BlocklistService.markGuildLeft(guild.id);
                AuditService.recordBlocklistAction({
                    action: "rejoin-blocked",
                    type: "guild",
                    targetId: guild.id,
                    guildName: guild.name,
                    reason,
                });
                logger.warn(`[Blocklist] auto-left blocked guild on rejoin: ${guild.id} (${guild.name})`);
            } catch (error) {
                logger.error(
                    `[Blocklist] failed to auto-leave guild ${guild.id}: ${error instanceof Error ? error.message : "Unknown"}`
                );
            }
            return;
        }
        await AuditService.onGuildCreate(guild);
    },
};
