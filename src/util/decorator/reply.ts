import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
    type MessageActionRowComponentBuilder,
} from "discord.js";

import { FOOTER } from "../config/index";

function applyFooter(embed: EmbedBuilder): void {
    if (!embed.data.footer && FOOTER.text) {
        embed.setFooter({
            text: FOOTER.text,
            iconURL: FOOTER.icon,
        });
    }
}

class Reply {
    async send(interaction: ChatInputCommandInteraction, payload: string | InteractionReplyOptions) {
        return interaction.reply(payload);
    }

    async embed(interaction: ChatInputCommandInteraction, embed: EmbedBuilder) {
        applyFooter(embed);
        return interaction.reply({ embeds: [embed] });
    }

    async embedButtons(
        interaction: ChatInputCommandInteraction,
        embed: EmbedBuilder,
        row: ActionRowBuilder<ButtonBuilder>
    ) {
        applyFooter(embed);
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    async embedEdit(interaction: ChatInputCommandInteraction, embed: EmbedBuilder) {
        applyFooter(embed);
        return interaction.editReply({ embeds: [embed] });
    }

    async embedEditComponents(
        interaction: ChatInputCommandInteraction,
        embed: EmbedBuilder,
        components: ActionRowBuilder<MessageActionRowComponentBuilder>[]
    ) {
        applyFooter(embed);
        return interaction.editReply({ embeds: [embed], components });
    }
}

export default new Reply();
