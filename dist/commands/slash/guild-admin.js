"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/commands/slash/guild-admin.ts
const discord_js_1 = require("discord.js");
const branch_service_1 = __importDefault(require("../../services/rpg/branch.service"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
// --- /guild-admin setup ---
async function handleSetup(interaction, locale) {
    const guildId = interaction.guildId;
    const name = interaction.options.getString("name") ?? interaction.guild.name;
    // Check if branch already exists
    const existing = await branch_service_1.default.getBranch(guildId);
    if (existing) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.setup.already_exists")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    await branch_service_1.default.createBranch(guildId, name);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "branch.setup.title"))
        .setDescription((0, t_1.t)(locale, "branch.setup.desc", { name }))
        .setColor(0x57f287)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /guild-admin config ---
async function handleConfig(interaction, locale) {
    const guildId = interaction.guildId;
    const branch = await branch_service_1.default.getBranch(guildId);
    if (!branch) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.not_setup")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Show current config
    const channelDisplay = branch.questChannelId ? `<#${branch.questChannelId}>` : "—";
    const configEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "branch.config.title"))
        .setDescription([`**${branch.name}**`, `Quest Channel: ${channelDisplay}`].join("\n"))
        .setColor(0x3498db);
    const channelSelectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ChannelSelectMenuBuilder()
        .setCustomId("branch_config_channel")
        .setPlaceholder("Select quest channel")
        .setChannelTypes(discord_js_1.ChannelType.GuildText));
    const message = await interaction.editReply({
        embeds: [configEmbed],
        components: [channelSelectRow],
    });
    // Await channel selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "branch_config_channel",
        time: 60_000,
    })
        .catch(() => null);
    if (!selectInteraction || !selectInteraction.isChannelSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const selectedChannelId = selectInteraction.values[0];
    await branch_service_1.default.setQuestChannel(guildId, selectedChannelId);
    const successEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "branch.config.title"))
        .setDescription((0, t_1.t)(locale, "branch.config.channel_set", { channel: selectedChannelId }))
        .setColor(0x57f287);
    await selectInteraction.update({ embeds: [successEmbed], components: [] });
}
// --- /guild-admin disband ---
async function handleDisband(interaction, locale) {
    const guildId = interaction.guildId;
    const branch = await branch_service_1.default.getBranch(guildId);
    if (!branch) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.not_setup")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Confirmation prompt
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setDescription((0, t_1.t)(locale, "branch.disband.confirm", { name: branch.name }))
        .setColor(0xe67e22);
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("branch_disband_confirm").setLabel("\u2705").setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId("branch_disband_cancel").setLabel("\u274c").setStyle(discord_js_1.ButtonStyle.Secondary));
    const message = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });
    // Await confirmation (30s)
    const btnInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("branch_disband_"),
        time: 30_000,
    })
        .catch(() => null);
    if (!btnInteraction || btnInteraction.customId !== "branch_disband_confirm") {
        const cancelEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.disband.cancelled")).setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => { });
        return;
    }
    await branch_service_1.default.deleteBranch(guildId);
    const successEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "branch.disband.success")).setColor(0x57f287);
    await btnInteraction.update({ embeds: [successEmbed], components: [] });
}
// --- Command definition ---
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("guild-admin")
        .setDescription("Manage branch guild settings (Admin only)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild_admin.desc"))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .addSubcommand((sub) => sub
        .setName("setup")
        .setDescription("Set up a branch guild for this server")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild_admin.setup.desc"))
        .addStringOption((opt) => opt.setName("name").setDescription("Branch guild name (default: server name)")))
        .addSubcommand((sub) => sub
        .setName("config")
        .setDescription("Configure branch guild settings")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild_admin.config.desc")))
        .addSubcommand((sub) => sub
        .setName("disband")
        .setDescription("Disband this server's branch guild")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.guild_admin.disband.desc"))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        const subcommand = interaction.options.getSubcommand(true);
        try {
            switch (subcommand) {
                case "setup":
                    await handleSetup(interaction, locale);
                    return;
                case "config":
                    await handleConfig(interaction, locale);
                    return;
                case "disband":
                    await handleDisband(interaction, locale);
                    return;
                default: {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await reply_1.default.embedEdit(interaction, embed);
                }
            }
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
        }
    },
};
