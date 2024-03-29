import { ActivityType, Client, Events } from "discord.js";

import botInfo from "../../package.json";
import { getNumberOfDays } from "../util/date/day";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client<true>) {
        const guilds = client.guilds.cache.map((guild) => guild.id);

        // console.log(guilds);

        // for (const guild of guilds) {
        //     const g = client.guilds.cache.get(guild);
        //     console.log("Guilds", g.name);
        // }
        console.log("Total guilds:", guilds.length);

        const users = client.users.cache.map((user) => user.id);
        console.log("Total users:", users.length);

        console.log(`Ready! Logged in as ${client.user.tag}`);

        const numberOfDays = getNumberOfDays(
            new Date("2019/08/25"),
            new Date()
        );
        client.user.setPresence({
            activities: [
                {
                    name: `/help v${botInfo.version}, ${numberOfDays} days of uptime: `,
                    type: ActivityType.Watching,
                },
            ],
        });
    },
};
