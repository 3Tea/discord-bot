import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GuildSocialConfigModel, { IGuildSocialConfig } from "../../models/guildSocialConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getSocialConfig(guildId: string): Promise<IGuildSocialConfig> {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildSocialConfig;

    const config = await GuildSocialConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("gift")
        .setDescription("Gift coins to another user")
        .setDescriptionLocalizations(descriptionLocales("cmd.gift.desc"))
        .addUserOption((opt) =>
            opt
                .setName("user")
                .setDescription("User to gift coins to")
                .setRequired(true)
        )
        .addIntegerOption((opt) =>
            opt
                .setName("amount")
                .setDescription("Amount of coin to gift")
                .setMinValue(1)
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const giverId = interaction.user.id;
        const target = interaction.options.getUser("user", true);
        const amount = interaction.options.getInteger("amount", true);

        try {
            const config = await getSocialConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.disabled"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate target
            if (target.bot) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.bot_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (target.id === giverId) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.self_error"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate amount
            if (amount > config.giftMaxAmount) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gift.max_amount", { max: String(config.giftMaxAmount) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Get balances before
            const giverBefore = await CurrencyService.getBalance(giverId, guildId);
            const receiverBefore = await CurrencyService.getBalance(target.id, guildId);

            // Deduct from giver
            try {
                await CurrencyService.deduct(giverId, guildId, amount, 0, "gift", {
                    targetId: target.id,
                    amount,
                });
            } catch (error) {
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "gift.insufficient", { balance: String(giverBefore.coin) }))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, embed);
                }
                throw error;
            }

            // Add to receiver
            await CurrencyService.addCoin(target.id, guildId, amount, "gift", {
                fromId: giverId,
                amount,
            });

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${t(locale, "gift.title")}`)
                .setDescription(
                    [
                        t(locale, "gift.success", {
                            from: interaction.user.username,
                            amount: String(amount),
                            to: target.username,
                        }),
                        t(locale, "gift.from_balance", {
                            from: interaction.user.username,
                            before: String(giverBefore.coin),
                            after: String(giverBefore.coin - amount),
                        }),
                        t(locale, "gift.to_balance", {
                            to: target.username,
                            before: String(receiverBefore.coin),
                            after: String(receiverBefore.coin + amount),
                        }),
                    ].join("\n")
                )
                .setColor(0x57f287);

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder()
                .setDescription(t(errLocale, "common.error"))
                .setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
