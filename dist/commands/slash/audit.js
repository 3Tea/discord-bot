"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/commands/slash/audit.ts
const discord_js_1 = require("discord.js");
const guildAudit_model_1 = __importDefault(require("../../models/guildAudit.model"));
const guildSnapshot_model_1 = __importDefault(require("../../models/guildSnapshot.model"));
const auditConfig_service_1 = require("../../services/audit/auditConfig.service");
const auditDispatcher_service_1 = require("../../services/audit/auditDispatcher.service");
const index_1 = require("../../util/config/index");
const commandLocales_1 = require("../../util/i18n/commandLocales");
function isDevAuthorized(interaction) {
    return interaction.guildId === index_1.GUILD_ID && interaction.user.id === index_1.DEV_USER_ID;
}
function botHasRequiredPerms(channel, botId) {
    const perms = channel.permissionsFor(botId);
    if (!perms)
        return false;
    return perms.has(discord_js_1.PermissionsBitField.Flags.ViewChannel |
        discord_js_1.PermissionsBitField.Flags.SendMessages |
        discord_js_1.PermissionsBitField.Flags.EmbedLinks);
}
function sparkline(values) {
    const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    if (values.length === 0)
        return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
        .map((v) => blocks[Math.min(blocks.length - 1, Math.floor(((v - min) / range) * (blocks.length - 1)))])
        .join("");
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("audit")
        .setDescription("Audit system (dev only)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.desc"))
        .addSubcommandGroup((group) => group
        .setName("setup")
        .setDescription("Configure audit channels and options")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.desc"))
        .addSubcommand((sub) => sub
        .setName("critical-channel")
        .setDescription("Set the critical-events channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.critical_channel.desc"))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Text channel")
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("commands-channel")
        .setDescription("Set the command-log channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.commands_channel.desc"))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Text channel")
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("clear")
        .setDescription("Clear an audit channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.clear.desc"))
        .addStringOption((opt) => opt
        .setName("target")
        .setDescription("Which channel to clear")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.clear.target.desc"))
        .addChoices({ name: "critical", value: "critical" }, { name: "commands", value: "commands" })
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("snapshot")
        .setDescription("Toggle daily snapshot cron")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.snapshot.desc"))
        .addBooleanOption((opt) => opt
        .setName("enabled")
        .setDescription("Enable or disable")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.snapshot.enabled.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("view")
        .setDescription("View current audit config")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.setup.view.desc"))))
        .addSubcommandGroup((group) => group
        .setName("query")
        .setDescription("Query audit data")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.desc"))
        .addSubcommand((sub) => sub
        .setName("guilds")
        .setDescription("List all guilds the bot is currently in")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.guilds.desc"))
        .addIntegerOption((opt) => opt
        .setName("page")
        .setDescription("Page number")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.guilds.page.desc"))
        .setMinValue(1)))
        .addSubcommand((sub) => sub
        .setName("guild")
        .setDescription("Detailed info for one guild")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.guild.desc"))
        .addStringOption((opt) => opt
        .setName("target")
        .setDescription("Guild ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.guild.target.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("history")
        .setDescription("Recent join/leave events")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.history.desc"))
        .addIntegerOption((opt) => opt
        .setName("limit")
        .setDescription("Number of entries (1-25)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.history.limit.desc"))
        .setMinValue(1)
        .setMaxValue(25)))
        .addSubcommand((sub) => sub
        .setName("summary")
        .setDescription("Realtime summary of all guilds")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.audit.query.summary.desc")))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: "Guild only.", flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand(true);
        if (group === "setup") {
            return handleSetup(interaction, sub);
        }
        if (group === "query") {
            return handleQuery(interaction, sub);
        }
        await interaction.editReply("Unknown subcommand.");
    },
};
async function handleSetup(interaction, sub) {
    const userId = interaction.user.id;
    switch (sub) {
        case "critical-channel":
        case "commands-channel": {
            const channel = interaction.options.getChannel("channel", true);
            const botId = interaction.client.user?.id ?? "";
            if (!botHasRequiredPerms(channel, botId)) {
                await interaction.editReply("Bot is missing ViewChannel/SendMessages/EmbedLinks in that channel.");
                return;
            }
            if (sub === "critical-channel") {
                await auditConfig_service_1.AuditConfigService.setCriticalChannel(channel.id, userId);
            }
            else {
                await auditConfig_service_1.AuditConfigService.setCommandsChannel(channel.id, userId);
            }
            auditDispatcher_service_1.AuditDispatcherService.invalidateChannelCache();
            await interaction.editReply(`Saved. ${sub} → <#${channel.id}>`);
            return;
        }
        case "clear": {
            const target = interaction.options.getString("target", true);
            await auditConfig_service_1.AuditConfigService.clearChannel(target, userId);
            auditDispatcher_service_1.AuditDispatcherService.invalidateChannelCache();
            await interaction.editReply(`Cleared ${target} channel.`);
            return;
        }
        case "snapshot": {
            const enabled = interaction.options.getBoolean("enabled", true);
            await auditConfig_service_1.AuditConfigService.setSnapshotEnabled(enabled, userId);
            await interaction.editReply(`Snapshot cron ${enabled ? "enabled" : "disabled"}.`);
            return;
        }
        case "view": {
            const config = await auditConfig_service_1.AuditConfigService.getConfig();
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("Audit config")
                .setColor(0x3b82f6)
                .addFields({
                name: "Critical channel",
                value: config.criticalChannelId ? `<#${config.criticalChannelId}>` : "not set",
                inline: false,
            }, {
                name: "Commands channel",
                value: config.commandsChannelId ? `<#${config.commandsChannelId}>` : "not set",
                inline: false,
            }, { name: "Snapshot enabled", value: String(config.snapshotEnabled), inline: true }, { name: "Updated by", value: config.updatedBy ? `<@${config.updatedBy}>` : "—", inline: true })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        default:
            await interaction.editReply("Unknown setup subcommand.");
    }
}
async function handleQuery(interaction, sub) {
    switch (sub) {
        case "guilds": {
            const page = interaction.options.getInteger("page") ?? 1;
            const pageSize = 10;
            const [docs, total] = await Promise.all([
                guildAudit_model_1.default.find({ currentlyIn: true })
                    .sort({ memberCount: -1 })
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .lean(),
                guildAudit_model_1.default.countDocuments({ currentlyIn: true }),
            ]);
            const lines = docs
                .map((d, i) => `${(page - 1) * pageSize + i + 1}. **${d.name}** — ${d.memberCount.toLocaleString()} members (id: \`${d.guildId}\`, owner: \`${d.ownerId}\`)`)
                .join("\n") || "No guilds.";
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`Guilds (page ${page} / ${Math.max(1, Math.ceil(total / pageSize))})`)
                .setDescription(lines)
                .setFooter({ text: `Total: ${total}` })
                .setColor(0x3b82f6)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "guild": {
            const guildId = interaction.options.getString("target", true);
            const doc = await guildAudit_model_1.default.findOne({ guildId }).lean();
            if (!doc) {
                await interaction.editReply("No GuildAudit record for that ID.");
                return;
            }
            const snaps = await guildSnapshot_model_1.default.find({ guildId })
                .sort({ takenAt: -1 })
                .limit(30)
                .lean();
            const memberCounts = snaps.slice().reverse().map((s) => s.memberCount);
            const chart = sparkline(memberCounts);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`Guild: ${doc.name}`)
                .setColor(doc.currentlyIn ? 0x22c55e : 0xef4444)
                .setThumbnail(doc.iconURL ?? null)
                .addFields({ name: "Guild ID", value: doc.guildId, inline: true }, { name: "Owner", value: doc.ownerId, inline: true }, { name: "Currently in", value: String(doc.currentlyIn), inline: true }, { name: "Members", value: doc.memberCount.toLocaleString(), inline: true }, { name: "Joined", value: `<t:${Math.floor(doc.joinedAt.getTime() / 1000)}:R>`, inline: true }, {
                name: "Left",
                value: doc.leftAt ? `<t:${Math.floor(doc.leftAt.getTime() / 1000)}:R>` : "—",
                inline: true,
            }, { name: `Last ${memberCounts.length} snapshots`, value: chart || "—", inline: false })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "history": {
            const limit = interaction.options.getInteger("limit") ?? 20;
            const docs = await guildAudit_model_1.default.find()
                .sort({ updatedAt: -1 })
                .limit(limit)
                .lean();
            const lines = docs
                .map((d) => {
                const icon = d.currentlyIn ? "🟢" : "🔴";
                const when = d.currentlyIn ? d.joinedAt : (d.leftAt ?? d.updatedAt);
                return `${icon} **${d.name}** — <t:${Math.floor(when.getTime() / 1000)}:R>`;
            })
                .join("\n") || "No history.";
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("Guild history")
                .setDescription(lines)
                .setColor(0x3b82f6)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        case "summary": {
            const client = interaction.client;
            const guilds = Array.from(client.guilds.cache.values());
            const totalMembers = guilds.reduce((s, g) => s + g.memberCount, 0);
            const top10 = guilds
                .slice()
                .sort((a, b) => b.memberCount - a.memberCount)
                .slice(0, 10)
                .map((g, i) => `${i + 1}. **${g.name}** — ${g.memberCount.toLocaleString()}`)
                .join("\n") || "—";
            const everLeft = await guildAudit_model_1.default.countDocuments({ currentlyIn: false });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("Realtime summary")
                .setColor(0xeab308)
                .addFields({ name: "Total guilds", value: String(guilds.length), inline: true }, { name: "Total members", value: totalMembers.toLocaleString(), inline: true }, { name: "Ever-left guilds", value: String(everLeft), inline: true }, { name: "Top 10", value: top10, inline: false })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        default:
            await interaction.editReply("Unknown query subcommand.");
    }
}
