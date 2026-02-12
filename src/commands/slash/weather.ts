import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  bold,
} from 'discord.js';

import Reply from '../../util/decorator/reply';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const weather = require('weather-js');

function findWeather(
  options: { search: string; degreeType: string; lang: string },
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    weather.find(options, (err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get weather information.')
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('Your location')
        .setRequired(true)
        .setMaxLength(200),
    ),

  async execute(interaction: CommandInteraction) {
    const location = interaction.options.get('location');
    const searchValue = String(location?.value ?? '');

    try {
      const result = await findWeather({
        search: searchValue,
        degreeType: 'C',
        lang: 'vi-VN',
      });

      if (!result || result.length === 0) {
        return Reply.send(interaction, bold(searchValue) + ' not found');
      }

      const data = result[0];
      const embed = new EmbedBuilder()
        .setTitle(`\`${data.current.day}\` Ngày: \`${data.current.date}\``)
        .setColor('Random')
        .addFields(
          {
            name: '**Vị trí || Location**',
            value: `${data.location.name} / ${data.current.observationpoint}`,
            inline: false,
          },
          {
            name: '**Nhiệt độ || Temperature**',
            value: `${data.current.temperature} độ ${data.location.degreetype} / ${data.current.skytext}`,
            inline: true,
          },
          {
            name: '**Độ ẩm || Humidity**',
            value: `${data.current.humidity}%`,
            inline: true,
          },
          {
            name: '**Tốc độ và hướng gió || Wind speed**',
            value: `${data.current.winddisplay}`,
            inline: false,
          },
          {
            name: '**Cập nhật lần cuối || Observation time**',
            value: `\`${data.current.observationtime}\` h/m/s \`Local time: ${data.location.name} / ${data.current.observationpoint}\``,
            inline: false,
          },
        )
        .setTimestamp()
        .setThumbnail(data.current.imageUrl);

      return Reply.embed(interaction, embed);
    } catch {
      return Reply.send(interaction, bold(searchValue) + ' not found');
    }
  },
};
