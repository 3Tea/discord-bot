// src/events/guildDelete.ts
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildDelete,
    once: false,
    async execute(guild: Guild) {
        if (!guild.available) return;
        await AuditService.onGuildDelete(guild);
    },
};
