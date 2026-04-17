"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const mongoose_1 = require("mongoose");
const confession_model_1 = __importDefault(require("../models/confession.model"));
const confession_service_1 = require("../services/confession/confession.service");
const currency_service_1 = __importDefault(require("../services/economy/currency.service"));
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.CONFESSION_REPLY,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "confession.guild_only") });
            return;
        }
        const mongoId = interaction.customId.split(":")[1];
        if (!mongoId || !(0, mongoose_1.isValidObjectId)(mongoId)) {
            await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "confession.button.invalid") });
            return;
        }
        const modal = (0, confession_service_1.buildConfessionReplyModal)(mongoId, {
            title: (0, t_1.t)(locale, "confession.reply_modal_title"),
            inputLabel: (0, t_1.t)(locale, "confession.reply_modal_label"),
        });
        await interaction.showModal(modal);
        const submitted = await interaction
            .awaitModalSubmit({
            filter: (i) => i.customId === `${button_1.BUTTON_ID.CONFESSION_REPLY_MODAL}:${mongoId}` &&
                i.user.id === interaction.user.id,
            time: 300_000,
        })
            .catch(() => null);
        if (!submitted)
            return;
        await submitted.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const content = submitted.fields.getTextInputValue("reply_content");
        const doc = await confession_model_1.default.findById(mongoId).exec();
        if (!doc || doc.status !== "published" || !doc.publicMessageId) {
            await submitted.editReply({ content: (0, t_1.t)(locale, "confession.reply_not_found") });
            return;
        }
        const channel = interaction.channel;
        const result = await (0, confession_service_1.handleConfessionReply)({
            confessionMongoId: mongoId,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            content,
            channel,
            publicMessageId: doc.publicMessageId,
            confessionNumber: doc.number,
        });
        if (!result.ok) {
            const codeMap = {
                not_found: "confession.reply_not_found",
                empty: "confession.reply_empty",
                insufficient_coin: "confession.reply_insufficient_coin",
                thread_failed: "confession.send_failed",
                send_failed: "confession.send_failed",
            };
            if (result.code === "insufficient_coin") {
                const balance = (await currency_service_1.default.getBalance(interaction.user.id, interaction.guildId)).coin;
                await submitted.editReply({
                    content: (0, t_1.t)(locale, codeMap[result.code], {
                        cost: confession_service_1.CONFESSION_REPLY_COST_COIN,
                        balance,
                    }),
                });
            }
            else {
                await submitted.editReply({ content: (0, t_1.t)(locale, codeMap[result.code]) });
            }
            return;
        }
        await submitted.editReply({ content: (0, t_1.t)(locale, "confession.reply_success") });
    },
};
