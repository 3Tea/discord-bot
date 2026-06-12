"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("../util/config/button");
const dungeonAttack_button_1 = require("./dungeonAttack.button");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_ULTIMATE,
    async execute(interaction) {
        await (0, dungeonAttack_button_1.handleCombatAction)(interaction, "ultimate");
    },
};
