import { ActivityType, Client, Events } from "discord.js";

import botInfo from "../../package.json";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client<true>) {
        const guilds = client.guilds.cache.map((guild) => guild.id);

        // console.log(guilds);

        for (const guild of guilds) {
            const g = client.guilds.cache.get(guild);
            console.log("Guilds", g.name);
        }
        console.log(guilds.length);
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.user.setPresence({
            activities: [
                {
                    name: `/help v${botInfo.version}`,
                    type: ActivityType.Watching,
                },
            ],
        });
    },
};
