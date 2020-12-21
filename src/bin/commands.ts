import { Collection } from "discord.js";
import fs from "fs";

import client from "../app";

client.commands = new Collection();

let commandFolders = fs.readdirSync("./src/commands");

for (const folder of commandFolders) {
    let commandFiles = fs.readdirSync(`./src/commands/${folder}`);

    if (commandFiles?.length !== 0) {
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);

            client.commands.set(command?.default?.name, command?.default);
        }
    }
}
