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

export default {
    data: new SlashCommandBuilder()
        .setName("xp")
        .setDescription("XP management (admin)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("Set a user's XP")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add XP to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to add").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove XP from a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to remove").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("channel-blacklist")
                .setDescription("Manage XP channel blacklist")
                .addSubcommand((sub) =>
                    sub
                        .setName("add")
                        .setDescription("Blacklist a channel from XP")
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to blacklist").setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("remove")
                        .setDescription("Remove a channel from blacklist")
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to remove").setRequired(true)
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guildId = interaction.guildId!;
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommandGroup === "channel-blacklist") {
                await handleChannelBlacklist(interaction, guildId, subcommand);
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

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Set XP for <@${target.id}>:\n` +
                            `**${oldXP.toLocaleString()}** XP (Level ${oldLevel}) → **${amount.toLocaleString()}** XP (Level ${newLevel})`
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

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** XP to <@${target.id}>\n` +
                            `Total: **${updated.xp.toLocaleString()}** XP (Level ${newLevel})`
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

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Removed **${amount.toLocaleString()}** XP from <@${target.id}>\n` +
                            `Total: **${newXP.toLocaleString()}** XP (Level ${newLevel})`
                        )
                        .setColor(0xed4245);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};

async function handleChannelBlacklist(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    subcommand: string
): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    const config = await GuildXPConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    if (subcommand === "add") {
        if (config.blacklistedChannels.includes(channel.id)) {
            await interaction.editReply(`<#${channel.id}> đã có trong blacklist.`);
            return;
        }

        config.blacklistedChannels.push(channel.id);
        await config.save();
    } else if (subcommand === "remove") {
        const index = config.blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
            await interaction.editReply(`<#${channel.id}> không có trong blacklist.`);
            return;
        }

        config.blacklistedChannels.splice(index, 1);
        await config.save();
    }

    const list = config.blacklistedChannels.length > 0
        ? config.blacklistedChannels.map((id) => `<#${id}>`).join(", ")
        : "Không có";

    const embed = new EmbedBuilder()
        .setTitle("📋 XP Channel Blacklist")
        .setDescription(list)
        .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
}
