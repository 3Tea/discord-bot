import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import GuildXPConfigModel from "../../models/guildXPConfig.model";
import { levelFromXP } from "../../util/xp/calculator";
import { syncGlobalXP } from "../../util/xp/globalXP";
import { syncSnapshots } from "../../util/xp/snapshotSync";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

export default {
    data: new SlashCommandBuilder()
        .setName("xp")
        .setDescription("XP management (admin)")
        .setDescriptionLocalizations(descriptionLocales("cmd.xp.desc"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("Set a user's XP")
                .setDescriptionLocalizations(descriptionLocales("cmd.xp.set.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.set.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("XP amount")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.set.amount.desc"))
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add XP to a user")
                .setDescriptionLocalizations(descriptionLocales("cmd.xp.add.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.add.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("XP to add")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.add.amount.desc"))
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove XP from a user")
                .setDescriptionLocalizations(descriptionLocales("cmd.xp.remove.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.remove.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("XP to remove")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.remove.amount.desc"))
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("channel-blacklist")
                .setDescription("Manage XP channel blacklist")
                .setDescriptionLocalizations(descriptionLocales("cmd.xp.channel-blacklist.desc"))
                .addSubcommand((sub) =>
                    sub
                        .setName("add")
                        .setDescription("Blacklist a channel from XP")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.channel-blacklist.add.desc"))
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Channel to blacklist")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.xp.channel-blacklist.add.channel.desc")
                                )
                                .setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("remove")
                        .setDescription("Remove a channel from blacklist")
                        .setDescriptionLocalizations(descriptionLocales("cmd.xp.channel-blacklist.remove.desc"))
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Channel to remove")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.xp.channel-blacklist.remove.channel.desc")
                                )
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const guildId = interaction.guildId!;
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommandGroup === "channel-blacklist") {
                await handleChannelBlacklist(interaction, guildId, subcommand, locale);
                return;
            }

            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            switch (subcommand) {
                case "set": {
                    const oldMember = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const oldXP = oldMember?.xp ?? 0;
                    const oldLevel = oldMember?.level ?? 0;
                    const newLevel = levelFromXP(amount);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: amount, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    // Sync global XP delta
                    const delta = amount - oldXP;
                    await syncGlobalXP(target.id, delta);

                    // Sync period snapshots with delta
                    await syncSnapshots(target.id, guildId, delta, "admin");

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.set", {
                                userId: target.id,
                                oldXP: oldXP.toLocaleString(),
                                oldLevel,
                                newXP: amount.toLocaleString(),
                                newLevel,
                            })
                        )
                        .setColor(0x5865f2);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "add": {
                    const updated = await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $inc: { xp: amount },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                level: 0,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true, new: true }
                    );

                    const newLevel = levelFromXP(updated.xp);
                    if (newLevel > updated.level) {
                        await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    }

                    // Sync global XP
                    await syncGlobalXP(target.id, amount);

                    // Sync period snapshots
                    await syncSnapshots(target.id, guildId, amount, "admin");

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.add", {
                                userId: target.id,
                                amount: amount.toLocaleString(),
                                total: updated.xp.toLocaleString(),
                                level: newLevel,
                            })
                        )
                        .setColor(0x57f287);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "remove": {
                    const member = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const currentXP = member?.xp ?? 0;
                    const newXP = Math.max(0, currentXP - amount);
                    const newLevel = levelFromXP(newXP);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: newXP, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    // Sync global XP (negative delta, clamped in syncGlobalXP)
                    const actualRemoved = currentXP - newXP;
                    await syncGlobalXP(target.id, -actualRemoved);

                    // Sync period snapshots (negative delta)
                    await syncSnapshots(target.id, guildId, -actualRemoved, "admin");

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.remove", {
                                userId: target.id,
                                amount: amount.toLocaleString(),
                                total: newXP.toLocaleString(),
                                level: newLevel,
                            })
                        )
                        .setColor(0xed4245);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch {
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};

async function handleChannelBlacklist(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    subcommand: string,
    locale: SupportedLocale
): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    const config = await GuildXPConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    if (subcommand === "add") {
        if (config.blacklistedChannels.includes(channel.id)) {
            await interaction.editReply(t(locale, "xp.blacklist.already_in", { channelId: channel.id }));
            return;
        }

        config.blacklistedChannels.push(channel.id);
        await config.save();
    } else if (subcommand === "remove") {
        const index = config.blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
            await interaction.editReply(t(locale, "xp.blacklist.not_in", { channelId: channel.id }));
            return;
        }

        config.blacklistedChannels.splice(index, 1);
        await config.save();
    }

    const list =
        config.blacklistedChannels.length > 0
            ? config.blacklistedChannels.map((id) => `<#${id}>`).join(", ")
            : t(locale, "xp.blacklist.empty");

    const embed = new EmbedBuilder()
        .setTitle(`📋 ${t(locale, "xp.blacklist.title")}`)
        .setDescription(list)
        .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
}
