/// <reference path="./types/common/discord.d.ts" />
import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { loadSelectMenus } from "./loaders/selectMenus";
import { deployCommands } from "./loaders/deploy";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        // TODO: Uncomment after Discord approves privileged intents
        // GatewayIntentBits.MessageContent,
        // TODO: Enable GuildMembers intent for welcome/goodbye/boost/milestone notifications
        // Requires approval in Discord Developer Portal (privileged intent)
        // GatewayIntentBits.GuildMembers,
    ],
});

export async function initializeClient(): Promise<void> {
    const commands = await loadCommands(client);
    await loadEvents(client);
    await loadButtons(client);
    await loadSelectMenus(client);

    deployCommands(commands).catch(console.error);
}

export default client;
