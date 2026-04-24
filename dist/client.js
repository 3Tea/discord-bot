"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeClient = initializeClient;
/// <reference path="./types/common/discord.d.ts" />
const discord_js_1 = require("discord.js");
const commands_1 = require("./loaders/commands");
const events_1 = require("./loaders/events");
const buttons_1 = require("./loaders/buttons");
const selectMenus_1 = require("./loaders/selectMenus");
const deploy_1 = require("./loaders/deploy");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
        // TODO: Uncomment after Discord approves privileged intents
        // GatewayIntentBits.MessageContent,
        // TODO: Enable GuildMembers intent for welcome/goodbye/boost/milestone notifications
        // Requires approval in Discord Developer Portal (privileged intent)
        // GatewayIntentBits.GuildMembers,
    ],
});
async function initializeClient() {
    const commands = await (0, commands_1.loadCommands)(client);
    await (0, events_1.loadEvents)(client);
    await (0, buttons_1.loadButtons)(client);
    await (0, selectMenus_1.loadSelectMenus)(client);
    (0, deploy_1.deployCommands)(commands).catch(console.error);
}
exports.default = client;
