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
    ALERT: 0xdc2626,
    OUTPUT_DM: 0x3b82f6,
    OUTPUT_WELCOME: 0x22c55e,
    OUTPUT_GOODBYE: 0xef4444,
    OUTPUT_BOOST: 0xec4899,
    OUTPUT_LEVELUP: 0xeab308,
    OUTPUT_MILESTONE: 0x06b6d4,
    OUTPUT_CONFESSION: 0x9b59b6,
    OUTPUT_INTERACTION: 0x6b7280,
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

export type OutputSource =
    | "interaction_reply"
    | "interaction_edit"
    | "interaction_followup"
    | "dm"
    | "welcome"
    | "goodbye"
    | "boost"
    | "level_up"
    | "milestone"
    | "confession_post"
    | "confession_reply";

export interface CapturedOutput {
    source: OutputSource;
    targetType: "user" | "channel";
    targetId: string;
    guildId?: string;
    commandName?: string;
    isEphemeral: boolean;
    content?: string;
    embeds: unknown[];
    components: unknown[];
    attachments: Array<{ url: string; name: string }>;
    capturedAt: Date;
}

function sourceColor(source: OutputSource): number {
    switch (source) {
        case "dm":
            return COLOR.OUTPUT_DM;
        case "welcome":
            return COLOR.OUTPUT_WELCOME;
        case "goodbye":
            return COLOR.OUTPUT_GOODBYE;
        case "boost":
            return COLOR.OUTPUT_BOOST;
        case "level_up":
            return COLOR.OUTPUT_LEVELUP;
        case "milestone":
            return COLOR.OUTPUT_MILESTONE;
        case "confession_post":
        case "confession_reply":
            return COLOR.OUTPUT_CONFESSION;
        default:
            return COLOR.OUTPUT_INTERACTION;
    }
}

function sourceEmoji(source: OutputSource): string {
    switch (source) {
        case "dm":
            return "📨";
        case "welcome":
            return "👋";
        case "goodbye":
            return "🚪";
        case "boost":
            return "🚀";
        case "level_up":
            return "⬆️";
        case "milestone":
            return "🏆";
        case "confession_post":
        case "confession_reply":
            return "🤫";
        default:
            return "💬";
    }
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
    const top =
        params.topGuilds
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
    const top =
        params.top5
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

export function memberDropAlertEmbed(
    thresholdPct: number,
    offenders: Array<{ guildId: string; name: string; previous: number; current: number; dropPct: number }>
): EmbedBuilder {
    const top = offenders
        .slice()
        .sort((a, b) => b.dropPct - a.dropPct)
        .slice(0, 15)
        .map(
            (o) =>
                `• **${truncate(o.name, 40)}** (\`${o.guildId}\`) — ${o.previous.toLocaleString()} → ${o.current.toLocaleString()} (−${o.dropPct.toFixed(1)}%)`
        )
        .join("\n");
    return new EmbedBuilder()
        .setTitle("🚨 Member drop threshold exceeded")
        .setColor(COLOR.ALERT)
        .setDescription(
            `Threshold: **−${thresholdPct}%** in last snapshot window.\nGuilds affected: **${offenders.length}**`
        )
        .addFields({ name: "Top offenders", value: truncate(top, 1024), inline: false })
        .setTimestamp();
}

export function rateExceededAlertEmbed(label: string, count: number, threshold: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`🚨 Rate threshold exceeded: ${label}`)
        .setColor(COLOR.ALERT)
        .addFields(
            { name: "Count (last hour)", value: String(count), inline: true },
            { name: "Threshold", value: String(threshold), inline: true }
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

export function outputAuditEmbed(captured: CapturedOutput): EmbedBuilder {
    const title = `${sourceEmoji(captured.source)} · ${captured.source}`;

    const guildSuffix = captured.guildId ? ` (guild \`${captured.guildId}\`)` : "";
    const targetField =
        captured.targetType === "user" ? `<@${captured.targetId}>` : `<#${captured.targetId}>${guildSuffix}`;

    const embedsArr = Array.isArray(captured.embeds) ? captured.embeds : [];
    const componentsArr = Array.isArray(captured.components) ? captured.components : [];
    const charCount = captured.content?.length ?? 0;
    const sizeField = `${embedsArr.length} embeds · ${charCount} chars · ${componentsArr.length} rows · ${captured.attachments.length} files`;

    const flags: string[] = [];
    if (captured.isEphemeral) flags.push("👻 ephemeral");
    if (!embedsArr.length && captured.content) flags.push("💬 content-only");
    if (captured.attachments.length > 0) flags.push("🖼️ has-attachments");

    const embed = new EmbedBuilder()
        .setTitle(truncate(title, 256))
        .setColor(sourceColor(captured.source))
        .addFields(
            { name: "Target", value: truncate(targetField, 1024), inline: false },
            { name: "Size", value: sizeField, inline: false },
            { name: "Flags", value: flags.length ? flags.join(" · ") : "—", inline: false }
        )
        .setTimestamp(captured.capturedAt);

    if (captured.commandName) {
        embed.addFields({ name: "Command", value: `/${captured.commandName}`, inline: true });
    }

    return embed;
}
