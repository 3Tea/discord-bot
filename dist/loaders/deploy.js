"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCommands = deployCommands;
const discord_js_1 = require("discord.js");
const index_1 = require("../util/config/index");
async function deployCommands(commands) {
    if (!index_1.DISCORD_TOKEN) {
        throw new Error("DISCORD_TOKEN environment variable is required");
    }
    if (!index_1.APPLICATION_ID) {
        console.warn("[WARNING] APPLICATION_ID is not set — skipping command deployment.");
        return;
    }
    const rest = new discord_js_1.REST().setToken(index_1.DISCORD_TOKEN);
    const isDev = process.env.NODE_ENV === "development";
    if (isDev && !index_1.GUILD_ID) {
        console.warn("[WARNING] GUILD_ID is not set in development mode — skipping command deployment.");
        return;
    }
    console.log(`Deploying ${commands.length} commands (${isDev ? "guild" : "global"})...`);
    const route = isDev
        ? discord_js_1.Routes.applicationGuildCommands(index_1.APPLICATION_ID, index_1.GUILD_ID)
        : discord_js_1.Routes.applicationCommands(index_1.APPLICATION_ID);
    const data = (await rest.put(route, { body: commands }));
    console.log(`Successfully deployed ${data.length} commands.`);
}
