import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export function loadSelectMenus(client: Client): void {
    client.selectMenus = new Collection();

    const buttonsPath = path.join(__dirname, "../buttons");
    const files = fs.readdirSync(buttonsPath);

    for (const file of files) {
        const filePath = path.join(buttonsPath, file);
        const handler = require(filePath);

        if ("id" in handler.default && "execute" in handler.default) {
            const id: string = handler.default.id;
            // Select menu handlers have IDs starting with "voice_select_"
            if (id.startsWith("voice_select_")) {
                client.selectMenus.set(id, handler.default);
            }
        }
    }

    console.log(`Loaded ${client.selectMenus.size} select menus.`);
}
