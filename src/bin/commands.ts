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

            let isArray: Boolean = Array.isArray(command?.default?.name);
            if (isArray) {
                for (const name of command?.default?.name) {
                    client.commands.set(name, command?.default);
                }
            } else {
                client.commands.set(command?.default?.name, command?.default);
            }
        }
    }
}
