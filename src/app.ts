import { Client } from "discord.js";

const client: Client | any = new Client();

const logger = require("discordjs-logger");
logger.all(client);

client.once("ready", () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
});

export default client;
