"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../config/index");
function applyFooter(embed) {
    if (!embed.data.footer && index_1.FOOTER.text) {
        embed.setFooter({
            text: index_1.FOOTER.text,
            iconURL: index_1.FOOTER.icon,
        });
    }
}
class Reply {
    async send(interaction, payload) {
        return interaction.reply(payload);
    }
    async embed(interaction, embed) {
        applyFooter(embed);
        return interaction.reply({ embeds: [embed] });
    }
    async embedButtons(interaction, embed, row) {
        applyFooter(embed);
        return interaction.reply({ embeds: [embed], components: [row] });
    }
    async embedEdit(interaction, embed) {
        applyFooter(embed);
        return interaction.editReply({ embeds: [embed] });
    }
    async embedEditComponents(interaction, embed, components) {
        applyFooter(embed);
        return interaction.editReply({ embeds: [embed], components });
    }
}
exports.default = new Reply();
