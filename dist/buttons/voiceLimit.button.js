"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const button_1 = require("../util/config/button");
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
exports.default = {
    id: button_1.BUTTON_ID.VOICE_LIMIT,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const voiceChannel = await (0, helpers_1.validateOwner)(interaction, locale);
        if (!voiceChannel)
            return;
        const cdKey = `setUserLimit:${voiceChannel.id}`;
        if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
            return;
        const modal = new discord_js_1.ModalBuilder().setCustomId(button_1.BUTTON_ID.VOICE_MODAL_LIMIT).setTitle("Set User Limit");
        const limitInput = new discord_js_1.TextInputBuilder()
            .setCustomId("voice_limit_input")
            .setLabel("User limit (0-99, 0 = unlimited)")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true);
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(limitInput));
        await interaction.showModal(modal);
    },
};
