import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { deployCommands } from "./loaders/deploy";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const commands = loadCommands(client);
loadEvents(client);
loadButtons(client);

deployCommands(commands).catch(console.error);

export default client;
