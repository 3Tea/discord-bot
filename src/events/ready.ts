import { ActivityType, Client, Events } from "discord.js";

import botInfo from "../../package.json";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client<true>) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.user.setPresence({
            activities: [
                {
                    name: `version: ${botInfo.version} build: ${+new Date()}`,
                    type: ActivityType.Watching,
                },
            ],
        });
    },
};
