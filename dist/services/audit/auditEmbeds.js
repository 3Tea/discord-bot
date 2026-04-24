"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildJoinEmbed = guildJoinEmbed;
exports.guildLeaveEmbed = guildLeaveEmbed;
exports.commandSuccessEmbed = commandSuccessEmbed;
exports.commandErrorEmbed = commandErrorEmbed;
exports.adminActionEmbed = adminActionEmbed;
exports.startupSummaryEmbed = startupSummaryEmbed;
exports.snapshotSummaryEmbed = snapshotSummaryEmbed;
exports.memberDropAlertEmbed = memberDropAlertEmbed;
exports.rateExceededAlertEmbed = rateExceededAlertEmbed;
exports.backgroundErrorEmbed = backgroundErrorEmbed;
exports.blocklistActionEmbed = blocklistActionEmbed;
exports.outputAuditEmbed = outputAuditEmbed;
// src/services/audit/auditEmbeds.ts
const discord_js_1 = require("discord.js");
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
function sourceColor(source) {
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
function sourceEmoji(source) {
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
function truncate(str, max) {
    return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}
function guildJoinEmbed(guild, totalGuildsNow) {
    return new discord_js_1.EmbedBuilder()
        .setTitle("🟢 Bot joined guild")
        .setColor(COLOR.JOIN)
        .setThumbnail(guild.iconURL() ?? null)
        .addFields({ name: "Name", value: guild.name, inline: true }, { name: "Guild ID", value: guild.id, inline: true }, { name: "Members", value: String(guild.memberCount), inline: true }, { name: "Owner ID", value: guild.ownerId, inline: true }, { name: "Total guilds now", value: String(totalGuildsNow), inline: true })
        .setTimestamp();
}
function guildLeaveEmbed(audit, totalGuildsNow) {
    return new discord_js_1.EmbedBuilder()
        .setTitle("🔴 Bot left guild")
        .setColor(COLOR.LEAVE)
        .setThumbnail(audit.iconURL ?? null)
        .addFields({ name: "Name", value: audit.name, inline: true }, { name: "Guild ID", value: audit.guildId, inline: true }, { name: "Last member count", value: String(audit.memberCount), inline: true }, { name: "Joined", value: `<t:${Math.floor(audit.joinedAt.getTime() / 1000)}:R>`, inline: true }, { name: "Total guilds now", value: String(totalGuildsNow), inline: true })
        .setTimestamp();
}
function optionsToString(opts) {
    const keys = Object.keys(opts);
    if (keys.length === 0)
        return "—";
    const parts = keys.map((k) => `${k}: ${truncate(String(opts[k]), 50)}`);
    return truncate(parts.join(", "), 500);
}
function commandSuccessEmbed(entry) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`/${entry.commandName}`)
        .setColor(COLOR.SUCCESS)
        .addFields({ name: "User", value: `${entry.username} (${entry.userId})`, inline: true }, { name: "Guild", value: entry.guildId, inline: true }, { name: "Latency", value: `${entry.latencyMs}ms`, inline: true }, { name: "Options", value: optionsToString(entry.options), inline: false })
        .setTimestamp();
}
function commandErrorEmbed(entry) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`❌ /${entry.commandName}`)
        .setColor(COLOR.ERROR)
        .addFields({ name: "User", value: `${entry.username} (${entry.userId})`, inline: true }, { name: "Guild", value: entry.guildId, inline: true }, { name: "Latency", value: `${entry.latencyMs}ms`, inline: true }, { name: "Error", value: truncate(entry.errorMessage ?? "Unknown error", 1000), inline: false }, { name: "Options", value: optionsToString(entry.options), inline: false })
        .setTimestamp();
}
function adminActionEmbed(entry) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🛡️ Admin action: /${entry.commandName}`)
        .setColor(COLOR.ADMIN)
        .addFields({ name: "User", value: `${entry.username} (${entry.userId})`, inline: true }, { name: "Guild", value: entry.guildId, inline: true }, { name: "Options", value: optionsToString(entry.options), inline: false })
        .setTimestamp();
}
function startupSummaryEmbed(params) {
    const top = params.topGuilds
        .slice(0, 10)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new discord_js_1.EmbedBuilder()
        .setTitle("🚀 Bot started")
        .setColor(COLOR.SUMMARY)
        .addFields({ name: "Total guilds", value: String(params.totalGuilds), inline: true }, { name: "Total members", value: params.totalMembers.toLocaleString(), inline: true }, { name: "Top guilds", value: top, inline: false })
        .setTimestamp();
}
function snapshotSummaryEmbed(params) {
    const deltaStr = params.memberDelta >= 0 ? `+${params.memberDelta}` : `${params.memberDelta}`;
    const top = params.top5
        .slice(0, 5)
        .map((g, i) => `${i + 1}. ${truncate(g.name, 40)} — ${g.memberCount.toLocaleString()}`)
        .join("\n") || "—";
    return new discord_js_1.EmbedBuilder()
        .setTitle("📊 Daily snapshot")
        .setColor(COLOR.SUMMARY)
        .addFields({ name: "Total guilds", value: String(params.totalGuilds), inline: true }, { name: "Total members", value: `${params.totalMembers.toLocaleString()} (${deltaStr})`, inline: true }, { name: "Top 5", value: top, inline: false })
        .setTimestamp();
}
function memberDropAlertEmbed(thresholdPct, offenders) {
    const top = offenders
        .slice()
        .sort((a, b) => b.dropPct - a.dropPct)
        .slice(0, 15)
        .map((o) => `• **${truncate(o.name, 40)}** (\`${o.guildId}\`) — ${o.previous.toLocaleString()} → ${o.current.toLocaleString()} (−${o.dropPct.toFixed(1)}%)`)
        .join("\n");
    return new discord_js_1.EmbedBuilder()
        .setTitle("🚨 Member drop threshold exceeded")
        .setColor(COLOR.ALERT)
        .setDescription(`Threshold: **−${thresholdPct}%** in last snapshot window.\nGuilds affected: **${offenders.length}**`)
        .addFields({ name: "Top offenders", value: truncate(top, 1024), inline: false })
        .setTimestamp();
}
function rateExceededAlertEmbed(label, count, threshold) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🚨 Rate threshold exceeded: ${label}`)
        .setColor(COLOR.ALERT)
        .addFields({ name: "Count (last hour)", value: String(count), inline: true }, { name: "Threshold", value: String(threshold), inline: true })
        .setTimestamp();
}
function backgroundErrorEmbed(jobName, error) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`⚠️ Background job error: ${jobName}`)
        .setColor(COLOR.ERROR)
        .addFields({ name: "Error", value: truncate(error.message, 1000), inline: false }, { name: "Stack", value: truncate(error.stack ?? "No stack", 1000), inline: false })
        .setTimestamp();
}
function blocklistActionEmbed(payload) {
    const titleMap = {
        add: "🛑 Blocklist — added",
        remove: "✅ Blocklist — removed",
        "auto-leave": "🚪 Blocklist — auto-left guild",
        "rejoin-blocked": "⛔ Blocklist — blocked guild tried to rejoin",
    };
    const colorMap = {
        add: COLOR.ALERT,
        remove: COLOR.JOIN,
        "auto-leave": COLOR.LEAVE,
        "rejoin-blocked": COLOR.ALERT,
    };
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(titleMap[payload.action])
        .setColor(colorMap[payload.action])
        .addFields({ name: "Type", value: payload.type, inline: true }, { name: "Target", value: `\`${payload.targetId}\``, inline: true })
        .setTimestamp();
    if (payload.guildName) {
        embed.addFields({ name: "Guild name", value: truncate(payload.guildName, 256), inline: true });
    }
    if (payload.reason) {
        embed.addFields({ name: "Reason", value: truncate(payload.reason, 500), inline: false });
    }
    if (payload.blockedBy) {
        embed.addFields({ name: "By", value: `<@${payload.blockedBy}>`, inline: true });
    }
    return embed;
}
function outputAuditEmbed(captured) {
    const title = `${sourceEmoji(captured.source)} · ${captured.source}`;
    const guildSuffix = captured.guildId ? ` (guild \`${captured.guildId}\`)` : "";
    const targetField = captured.targetType === "user" ? `<@${captured.targetId}>` : `<#${captured.targetId}>${guildSuffix}`;
    const embedsArr = Array.isArray(captured.embeds) ? captured.embeds : [];
    const componentsArr = Array.isArray(captured.components) ? captured.components : [];
    const charCount = captured.content?.length ?? 0;
    const sizeField = `${embedsArr.length} embeds · ${charCount} chars · ${componentsArr.length} rows · ${captured.attachments.length} files`;
    const flags = [];
    if (captured.isEphemeral)
        flags.push("👻 ephemeral");
    if (!embedsArr.length && captured.content)
        flags.push("💬 content-only");
    if (captured.attachments.length > 0)
        flags.push("🖼️ has-attachments");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(truncate(title, 256))
        .setColor(sourceColor(captured.source))
        .addFields({ name: "Target", value: truncate(targetField, 1024), inline: false }, { name: "Size", value: sizeField, inline: false }, { name: "Flags", value: flags.length ? flags.join(" · ") : "—", inline: false })
        .setTimestamp(captured.capturedAt);
    if (captured.commandName) {
        embed.addFields({ name: "Command", value: `/${captured.commandName}`, inline: true });
    }
    return embed;
}
