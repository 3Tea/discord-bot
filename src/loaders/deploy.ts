import { REST, Routes } from "discord.js";
import { CLIENT_ID, GUILD_ID } from "../util/config/index";

export async function deployCommands(commands: object[]): Promise<void> {
    if (!process.env.DISCORD_TOKEN) {
        throw new Error("DISCORD_TOKEN environment variable is required");
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const isDev = process.env.NODE_ENV === "development";

    console.log(`Deploying ${commands.length} commands (${isDev ? "guild" : "global"})...`);

    const route = isDev
        ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
        : Routes.applicationCommands(CLIENT_ID);

    const data = await rest.put(route, { body: commands }) as unknown[];

    console.log(`Successfully deployed ${data.length} commands.`);
}
