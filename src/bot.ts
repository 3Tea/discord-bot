import client from "./client";
import { DISCORD_TOKEN } from "./util/config";

export async function login(): Promise<void> {
    await client.login(DISCORD_TOKEN);
}
