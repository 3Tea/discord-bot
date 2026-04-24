"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const button_1 = require("../util/config/button");
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.VOICE_RENAME,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const voiceChannel = await (0, helpers_1.validateOwner)(interaction, locale);
        if (!voiceChannel)
            return;
        const cdKey = `setVoiceName:${voiceChannel.id}`;
        if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
            return;
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(button_1.BUTTON_ID.VOICE_MODAL_RENAME)
            .setTitle((0, t_1.t)(locale, "voice.modal.rename_title"));
        const nameInput = new discord_js_1.TextInputBuilder()
            .setCustomId("voice_name_input")
            .setLabel((0, t_1.t)(locale, "voice.modal.rename_label"))
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true);
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
    },
};
