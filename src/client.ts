import { Client, Events, GatewayIntentBits } from "discord.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.on(Events.ClientReady, (c: Client<true>) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

export default client;
