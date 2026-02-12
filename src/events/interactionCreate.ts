import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Events,
  Interaction,
} from 'discord.js';

import client from '../client';
import logger from '../util/log/logger';

async function handleCommand(interaction: ChatInputCommandInteraction) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  logger.info(
    `/${interaction.commandName} => ${interaction.user.username} (${interaction.user.id})`,
  );

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}: ${error}`);
    const reply = { content: 'There was an error while executing this command!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

async function handleButton(interaction: ButtonInteraction) {
  const button = client.buttons.get(interaction.customId);

  if (!button) {
    logger.error(`No button matching ${interaction.customId} was found.`);
    return;
  }

  try {
    await button.execute(interaction);
  } catch (error) {
    logger.error(`Error executing button ${interaction.customId}: ${error}`);
    const reply = { content: 'There was an error while executing this button!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  },
};
