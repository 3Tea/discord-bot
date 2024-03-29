import {
    CommandInteraction,
    EmbedBuilder,
    ActionRowComponent,
} from "discord.js";

import { FOOTER } from "../config/index";

class Reply {
    constructor() {}

    async send(interaction: CommandInteraction, payload: any) {
        return interaction.reply(payload);
    }

    async embed(interaction: CommandInteraction, embed: EmbedBuilder) {
        if (!embed.data.footer) {
            embed.setFooter({
                text: FOOTER.text,
                iconURL: FOOTER.icon,
            });
        }
        return interaction.reply({ embeds: [embed] });
    }

    async embedButtons(
        interaction: CommandInteraction,
        embed: EmbedBuilder,
        row: any
    ) {
        if (!embed.data.footer) {
            embed.setFooter({
                text: FOOTER.text,
                iconURL: FOOTER.icon,
            });
        }
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    async embedEdit(interaction: CommandInteraction, embed: EmbedBuilder) {
        if (!embed.data.footer) {
            embed.setFooter({
                text: FOOTER.text,
                iconURL: FOOTER.icon,
            });
        }
        return interaction.editReply({ embeds: [embed] });
    }
}

export default new Reply();
