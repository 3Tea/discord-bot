import { REST, Routes } from "discord.js";
import { APPLICATION_ID, GUILD_ID } from "../util/config/index";

export async function deployCommands(commands: object[]): Promise<void> {
    if (!process.env.DISCORD_TOKEN) {
        throw new Error("DISCORD_TOKEN environment variable is required");
    }

    if (!APPLICATION_ID) {
        console.warn("[WARNING] APPLICATION_ID is not set — skipping command deployment.");
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const isDev = process.env.NODE_ENV === "development";

    if (isDev && !GUILD_ID) {
        console.warn("[WARNING] GUILD_ID is not set in development mode — skipping command deployment.");
        return;
    }

    console.log(`Deploying ${commands.length} commands (${isDev ? "guild" : "global"})...`);

    const route = isDev
        ? Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID)
        : Routes.applicationCommands(APPLICATION_ID);

    const data = await rest.put(route, { body: commands }) as unknown[];

    console.log(`Successfully deployed ${data.length} commands.`);
}
