import {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
} from "discord.js";
import fs from "fs";
import path from "path";

import { CLIENT_ID, GUILD_ID } from "./util/config/index";

const client: any = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// TODO: Implement slash commands handle

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands/slash/");
const commandFiles = fs.readdirSync(commandsPath);
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command.default && "execute" in command.default) {
        client.commands.set(command.default.data.name, command.default);
        commands.push(command.default.data.toJSON());
    } else {
        console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
    }
}

// TODO: Implement events handle

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath);

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.default.once) {
        client.once(event.default.name, (...args: any[]) =>
            event.default.execute(...args)
        );
    } else {
        client.on(event.default.name, (...args: any[]) =>
            event.default.execute(...args)
        );
    }
}

// TODO: Implement slash commands handle

client.buttons = new Collection();

const buttonsPath = path.join(__dirname, "buttons");
const buttonFiles = fs.readdirSync(buttonsPath);

for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("id" in button.default && "execute" in button.default) {
        client.buttons.set(button.default.id, button.default);
    } else {
        console.log(
            `[WARNING] The button at ${filePath} is missing a required "id" or "execute" property.`
        );
    }
}

// TODO: Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN as any
);

// and deploy your commands!
(async () => {
    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        console.log(CLIENT_ID, CLIENT_ID);

        if (process.env.NODE_ENV == "development") {
            const data: any = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log(
                `Successfully reloaded ${data.length} application (/) commands.`
            );
        } else {
            const data: any = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
            console.log(
                `Successfully reloaded ${data.length} application (/) commands.`
            );
        }
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();

export default client;
