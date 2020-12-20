import { Client } from "discord.js";

const client: Client | any = new Client();

client.on("ready", () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
});

export default client;

