import { Events, MessageFlags, UserSelectMenuInteraction } from "discord.js";

import client from "../client";
import { enforceBlocklist } from "../util/blocklist/enforce";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: UserSelectMenuInteraction) {
        if (!interaction.isUserSelectMenu()) return;
        if (await enforceBlocklist(interaction)) return;

        const handler = client?.selectMenus.get(interaction.customId);

        if (!handler) {
            console.error(`No select menu handler matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await handler.execute(interaction);
        } catch (error) {
            console.error(error);
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            const errorMsg = t(locale, "common.error");
            if (!interaction.replied && !interaction.deferred) {
                await interaction
                    .reply({
                        content: errorMsg,
                        flags: MessageFlags.Ephemeral,
                    })
                    .catch(() => {});
            } else if (interaction.deferred) {
                await interaction
                    .editReply({
                        content: errorMsg,
                    })
                    .catch(() => {});
            }
        }
    },
};
