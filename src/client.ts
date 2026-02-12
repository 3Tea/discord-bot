import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import fs from 'fs';
import path from 'path';

import { SlashCommand } from './types/command';
import { ButtonHandler } from './types/button';
import { BotEvent } from './types/event';
import { CLIENT_ID, GUILD_ID } from './util/config/index';
import logger from './util/log/logger';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();

// Load slash commands
const commandsPath = path.join(__dirname, 'commands/slash/');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((f) => (f.endsWith('.js') || f.endsWith('.ts')) && !f.endsWith('.d.ts'));
const commandsJson: object[] = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath);
  const command = mod.default as SlashCommand | undefined;
  if (command && 'data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsJson.push(command.data.toJSON());
  } else {
    logger.warn(`Command at ${filePath} is missing "data" or "execute".`);
  }
}

// Load manga commands from subdirectory
const mangaPath = path.join(__dirname, 'commands/slash/manga');
if (fs.existsSync(mangaPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mangaCommands: SlashCommand[] = require(mangaPath).default;
  for (const command of mangaCommands) {
    client.commands.set(command.data.name, command);
    commandsJson.push(command.data.toJSON());
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((f) => (f.endsWith('.js') || f.endsWith('.ts')) && !f.endsWith('.d.ts'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath);
  const event: BotEvent = mod.default;
  if (event.once) {
    client.once(event.name as string, (...args: any[]) => event.execute(...args));
  } else {
    client.on(event.name as string, (...args: any[]) => event.execute(...args));
  }
}

// Load buttons from index
const buttonsPath = path.join(__dirname, 'buttons');
if (fs.existsSync(buttonsPath)) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buttons: ButtonHandler[] = require(path.join(buttonsPath, 'index')).default;
    for (const button of buttons) {
      client.buttons.set(button.id, button);
    }
  } catch {
    logger.warn('Failed to load buttons from index.');
  }
}

// Register slash commands with Discord API
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    logger.info(`Refreshing ${commandsJson.length} application (/) commands.`);

    if (process.env.NODE_ENV === 'development') {
      const data = (await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commandsJson },
      )) as any[];
      logger.info(`Reloaded ${data.length} guild commands.`);
    } else {
      const data = (await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commandsJson,
      })) as any[];
      logger.info(`Reloaded ${data.length} global commands.`);
    }
  } catch (error) {
    logger.error(`Failed to register commands: ${error}`);
  }
})();

export default client;
