import { Events, Client, ActivityType } from "discord.js";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client<true>) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.user.setPresence({
            activities: [
                {
                    name: `developing...`,
                    type: ActivityType.Listening,
                },
            ],
        });
    },
};
