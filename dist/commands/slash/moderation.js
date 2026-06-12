"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
/** Discord API max length for timeout / ban / kick / unban audit reasons. */
const MAX_MODERATION_REASON_LENGTH = 512;
const SNOWFLAKE_RE = /^\d{17,20}$/;
function fallbackLocale() {
    return "en";
}
function durationToMs(amount, unit) {
    switch (unit) {
        case "minutes":
            return amount * 60 * 1000;
        case "hours":
            return amount * 60 * 60 * 1000;
        case "days":
            return amount * 24 * 60 * 60 * 1000;
        default: {
            const _exhaustive = unit;
            return _exhaustive;
        }
    }
}
function formatDuration(locale, ms) {
    const totalMinutes = Math.round(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days > 0)
        parts.push((0, t_1.t)(locale, "moderation.fmt.days", { total: days }));
    if (hours > 0)
        parts.push((0, t_1.t)(locale, "moderation.fmt.hours", { total: hours }));
    if (minutes > 0 || parts.length === 0)
        parts.push((0, t_1.t)(locale, "moderation.fmt.minutes", { total: minutes }));
    return parts.join(" ");
}
function ephemeralError(interaction, locale, key, vars) {
    return interaction.editReply({
        content: (0, t_1.t)(locale, key, vars),
    });
}
/**
 * Truncates optional reason so Discord API calls do not fail on length limits.
 * Long input is cut at MAX_MODERATION_REASON_LENGTH without surfacing a separate error.
 */
function normalizeModerationReason(reason) {
    if (reason === null || reason === undefined) {
        return undefined;
    }
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (trimmed.length <= MAX_MODERATION_REASON_LENGTH) {
        return trimmed;
    }
    return trimmed.slice(0, MAX_MODERATION_REASON_LENGTH);
}
/**
 * Returns whether the executor may moderate the target based on guild ownership and role position.
 * Guild owner bypasses role checks; non-owners cannot moderate the owner; otherwise target's highest
 * role must be strictly below the executor's highest role.
 */
function invokerCanModerateTarget(guild, executor, target) {
    if (executor.id === guild.ownerId) {
        return true;
    }
    if (target.id === guild.ownerId) {
        return false;
    }
    return target.roles.highest.position < executor.roles.highest.position;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("moderation")
        .setDescription("Server moderation (timeout, ban, kick, unban)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.desc"))
        .addSubcommand((sub) => sub
        .setName("timeout")
        .setDescription("Timeout a member (mute text and voice) for a duration")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.timeout.desc"))
        .addUserOption((o) => o
        .setName("user")
        .setDescription("Member to timeout")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.timeout.user.desc"))
        .setRequired(true))
        .addIntegerOption((o) => o
        .setName("duration")
        .setDescription("Duration amount (min 1)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.timeout.duration.desc"))
        .setMinValue(1)
        .setRequired(true))
        .addStringOption((o) => o
        .setName("unit")
        .setDescription("Time unit")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.timeout.unit.desc"))
        .setRequired(true)
        .addChoices({ name: "minutes", value: "minutes" }, { name: "hours", value: "hours" }, { name: "days", value: "days" }))
        .addStringOption((o) => o
        .setName("reason")
        .setDescription("Reason (optional)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.timeout.reason.desc"))
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("untimeout")
        .setDescription("Remove an active timeout")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.untimeout.desc"))
        .addUserOption((o) => o
        .setName("user")
        .setDescription("Member to remove timeout from")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.untimeout.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("ban")
        .setDescription("Ban a member from the server")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.ban.desc"))
        .addUserOption((o) => o
        .setName("user")
        .setDescription("Member to ban")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.ban.user.desc"))
        .setRequired(true))
        .addStringOption((o) => o
        .setName("reason")
        .setDescription("Reason (optional)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.ban.reason.desc"))
        .setRequired(false))
        .addIntegerOption((o) => o
        .setName("delete_messages")
        .setDescription("Delete recent messages (seconds, max 7 days)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.ban.delete_messages.desc"))
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(604800)))
        .addSubcommand((sub) => sub
        .setName("kick")
        .setDescription("Kick a member from the server")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.kick.desc"))
        .addUserOption((o) => o
        .setName("user")
        .setDescription("Member to kick")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.kick.user.desc"))
        .setRequired(true))
        .addStringOption((o) => o
        .setName("reason")
        .setDescription("Reason (optional)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.kick.reason.desc"))
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("unban")
        .setDescription("Unban a user by ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.unban.desc"))
        .addStringOption((o) => o
        .setName("user_id")
        .setDescription("Banned user's snowflake ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.unban.user_id.desc"))
        .setRequired(true))
        .addStringOption((o) => o
        .setName("reason")
        .setDescription("Reason (optional)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.moderation.unban.reason.desc"))
        .setRequired(false))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        if (!interaction.inGuild() || !interaction.guild) {
            return interaction.reply({
                content: (0, t_1.t)(locale, "common.guild_only"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand(true);
        const executor = interaction.member;
        if (!executor) {
            return ephemeralError(interaction, locale, "moderation.missing_member");
        }
        const execMember = executor;
        try {
            if (sub === "timeout") {
                if (!execMember.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_moderate");
                }
                const targetUser = interaction.options.getUser("user", true);
                if (targetUser.id === interaction.user.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_self");
                }
                if (targetUser.bot) {
                    return ephemeralError(interaction, locale, "moderation.no_target_bot");
                }
                const amount = interaction.options.getInteger("duration", true);
                const unit = interaction.options.getString("unit", true);
                const reason = normalizeModerationReason(interaction.options.getString("reason"));
                const ms = durationToMs(amount, unit);
                if (ms <= 0) {
                    return ephemeralError(interaction, locale, "moderation.duration_invalid");
                }
                if (ms > MAX_TIMEOUT_MS) {
                    return ephemeralError(interaction, locale, "moderation.duration_too_long");
                }
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return ephemeralError(interaction, locale, "moderation.member_not_found");
                }
                if (!invokerCanModerateTarget(interaction.guild, execMember, member)) {
                    if (member.id === interaction.guild.ownerId) {
                        return ephemeralError(interaction, locale, "moderation.cannot_moderate_owner");
                    }
                    return ephemeralError(interaction, locale, "moderation.invoker_hierarchy");
                }
                const botMember = await interaction.guild.members.fetchMe();
                if (!member.moderatable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }
                if (!botMember.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }
                await member.timeout(ms, reason);
                const embed = new discord_js_1.EmbedBuilder().setColor(0x57f287).setDescription((0, t_1.t)(locale, "moderation.timeout_success", {
                    username: member.user.tag,
                    duration: formatDuration(locale, ms),
                }));
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (sub === "untimeout") {
                if (!execMember.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_moderate");
                }
                const targetUser = interaction.options.getUser("user", true);
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return ephemeralError(interaction, locale, "moderation.member_not_found");
                }
                if (!invokerCanModerateTarget(interaction.guild, execMember, member)) {
                    if (member.id === interaction.guild.ownerId) {
                        return ephemeralError(interaction, locale, "moderation.cannot_moderate_owner");
                    }
                    return ephemeralError(interaction, locale, "moderation.invoker_hierarchy");
                }
                if (!member.communicationDisabledUntil) {
                    return ephemeralError(interaction, locale, "moderation.untimeout_not_timed_out", {
                        username: member.user.tag,
                    });
                }
                const botMember = await interaction.guild.members.fetchMe();
                if (!member.moderatable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }
                if (!botMember.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }
                await member.timeout(null);
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription((0, t_1.t)(locale, "moderation.untimeout_success", { username: member.user.tag }));
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (sub === "ban") {
                if (!execMember.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_ban");
                }
                const targetUser = interaction.options.getUser("user", true);
                if (targetUser.id === interaction.user.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_self");
                }
                if (targetUser.id === interaction.client.user?.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_bot");
                }
                const reason = normalizeModerationReason(interaction.options.getString("reason"));
                const deleteSeconds = interaction.options.getInteger("delete_messages");
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member) {
                    if (!invokerCanModerateTarget(interaction.guild, execMember, member)) {
                        if (member.id === interaction.guild.ownerId) {
                            return ephemeralError(interaction, locale, "moderation.cannot_moderate_owner");
                        }
                        return ephemeralError(interaction, locale, "moderation.invoker_hierarchy");
                    }
                    if (!member.bannable) {
                        return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                    }
                }
                const botMember = await interaction.guild.members.fetchMe();
                if (!botMember.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }
                await interaction.guild.members.ban(targetUser, {
                    reason,
                    deleteMessageSeconds: deleteSeconds ?? undefined,
                });
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription((0, t_1.t)(locale, "moderation.ban_success", { username: targetUser.tag }));
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (sub === "kick") {
                if (!execMember.permissions.has(discord_js_1.PermissionFlagsBits.KickMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_kick");
                }
                const targetUser = interaction.options.getUser("user", true);
                if (targetUser.id === interaction.user.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_self");
                }
                if (targetUser.id === interaction.client.user?.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_bot");
                }
                const reason = normalizeModerationReason(interaction.options.getString("reason"));
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return ephemeralError(interaction, locale, "moderation.member_not_found");
                }
                if (!invokerCanModerateTarget(interaction.guild, execMember, member)) {
                    if (member.id === interaction.guild.ownerId) {
                        return ephemeralError(interaction, locale, "moderation.cannot_moderate_owner");
                    }
                    return ephemeralError(interaction, locale, "moderation.invoker_hierarchy");
                }
                const botMember = await interaction.guild.members.fetchMe();
                if (!member.kickable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }
                if (!botMember.permissions.has(discord_js_1.PermissionFlagsBits.KickMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }
                const displayTag = member.user.tag;
                await member.kick(reason);
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xfee75c)
                    .setDescription((0, t_1.t)(locale, "moderation.kick_success", { username: displayTag }));
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (sub === "unban") {
                if (!execMember.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_ban");
                }
                const rawId = interaction.options.getString("user_id", true).trim();
                if (!SNOWFLAKE_RE.test(rawId)) {
                    return ephemeralError(interaction, locale, "moderation.unban_invalid_id");
                }
                const reason = normalizeModerationReason(interaction.options.getString("reason"));
                const botMember = await interaction.guild.members.fetchMe();
                if (!botMember.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }
                await interaction.guild.bans.remove(rawId, reason);
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription((0, t_1.t)(locale, "moderation.unban_success", { userId: rawId }));
                return reply_1.default.embedEdit(interaction, embed);
            }
            return ephemeralError(interaction, locale, "common.unknown_subcommand");
        }
        catch (error) {
            const code = error && typeof error === "object" && "code" in error
                ? Number(error.code)
                : Number.NaN;
            if (code === 10026) {
                return ephemeralError(interaction, locale, "moderation.unban_not_banned");
            }
            const message = (0, t_1.t)(locale, "moderation.api_error");
            return interaction.editReply({ content: message });
        }
    },
};
