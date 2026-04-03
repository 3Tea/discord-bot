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
        // TODO: Uncomment after Discord approves privileged intents
        // GatewayIntentBits.MessageContent,
        // GatewayIntentBits.GuildMessageReactions,
    ],
});

const commands = loadCommands(client);
loadEvents(client);
loadButtons(client);
loadSelectMenus(client);

deployCommands(commands).catch(console.error);

export default client;
