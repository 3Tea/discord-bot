"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const config_1 = require("../../util/config");
const button_1 = require("../../util/config/button");
const helpers_1 = require("../../util/voice/helpers");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const TTL_12H = 60 * 60 * 12;
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel management")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.desc"))
        .addSubcommand((sub) => sub
        .setName("limit")
        .setDescription("Set the user limit for the voice channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.limit.desc"))
        .addIntegerOption((opt) => opt
        .setName("number")
        .setDescription("Number of users (0-99)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.limit.number.desc"))
        .setMinValue(0)
        .setMaxValue(99)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("name")
        .setDescription("Change the voice channel name")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.name.desc"))
        .addStringOption((opt) => opt
        .setName("string")
        .setDescription("New name")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.name.string.desc"))
        .setMaxLength(50)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("lock")
        .setDescription("Lock the voice channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.lock.desc")))
        .addSubcommand((sub) => sub
        .setName("unlock")
        .setDescription("Unlock the voice channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.unlock.desc")))
        .addSubcommand((sub) => sub
        .setName("hide")
        .setDescription("Hide the voice channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.hide.desc")))
        .addSubcommand((sub) => sub
        .setName("permit")
        .setDescription("Permit a user to join")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.permit.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to permit")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.permit.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("block")
        .setDescription("Block a user from the channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.block.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to block")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.block.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("kick")
        .setDescription("Kick a user from the voice channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.kick.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to kick")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.kick.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("transfer")
        .setDescription("Transfer channel ownership")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.transfer.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("New owner")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.voice.transfer.user.desc"))
        .setRequired(true))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const member = interaction.member;
        const voiceChannel = member?.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: (0, t_1.t)(locale, "voice.not_in_channel"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const ownerId = await redis_1.default.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({
                content: (0, t_1.t)(locale, "voice.not_owner"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand(true);
        try {
            switch (subcommand) {
                case "limit": {
                    const cdKey = `setUserLimit:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const limit = interaction.options.getInteger("number", true);
                    await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${config_1.FOOTER.text}`);
                    await (0, helpers_1.setCooldown)(cdKey, 120);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.limit_set", { limit }),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "name": {
                    const cdKey = `setVoiceName:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const name = interaction.options.getString("string", true);
                    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                    await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${config_1.FOOTER.text}`);
                    await (0, helpers_1.setCooldown)(cdKey, 120);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.editReply({
                        content: (0, t_1.t)(locale, "voice.renamed", { name }),
                    });
                    break;
                }
                case "lock": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const everyone = interaction.guild.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: true });
                    await redis_1.default.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.locked"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "unlock": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const everyone = interaction.guild.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null, ViewChannel: true });
                    await redis_1.default.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.unlocked"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "hide": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const everyone = interaction.guild.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: false });
                    await redis_1.default.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.hidden"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "permit": {
                    const cdKey = `cd:permit:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "voice.permit_self"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await voiceChannel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
                    const permitted = (await redis_1.default.getJson(`permitted:${voiceChannel.id}`)) || [];
                    if (!permitted.includes(target.id)) {
                        permitted.push(target.id);
                        await redis_1.default.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                    }
                    const blocked = (await redis_1.default.getJson(`blocked:${voiceChannel.id}`)) || [];
                    const bi = blocked.indexOf(target.id);
                    if (bi !== -1) {
                        blocked.splice(bi, 1);
                        await redis_1.default.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                    }
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.permitted", { userId: target.id }),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "block": {
                    const cdKey = `cd:block:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "voice.block_self"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
                    const blocked = (await redis_1.default.getJson(`blocked:${voiceChannel.id}`)) || [];
                    if (!blocked.includes(target.id)) {
                        blocked.push(target.id);
                        await redis_1.default.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                    }
                    const permitted = (await redis_1.default.getJson(`permitted:${voiceChannel.id}`)) || [];
                    const pi = permitted.indexOf(target.id);
                    if (pi !== -1) {
                        permitted.splice(pi, 1);
                        await redis_1.default.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                    }
                    const targetMember = voiceChannel.members.get(target.id);
                    if (targetMember) {
                        await targetMember.voice.disconnect("Blocked by channel owner");
                    }
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.blocked", { userId: target.id }),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "kick": {
                    const cdKey = `cd:kick:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "voice.kick_self"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    const targetMember = voiceChannel.members.get(target.id);
                    if (!targetMember) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "voice.kick_not_in_channel"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await redis_1.default.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, target.id, 30);
                    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId(button_1.BUTTON_ID.VOICE_KICK_ONLY)
                        .setLabel((0, t_1.t)(locale, "voice.btn.kick"))
                        .setEmoji("👢")
                        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
                        .setCustomId(button_1.BUTTON_ID.VOICE_KICK_BLOCK)
                        .setLabel((0, t_1.t)(locale, "voice.btn.kick_block"))
                        .setEmoji("🚫")
                        .setStyle(discord_js_1.ButtonStyle.Danger));
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.kick_confirm", { userId: target.id }),
                        components: [row],
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "transfer": {
                    const cdKey = `cd:transfer:${voiceChannel.id}`;
                    if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
                        return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "voice.transfer_self"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await redis_1.default.setJson(voiceChannel.id, target.id, TTL_12H);
                    await redis_1.default.deleteKey(`permitted:${voiceChannel.id}`);
                    await redis_1.default.deleteKey(`blocked:${voiceChannel.id}`);
                    await (0, helpers_1.setCooldown)(cdKey, 5);
                    await (0, helpers_1.updatePanel)(voiceChannel, locale);
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.transferred", { userId: target.id }),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    break;
                }
                default:
                    break;
            }
        }
        catch (error) {
            console.error("Voice command error:", error);
            const errorMsg = (0, t_1.t)(locale, "common.error");
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMsg, flags: discord_js_1.MessageFlags.Ephemeral });
            }
            else {
                await interaction.reply({ content: errorMsg, flags: discord_js_1.MessageFlags.Ephemeral });
            }
        }
    },
};
