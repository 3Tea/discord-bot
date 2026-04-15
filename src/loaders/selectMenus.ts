import { Client, Collection } from "discord.js";
import type { SelectMenuHandler } from "../types/common/discord";

export async function loadSelectMenus(client: Client): Promise<void> {
    client.selectMenus = new Collection();

    // Filter select menu handlers from already-loaded buttons
    for (const [id, handler] of client.buttons) {
        if (id.startsWith("voice_select_")) {
            client.selectMenus.set(id, handler as unknown as SelectMenuHandler);
        }
    }

    console.log(`Loaded ${client.selectMenus.size} select menus.`);
}
