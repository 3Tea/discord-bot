import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export async function loadCommands(client: Client): Promise<object[]> {
    client.commands = new Collection();
    const commandsJson: object[] = [];

    const commandsPath = path.join(__dirname, "../commands/slash/");
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);

        if ("data" in command.default && "execute" in command.default) {
            client.commands.set(command.default.data.name, command.default);
            commandsJson.push(command.default.data.toJSON());
        } else {
            console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
        }
    }

    console.log(`Loaded ${client.commands.size} commands.`);
    return commandsJson;
}
