"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const button_1 = require("../util/config/button");
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.VOICE_PERMIT,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const voiceChannel = await (0, helpers_1.validateOwner)(interaction, locale);
        if (!voiceChannel)
            return;
        const selectMenu = new discord_js_1.UserSelectMenuBuilder()
            .setCustomId(button_1.BUTTON_ID.VOICE_SELECT_PERMIT)
            .setPlaceholder((0, t_1.t)(locale, "voice.select.permit_placeholder"))
            .setMinValues(1)
            .setMaxValues(1);
        const row = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: discord_js_1.MessageFlags.Ephemeral });
    },
};
