"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceBlocklist = enforceBlocklist;
const discord_js_1 = require("discord.js");
const blocklist_service_1 = require("../../services/blocklist/blocklist.service");
const locale_1 = require("../i18n/locale");
const t_1 = require("../i18n/t");
function isLocaleInteraction(interaction) {
    return (interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isUserSelectMenu() ||
        interaction.isRoleSelectMenu() ||
        interaction.isStringSelectMenu() ||
        interaction.isMentionableSelectMenu() ||
        interaction.isChannelSelectMenu());
}
async function replyBlocked(interaction, i18nKey, reason) {
    if (!interaction.isRepliable())
        return;
    const shouldNotify = await blocklist_service_1.BlocklistService.shouldNotifyBlockedUser(interaction.user.id);
    if (!shouldNotify)
        return;
    try {
        const locale = isLocaleInteraction(interaction)
            ? await (0, locale_1.resolveLocale)(interaction).catch(() => "en")
            : "en";
        await interaction.reply({
            content: (0, t_1.t)(locale, i18nKey, { reason }),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch {
        // ignore expired or already-replied interactions
    }
}
async function enforceBlocklist(interaction) {
    if (interaction.guildId) {
        const { blocked, reason } = await blocklist_service_1.BlocklistService.isGuildBlocked(interaction.guildId);
        if (blocked) {
            await replyBlocked(interaction, "blocklist.guild_blocked", reason ?? "—");
            return true;
        }
    }
    const { blocked, reason } = await blocklist_service_1.BlocklistService.isUserBlocked(interaction.user.id);
    if (!blocked)
        return false;
    await replyBlocked(interaction, "blocklist.user_blocked", reason ?? "—");
    return true;
}
