import { ActivityType, Client, Events } from 'discord.js';

import botInfo from '../../package.json';
import { getNumberOfDays } from '../util/date/day';
import logger from '../util/log/logger';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    const guilds = client.guilds.cache;
    const users = client.users.cache;

    logger.info(`Total guilds: ${guilds.size}`);
    logger.info(`Total users: ${users.size}`);
    logger.info(`Ready! Logged in as ${client.user.tag}`);

    const numberOfDays = getNumberOfDays(new Date('2019/08/25'), new Date());
    client.user.setPresence({
      activities: [
        {
          name: `/help v${botInfo.version}, ${numberOfDays} days of uptime`,
          type: ActivityType.Watching,
        },
      ],
    });
  },
};
