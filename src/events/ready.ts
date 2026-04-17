import { ActivityType, Client, Events } from "discord.js";

import botInfo from "../../package.json";
import { getNumberOfDays } from "../util/date/day";
import EconomyLogService from "../services/economy/economyLog.service";
import { AuditDispatcherService } from "../services/audit/auditDispatcher.service";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client<true>) {
        EconomyLogService.setClient(client);

        const guilds = client.guilds.cache.map((guild) => guild.id);
        console.log("Total guilds:", guilds.length);

        const users = client.users.cache.map((user) => user.id);
        console.log("Total users:", users.length);

        console.log(`Ready! Logged in as ${client.user.tag}`);

        AuditDispatcherService.init(client);
        await AuditService.onReady(client);

        const numberOfDays = getNumberOfDays(new Date("2019/08/25"), new Date());
        setTimeout(() => {
            client.user.setPresence({
                activities: [
                    {
                        name: `/help v${botInfo.version}, ${numberOfDays} days of uptime: `,
                        type: ActivityType.Watching,
                    },
                ],
            });
        }, 5_000);
    },
};
