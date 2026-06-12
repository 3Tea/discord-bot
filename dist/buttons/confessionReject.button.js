"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const confession_service_1 = require("../services/confession/confession.service");
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.CONFESSION_REJECT,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (!interaction.inGuild()) {
            await interaction.reply({
                flags: discord_js_1.MessageFlags.Ephemeral,
                content: (0, t_1.t)(locale, "confession.guild_only"),
            });
            return;
        }
        if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                flags: discord_js_1.MessageFlags.Ephemeral,
                content: (0, t_1.t)(locale, "confession.no_permission_review"),
            });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const result = await (0, confession_service_1.rejectConfession)(interaction);
        if (result.ok) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.reject_success") });
            return;
        }
        const codeMap = {
            invalid_id: "confession.button.invalid",
            not_found: "confession.button.invalid",
            not_pending: "confession.already_resolved",
            config: "confession.send_failed",
            send_failed: "confession.send_failed",
        };
        await interaction.editReply({
            content: (0, t_1.t)(locale, codeMap[result.code]),
        });
    },
};
