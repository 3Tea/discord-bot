import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  EmbedBuilder,
} from 'discord.js';

import { FOOTER } from '../config/index';

function applyFooter(embed: EmbedBuilder) {
  if (!embed.data.footer) {
    embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon });
  }
}

class Reply {
  async send(interaction: CommandInteraction, payload: any) {
    return interaction.reply(payload);
  }

  async embed(interaction: CommandInteraction, embed: EmbedBuilder) {
    applyFooter(embed);
    return interaction.reply({ embeds: [embed] });
  }

  async embedButtons(
    interaction: CommandInteraction,
    embed: EmbedBuilder,
    row: ActionRowBuilder<ButtonBuilder>,
  ) {
    applyFooter(embed);
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  async embedEdit(interaction: CommandInteraction, embed: EmbedBuilder) {
    applyFooter(embed);
    return interaction.editReply({ embeds: [embed] });
  }
}

export default new Reply();
