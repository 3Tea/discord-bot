import axios from 'axios';
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { setTimeout } from 'node:timers/promises';

import redis from '../../../connector/redis/index';
import { FOOTER, SERVER_HD } from '../../../util/config';
import logger from '../../../util/log/logger';
import { SlashCommand } from '../../../types/command';

const MAX_PAGES = 50;
const BUTTON_DISPLAY_MS = 20_000;
const REDIS_IMAGE_TTL = 600; // 10 minutes

export interface MangaCommandConfig {
  name: string;
  description: string;
  apiPath: string;
  siteUrl: (id: string) => string;
  buttonId: string;
  buildFields: (result: any) => APIEmbedField[];
}

export function createMangaCommand(config: MangaCommandConfig): SlashCommand {
  return {
    data: new SlashCommandBuilder()
      .setName(config.name)
      .setDescription(config.description)
      .addSubcommand((sub) =>
        sub
          .setName('read')
          .setDescription(`Read from ${config.name}`)
          .addIntegerOption((opt) =>
            opt
              .setName('id')
              .setDescription('The ID you wanna read')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName('random').setDescription(`Random from ${config.name}`),
      ),

    async execute(baseInteraction) {
      const interaction = baseInteraction as ChatInputCommandInteraction;
      try {
        if (!(interaction.channel as any)?.nsfw) {
          await interaction.reply('Only NSFW channel');
          return;
        }

        const subcommand = interaction.options.getSubcommand(true);
        await interaction.deferReply();

        let response;
        if (subcommand === 'random') {
          response = await axios.get(`${SERVER_HD}${config.apiPath}/random`);
        } else {
          const bookId = interaction.options.getInteger('id', true);
          response = await axios.get(
            `${SERVER_HD}${config.apiPath}/get?book=${bookId}`,
          );
        }

        if (!response.data?.data) return;

        const result = response.data.data;
        const url = config.siteUrl(result.id);

        const embed = new EmbedBuilder()
          .setColor('Random')
          .setTitle(result.title)
          .setURL(url)
          .setImage(result.image[0])
          .addFields(...config.buildFields(result))
          .setDescription(`${result.id}`)
          .setTimestamp()
          .setFooter({ text: FOOTER.text, iconURL: FOOTER.icon });

        const row = new ActionRowBuilder<ButtonBuilder>();

        if (result.total < MAX_PAGES) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(config.buttonId)
              .setLabel('Read')
              .setStyle(ButtonStyle.Primary),
          );
          await redis.setJson(
            `${config.buttonId}_${result.id}`,
            result.image,
            REDIS_IMAGE_TTL,
          );
        } else {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(config.buttonId)
              .setLabel('Please read it online. There are too many pages.')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
          );
        }

        row.addComponents(
          new ButtonBuilder()
            .setURL(url)
            .setLabel('Read Online')
            .setStyle(ButtonStyle.Link),
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        await setTimeout(BUTTON_DISPLAY_MS);
        await interaction.editReply({ components: [] });
      } catch (error) {
        logger.error(`Error in ${config.name} command: ${error}`);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setURL(`${process.env.URL_REPORT_BUG}`)
            .setLabel('Report this issue')
            .setStyle(ButtonStyle.Link),
        );
        await interaction.editReply({
          content: 'Server maintenance',
          components: [row],
        });
      }
    },
  };
}
