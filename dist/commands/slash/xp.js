"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const guildXPConfig_model_1 = __importDefault(require("../../models/guildXPConfig.model"));
const calculator_1 = require("../../util/xp/calculator");
const globalXP_1 = require("../../util/xp/globalXP");
const snapshotSync_1 = require("../../util/xp/snapshotSync");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const index_1 = require("../../util/config/index");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("xp")
        .setDescription("XP management (admin)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.desc"))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) => sub
        .setName("set")
        .setDescription("Set a user's XP")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.set.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.set.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("XP amount")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.set.amount.desc"))
        .setMinValue(0)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("add")
        .setDescription("Add XP to a user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.add.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.add.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("XP to add")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.add.amount.desc"))
        .setMinValue(1)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("remove")
        .setDescription("Remove XP from a user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.remove.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.remove.user.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("amount")
        .setDescription("XP to remove")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.remove.amount.desc"))
        .setMinValue(1)
        .setRequired(true)))
        .addSubcommandGroup((group) => group
        .setName("channel-blacklist")
        .setDescription("Manage XP channel blacklist")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.channel-blacklist.desc"))
        .addSubcommand((sub) => sub
        .setName("add")
        .setDescription("Blacklist a channel from XP")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.channel-blacklist.add.desc"))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Channel to blacklist")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.channel-blacklist.add.channel.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("remove")
        .setDescription("Remove a channel from blacklist")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.channel-blacklist.remove.desc"))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Channel to remove")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.xp.channel-blacklist.remove.channel.desc"))
        .setRequired(true)))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        try {
            const guildId = interaction.guildId;
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand(true);
            if (subcommandGroup === "channel-blacklist") {
                await handleChannelBlacklist(interaction, guildId, subcommand, locale);
                return;
            }
            // XP set/add/remove restricted to bot developer only
            if (interaction.user.id !== index_1.DEV_USER_ID) {
                await interaction.editReply((0, t_1.t)(locale, "common.no_permission"));
                return;
            }
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            switch (subcommand) {
                case "set": {
                    const oldMember = await memberXP_model_1.default.findOne({ guildId, userId: target.id });
                    const oldXP = oldMember?.xp ?? 0;
                    const oldLevel = oldMember?.level ?? 0;
                    const newLevel = (0, calculator_1.levelFromXP)(amount);
                    await memberXP_model_1.default.findOneAndUpdate({ guildId, userId: target.id }, {
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
                    }, { upsert: true });
                    // Sync global XP delta
                    const delta = amount - oldXP;
                    await (0, globalXP_1.syncGlobalXP)(target.id, delta);
                    // Sync period snapshots with delta
                    await (0, snapshotSync_1.syncSnapshots)(target.id, guildId, delta, "admin");
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "xp.set", {
                        userId: target.id,
                        oldXP: oldXP.toLocaleString(),
                        oldLevel,
                        newXP: amount.toLocaleString(),
                        newLevel,
                    }))
                        .setColor(0x5865f2);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "add": {
                    const updated = await memberXP_model_1.default.findOneAndUpdate({ guildId, userId: target.id }, {
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
                    }, { upsert: true, new: true });
                    const newLevel = (0, calculator_1.levelFromXP)(updated.xp);
                    if (newLevel > updated.level) {
                        await memberXP_model_1.default.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    }
                    // Sync global XP
                    await (0, globalXP_1.syncGlobalXP)(target.id, amount);
                    // Sync period snapshots
                    await (0, snapshotSync_1.syncSnapshots)(target.id, guildId, amount, "admin");
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "xp.add", {
                        userId: target.id,
                        amount: amount.toLocaleString(),
                        total: updated.xp.toLocaleString(),
                        level: newLevel,
                    }))
                        .setColor(0x57f287);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "remove": {
                    const member = await memberXP_model_1.default.findOne({ guildId, userId: target.id });
                    const currentXP = member?.xp ?? 0;
                    const newXP = Math.max(0, currentXP - amount);
                    const newLevel = (0, calculator_1.levelFromXP)(newXP);
                    await memberXP_model_1.default.findOneAndUpdate({ guildId, userId: target.id }, {
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
                    }, { upsert: true });
                    // Sync global XP (negative delta, clamped in syncGlobalXP)
                    const actualRemoved = currentXP - newXP;
                    await (0, globalXP_1.syncGlobalXP)(target.id, -actualRemoved);
                    // Sync period snapshots (negative delta)
                    await (0, snapshotSync_1.syncSnapshots)(target.id, guildId, -actualRemoved, "admin");
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "xp.remove", {
                        userId: target.id,
                        amount: amount.toLocaleString(),
                        total: newXP.toLocaleString(),
                        level: newLevel,
                    }))
                        .setColor(0xed4245);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
async function handleChannelBlacklist(interaction, guildId, subcommand, locale) {
    const channel = interaction.options.getChannel("channel", true);
    const config = await guildXPConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
    if (subcommand === "add") {
        if (config.blacklistedChannels.includes(channel.id)) {
            await interaction.editReply((0, t_1.t)(locale, "xp.blacklist.already_in", { channelId: channel.id }));
            return;
        }
        config.blacklistedChannels.push(channel.id);
        await config.save();
    }
    else if (subcommand === "remove") {
        const index = config.blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
            await interaction.editReply((0, t_1.t)(locale, "xp.blacklist.not_in", { channelId: channel.id }));
            return;
        }
        config.blacklistedChannels.splice(index, 1);
        await config.save();
    }
    const list = config.blacklistedChannels.length > 0
        ? config.blacklistedChannels.map((id) => `<#${id}>`).join(", ")
        : (0, t_1.t)(locale, "xp.blacklist.empty");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`📋 ${(0, t_1.t)(locale, "xp.blacklist.title")}`)
        .setDescription(list)
        .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
}
