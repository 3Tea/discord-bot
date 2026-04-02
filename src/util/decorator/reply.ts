import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
} from "discord.js";

import { FOOTER } from "../config/index";

class Reply {
    async send(interaction: ChatInputCommandInteraction, payload: string | InteractionReplyOptions) {
        return interaction.reply(payload);
    }

    async embed(interaction: ChatInputCommandInteraction, embed: EmbedBuilder) {
        if (!embed.data.footer) {
            embed.setFooter({
                text: FOOTER.text,
                iconURL: FOOTER.icon,
            });
        }
        return interaction.reply({ embeds: [embed] });
    }

    async embedButtons(
        interaction: ChatInputCommandInteraction,
        embed: EmbedBuilder,
        row: ActionRowBuilder<ButtonBuilder>
    ) {
        if (!embed.data.footer) {
            embed.setFooter({
                text: FOOTER.text,
                iconURL: FOOTER.icon,
            });
        }
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    async embedEdit(interaction: ChatInputCommandInteraction, embed: EmbedBuilder) {
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
