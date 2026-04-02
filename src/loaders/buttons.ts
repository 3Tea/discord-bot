import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export function loadButtons(client: Client): void {
    client.buttons = new Collection();

    const buttonsPath = path.join(__dirname, "../buttons");
    const files = fs.readdirSync(buttonsPath);

    for (const file of files) {
        const filePath = path.join(buttonsPath, file);
        const button = require(filePath);

        if ("id" in button.default && "execute" in button.default) {
            client.buttons.set(button.default.id, button.default);
        } else {
            console.warn(`[WARNING] Button at ${filePath} is missing "id" or "execute".`);
        }
    }

    console.log(`Loaded ${client.buttons.size} buttons.`);
}
