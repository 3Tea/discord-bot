import {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";

import { CLIENT_ID, GUILD_ID } from "./util/config/index";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands/slash/");
const commandFiles = fs.readdirSync(commandsPath);
const commands: object[] = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command.default && "execute" in command.default) {
        client.commands.set(command.default.data.name, command.default);
        commands.push(command.default.data.toJSON());
    } else {
        console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
    }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath);

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.default.once) {
        client.once(event.default.name, (...args: unknown[]) =>
            event.default.execute(...args)
        );
    } else {
        client.on(event.default.name, (...args: unknown[]) =>
            event.default.execute(...args)
        );
    }
}

client.buttons = new Collection();

const buttonsPath = path.join(__dirname, "buttons");
const buttonFiles = fs.readdirSync(buttonsPath);

for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    if ("id" in button.default && "execute" in button.default) {
        client.buttons.set(button.default.id, button.default);
    } else {
        console.log(
            `[WARNING] The button at ${filePath} is missing a required "id" or "execute" property.`
        );
    }
}

if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN environment variable is required");
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );

        if (process.env.NODE_ENV == "development") {
            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            ) as unknown[];
            console.log(
                `Successfully reloaded ${data.length} application (/) commands.`
            );
        } else {
            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            ) as unknown[];
            console.log(
                `Successfully reloaded ${data.length} application (/) commands.`
            );
        }
    } catch (error) {
        console.error(error);
    }
})();

export default client;
