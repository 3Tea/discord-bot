"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSelectMenus = loadSelectMenus;
const discord_js_1 = require("discord.js");
async function loadSelectMenus(client) {
    client.selectMenus = new discord_js_1.Collection();
    // Filter select menu handlers from already-loaded buttons
    for (const [id, handler] of client.buttons) {
        if (id.startsWith("voice_select_")) {
            client.selectMenus.set(id, handler);
        }
    }
    console.log(`Loaded ${client.selectMenus.size} select menus.`);
}
