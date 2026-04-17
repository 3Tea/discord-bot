"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPremiumButton = buildPremiumButton;
const discord_js_1 = require("discord.js");
const index_1 = require("../config/index");
const t_1 = require("../i18n/t");
function buildPremiumButton(locale) {
    return new discord_js_1.ButtonBuilder()
        .setLabel((0, t_1.t)(locale, "premium.upgrade_btn"))
        .setURL(`${index_1.URL_HOMEPAGE}/en/guide/premium/`)
        .setStyle(discord_js_1.ButtonStyle.Link)
        .setEmoji("⭐");
}
