// src/commands/slash/guild-admin.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import BranchService from "../../services/rpg/branch.service";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

// --- /guild-admin setup ---

async function handleSetup(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const guildId = interaction.guildId!;
    const name = interaction.options.getString("name") ?? interaction.guild!.name;

    // Check if branch already exists
    const existing = await BranchService.getBranch(guildId);
    if (existing) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "branch.setup.already_exists"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    await BranchService.createBranch(guildId, name);

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "branch.setup.title"))
        .setDescription(t(locale, "branch.setup.desc", { name }))
        .setColor(0x57f287)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

// --- /guild-admin config ---

async function handleConfig(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const guildId = interaction.guildId!;
    const branch = await BranchService.getBranch(guildId);

    if (!branch) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "branch.not_setup"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Show current config
    const channelDisplay = branch.questChannelId
        ? `<#${branch.questChannelId}>`
        : "—";

    const configEmbed = new EmbedBuilder()
        .setTitle(t(locale, "branch.config.title"))
        .setDescription([
            `**${branch.name}**`,
            `Quest Channel: ${channelDisplay}`,
        ].join("\n"))
        .setColor(0x3498db);

    const channelSelectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId("branch_config_channel")
            .setPlaceholder("Select quest channel")
            .setChannelTypes(ChannelType.GuildText)
    );

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
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedChannelId = selectInteraction.values[0];
    await BranchService.setQuestChannel(guildId, selectedChannelId);

    const successEmbed = new EmbedBuilder()
        .setTitle(t(locale, "branch.config.title"))
        .setDescription(t(locale, "branch.config.channel_set", { channel: selectedChannelId }))
        .setColor(0x57f287);

    await selectInteraction.update({ embeds: [successEmbed], components: [] });
}

// --- /guild-admin disband ---

async function handleDisband(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const guildId = interaction.guildId!;
    const branch = await BranchService.getBranch(guildId);

    if (!branch) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "branch.not_setup"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Confirmation prompt
    const confirmEmbed = new EmbedBuilder()
        .setDescription(t(locale, "branch.disband.confirm", { name: branch.name }))
        .setColor(0xe67e22);

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("branch_disband_confirm")
            .setLabel("\u2705")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("branch_disband_cancel")
            .setLabel("\u274c")
            .setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    // Await confirmation (30s)
    const btnInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("branch_disband_"),
            time: 30_000,
        })
        .catch(() => null);

    if (!btnInteraction || btnInteraction.customId !== "branch_disband_confirm") {
        const cancelEmbed = new EmbedBuilder()
            .setDescription(t(locale, "branch.disband.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    await BranchService.deleteBranch(guildId);

    const successEmbed = new EmbedBuilder()
        .setDescription(t(locale, "branch.disband.success"))
        .setColor(0x57f287);

    await btnInteraction.update({ embeds: [successEmbed], components: [] });
}

// --- Command definition ---

export default {
    data: new SlashCommandBuilder()
        .setName("guild-admin")
        .setDescription("Manage branch guild settings (Admin only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.guild_admin.desc"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("setup")
                .setDescription("Set up a branch guild for this server")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild_admin.setup.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("Branch guild name (default: server name)")
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("config")
                .setDescription("Configure branch guild settings")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild_admin.config.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("disband")
                .setDescription("Disband this server's branch guild")
                .setDescriptionLocalizations(descriptionLocales("cmd.guild_admin.disband.desc"))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();
        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
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
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await Reply.embedEdit(interaction, embed);
                }
            }
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            await Reply.embedEdit(interaction, embed);
        }
    },
};
