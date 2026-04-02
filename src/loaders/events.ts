import { Client } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export function loadEvents(client: Client): void {
    const eventsPath = path.join(__dirname, "../events");
    const files = fs.readdirSync(eventsPath);

    for (const file of files) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.default.once) {
            client.once(event.default.name, (...args: unknown[]) => event.default.execute(...args));
        } else {
            client.on(event.default.name, (...args: unknown[]) => event.default.execute(...args));
        }
    }

    console.log(`Loaded ${files.length} events.`);
}
