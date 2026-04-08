import { ButtonInteraction, MessageFlags, TextChannel } from "discord.js";
import { isValidObjectId } from "mongoose";

import ConfessionModel from "../models/confession.model";
import {
    buildConfessionReplyModal,
    handleConfessionReply,
    CONFESSION_REPLY_COST_COIN,
} from "../services/confession/confession.service";
import CurrencyService from "../services/economy/currency.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_REPLY,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
            return;
        }

        const mongoId = interaction.customId.split(":")[1];
        if (!mongoId || !isValidObjectId(mongoId)) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.button.invalid") });
            return;
        }

        const modal = buildConfessionReplyModal(mongoId, {
            title: t(locale, "confession.reply_modal_title"),
            inputLabel: t(locale, "confession.reply_modal_label"),
        });

        await interaction.showModal(modal);

        const submitted = await interaction
            .awaitModalSubmit({
                filter: (i) =>
                    i.customId === `${BUTTON_ID.CONFESSION_REPLY_MODAL}:${mongoId}` &&
                    i.user.id === interaction.user.id,
                time: 300_000,
            })
            .catch(() => null);

        if (!submitted) return;

        await submitted.deferReply({ flags: MessageFlags.Ephemeral });

        const content = submitted.fields.getTextInputValue("reply_content");

        const doc = await ConfessionModel.findById(mongoId).exec();
        if (!doc || doc.status !== "published" || !doc.publicMessageId) {
            await submitted.editReply({ content: t(locale, "confession.reply_not_found") });
            return;
        }

        const channel = interaction.channel as TextChannel;

        const result = await handleConfessionReply({
            confessionMongoId: mongoId,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            content,
            channel,
            publicMessageId: doc.publicMessageId,
            confessionNumber: doc.number,
        });

        if (!result.ok) {
            const codeMap: Record<typeof result.code, string> = {
                not_found: "confession.reply_not_found",
                empty: "confession.reply_empty",
                insufficient_coin: "confession.reply_insufficient_coin",
                thread_failed: "confession.send_failed",
                send_failed: "confession.send_failed",
            };

            if (result.code === "insufficient_coin") {
                const balance = (await CurrencyService.getBalance(interaction.user.id, interaction.guildId)).coin;
                await submitted.editReply({
                    content: t(locale, codeMap[result.code], {
                        cost: CONFESSION_REPLY_COST_COIN,
                        balance,
                    }),
                });
            } else {
                await submitted.editReply({ content: t(locale, codeMap[result.code]) });
            }
            return;
        }

        await submitted.editReply({ content: t(locale, "confession.reply_success") });
    },
};
