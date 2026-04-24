"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("../util/config/button");
const kick_1 = require("../util/voice/kick");
exports.default = {
    id: button_1.BUTTON_ID.VOICE_KICK_ONLY,
    async execute(interaction) {
        await interaction.deferUpdate();
        await (0, kick_1.handleKick)(interaction, false);
    },
};
