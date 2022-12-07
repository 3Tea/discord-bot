import { CommandInteraction, EmbedBuilder } from "discord.js";

import { FOOTER } from "../../configs/config";

class Reply {
    constructor() {}

    async send(interaction: CommandInteraction, payload: string) {
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
}

export default new Reply();
