// src/services/audit/auditEmbeds.ts
import { EmbedBuilder, Guild } from "discord.js";
import type { IGuildAudit } from "../../models/guildAudit.model";

const COLOR = {
    JOIN: 0x22c55e,
    LEAVE: 0xef4444,
    ERROR: 0xef4444,
    SUCCESS: 0x3b82f6,
    ADMIN: 0xa855f7,
    SUMMARY: 0xeab308,
};

export interface CommandEntry {
    commandName: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    options: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
}

function truncate(str: string, max: number): string {
    return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

export function guildJoinEmbed(guild: Guild, totalGuildsNow: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("🟢 Bot joined guild")
        .setColor(COLOR.JOIN)
        .setThumbnail(guild.iconURL() ?? null)
        .addFields(
            { name: "Name", value: guild.name, inline: true },
            { name: "Guild ID", value: guild.id, inline: true },
            { name: "Members", value: String(guild.memberCount), inline: true },
            { name: "Owner ID", value: guild.ownerId, inline: true },
            { name: "Total guilds now", value: String(totalGuildsNow), inline: true }
        )
        .setTimestamp();
}

export function guildLeaveEmbed(audit: IGuildAudit, totalGuildsNow: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("🔴 Bot left guild")
        .setColor(COLOR.LEAVE)
        .setThumbnail(audit.iconURL ?? null)
        .addFields(
            { name: "Name", value: audit.name, inline: true },
            { name: "Guild ID", value: audit.guildId, inline: true },
            { name: "Last member count", value: String(audit.memberCount), inline: true },
            { name: "Joined", value: `<t:${Math.floor(audit.joinedAt.getTime() / 1000)}:R>`, inline: true },
            { name: "Total guilds now", value: String(totalGuildsNow), inline: true }
        )
        .setTimestamp();
}

function optionsToString(opts: Record<string, unknown>): string {
    const keys = Object.keys(opts);
    if (keys.length === 0) return "—";
    const parts = keys.map((k) => `${k}: ${truncate(String(opts[k]), 50)}`);
    return truncate(parts.join(", "), 500);
}

export function commandSuccessEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`/${entry.commandName}`)
        .setColor(COLOR.SUCCESS)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Latency", value: `${entry.latencyMs}ms`, inline: true },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function commandErrorEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`❌ /${entry.commandName}`)
        .setColor(COLOR.ERROR)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Latency", value: `${entry.latencyMs}ms`, inline: true },
            { name: "Error", value: truncate(entry.errorMessage ?? "Unknown error", 1000), inline: false },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function adminActionEmbed(entry: CommandEntry): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`🛡️ Admin action: /${entry.commandName}`)
        .setColor(COLOR.ADMIN)
        .addFields(
            { name: "User", value: `${entry.username} (${entry.userId})`, inline: true },
            { name: "Guild", value: entry.guildId, inline: true },
            { name: "Options", value: optionsToString(entry.options), inline: false }
        )
        .setTimestamp();
}

export function startupSummaryEmbed(params: {
    totalGuilds: number;
    totalMembers: number;
    topGuilds: Array<{ name: string; memberCount: number }>;
}): EmbedBuilder {
    const top = params.topGuilds
        .slice(0, 10)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new EmbedBuilder()
        .setTitle("🚀 Bot started")
        .setColor(COLOR.SUMMARY)
        .addFields(
            { name: "Total guilds", value: String(params.totalGuilds), inline: true },
            { name: "Total members", value: params.totalMembers.toLocaleString(), inline: true },
            { name: "Top guilds", value: top, inline: false }
        )
        .setTimestamp();
}

export function snapshotSummaryEmbed(params: {
    totalGuilds: number;
    totalMembers: number;
    memberDelta: number;
    top5: Array<{ name: string; memberCount: number }>;
}): EmbedBuilder {
    const deltaStr = params.memberDelta >= 0 ? `+${params.memberDelta}` : `${params.memberDelta}`;
    const top = params.top5
        .slice(0, 5)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new EmbedBuilder()
        .setTitle("📊 Daily snapshot")
        .setColor(COLOR.SUMMARY)
        .addFields(
            { name: "Total guilds", value: String(params.totalGuilds), inline: true },
            { name: "Total members", value: `${params.totalMembers.toLocaleString()} (${deltaStr})`, inline: true },
            { name: "Top 5", value: top, inline: false }
        )
        .setTimestamp();
}

export function backgroundErrorEmbed(jobName: string, error: Error): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`⚠️ Background job error: ${jobName}`)
        .setColor(COLOR.ERROR)
        .addFields(
            { name: "Error", value: truncate(error.message, 1000), inline: false },
            { name: "Stack", value: truncate(error.stack ?? "No stack", 1000), inline: false }
        )
        .setTimestamp();
}
