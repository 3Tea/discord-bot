"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client = new discord_js_1.Client();
const logger = require("discordjs-logger");
logger.all(client);
const tempChannel = require("discord.js-temporary-channel");
// just call API
tempChannel.autoCreateChannel(client, {
    userLimit: 23,
    reason: "powered by ds112",
    nameStartsWith: "3AT ",
    nameStartsWithTemp: "* ",
});
client.once("ready", () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
});
exports.default = client;
