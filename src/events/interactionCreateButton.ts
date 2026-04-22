import { ButtonInteraction, Events, MessageFlags } from "discord.js";

import client from "../client";
import { enforceBlocklist } from "../util/blocklist/enforce";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;
        if (await enforceBlocklist(interaction)) return;

        let button = client?.buttons.get(interaction.customId);
        if (!button && interaction.customId.includes(":")) {
            const prefix = interaction.customId.split(":")[0] ?? "";
            button = client?.buttons.get(prefix);
        }

        if (!button) {
            // Unregistered buttons are handled by message component collectors
            return;
        }

        try {
            await button.execute(interaction);
        } catch (error) {
            console.error(error);
            try {
                const locale = await resolveLocale(interaction).catch(() => "en" as const);
                const errorMsg = t(locale, "common.error");
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: errorMsg,
                    });
                } else {
                    await interaction.reply({
                        content: errorMsg,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } catch {
                // Interaction expired — silently ignore
            }
        }
    },
};
