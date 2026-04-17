// src/events/guildCreate.ts
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild) {
        await AuditService.onGuildCreate(guild);
    },
};
