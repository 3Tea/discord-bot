import { ButtonInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";

import { rejectConfession } from "../services/confession/confession.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_REJECT,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild()) {
            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: t(locale, "confession.guild_only"),
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: t(locale, "confession.no_permission_review"),
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await rejectConfession(interaction);

        if (result.ok) {
            await interaction.editReply({ content: t(locale, "confession.reject_success") });
            return;
        }

        const codeMap: Record<typeof result.code, string> = {
            invalid_id: "confession.button.invalid",
            not_found: "confession.button.invalid",
            not_pending: "confession.already_resolved",
            config: "confession.send_failed",
            send_failed: "confession.send_failed",
        };

        await interaction.editReply({
            content: t(locale, codeMap[result.code]),
        });
    },
};
