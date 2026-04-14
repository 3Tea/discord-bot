import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GamblingService from "../../services/economy/gambling.service";
import GuildGamblingConfigModel, { IGuildGamblingConfig } from "../../models/guildGamblingConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CONFIG_CACHE_TTL = 300;

async function getGamblingConfig(guildId: string): Promise<IGuildGamblingConfig> {
    const cacheKey = `gambling_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildGamblingConfig;

    const config = await GuildGamblingConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gambling mini-games — bet coins on coinflip, slots, or dice")
        .setDescriptionLocalizations(descriptionLocales("cmd.gamble.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("coinflip")
                .setDescription("Flip a coin — 50/50 chance to double your bet")
                .addIntegerOption((opt) =>
                    opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("slots")
                .setDescription("Spin the slot machine — match symbols to win")
                .addIntegerOption((opt) =>
                    opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("dice")
                .setDescription("Roll 2 dice — guess high or low to win")
                .addIntegerOption((opt) =>
                    opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("mode")
                        .setDescription("Guess high (≥8) or low (≤6)")
                        .setRequired(true)
                        .addChoices({ name: "High (≥8)", value: "high" }, { name: "Low (≤6)", value: "low" })
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand(true);
        const bet = interaction.options.getInteger("bet", true);

        try {
            // Load config
            const config = await getGamblingConfig(guildId);

            // Check enabled
            if (!config.enabled) {
                const embed = new EmbedBuilder().setDescription(t(locale, "gamble.disabled")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate bet
            if (bet < config.minBet) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.min_bet", { min: String(config.minBet) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (bet > config.maxBet) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.max_bet", { max: String(config.maxBet) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `gamble_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.cooldown", { seconds: String(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Deduct bet
            try {
                await CurrencyService.deduct(userId, guildId, bet, 0, "gambling", {
                    game: subcommand,
                    bet,
                    phase: "deduct",
                });
            } catch (error) {
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    const balance = await CurrencyService.getBalance(userId, guildId);
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "gamble.insufficient", { balance: String(balance.coin) }))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, embed);
                }
                throw error;
            }

            // Play game
            let embed: EmbedBuilder;

            switch (subcommand) {
                case "coinflip": {
                    const result = GamblingService.coinflip();
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "coinflip",
                            bet,
                            result: result.result,
                            won: true,
                            payout,
                        });
                    }

                    const resultText =
                        result.result === "heads"
                            ? t(locale, "gamble.coinflip.heads")
                            : t(locale, "gamble.coinflip.tails");

                    embed = new EmbedBuilder()
                        .setTitle(`🪙 ${t(locale, "gamble.coinflip.title")}`)
                        .setDescription(
                            [
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                `${resultText} ${result.won ? "✅" : "❌"}`,
                                result.won
                                    ? t(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                                    : t(locale, "gamble.payout.lose", { amount: String(bet) }),
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                case "slots": {
                    const result = GamblingService.slots();
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "slots",
                            bet,
                            reels: result.reels,
                            combo: result.combo,
                            won: result.won,
                            payout,
                        });
                    }

                    const comboText = t(locale, `gamble.slots.combo.${result.combo}`);
                    const payoutLine =
                        result.multiplier >= 1
                            ? t(locale, "gamble.payout.win", {
                                  amount: String(payout - bet),
                                  multiplier: String(result.multiplier),
                              })
                            : result.multiplier > 0
                              ? t(locale, "gamble.payout.partial", {
                                    amount: String(payout),
                                    multiplier: String(result.multiplier),
                                })
                              : t(locale, "gamble.payout.lose", { amount: String(bet) });

                    embed = new EmbedBuilder()
                        .setTitle(`🎰 ${t(locale, "gamble.slots.title")}`)
                        .setDescription(
                            [
                                `┃ ${result.reels[0]} ┃ ${result.reels[1]} ┃ ${result.reels[2]} ┃`,
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                `${comboText} ${result.won ? "✅" : "❌"}`,
                                payoutLine,
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                case "dice": {
                    const mode = interaction.options.getString("mode", true) as "high" | "low";
                    const result = GamblingService.dice(mode);
                    const payout = Math.floor(bet * result.multiplier);

                    if (payout > 0) {
                        await CurrencyService.addCoin(userId, guildId, payout, "gambling", {
                            game: "dice",
                            bet,
                            dice: result.dice,
                            total: result.total,
                            mode,
                            won: true,
                            payout,
                        });
                    }

                    const modeText = mode === "high" ? t(locale, "gamble.dice.high") : t(locale, "gamble.dice.low");

                    embed = new EmbedBuilder()
                        .setTitle(`🎲 ${t(locale, "gamble.dice.title")} — ${modeText}`)
                        .setDescription(
                            [
                                `🎲 ${result.dice[0]} + 🎲 ${result.dice[1]} = **${result.total}**`,
                                t(locale, "gamble.bet", { amount: String(bet) }),
                                result.won
                                    ? t(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                                    : t(locale, "gamble.payout.lose", { amount: String(bet) }),
                            ].join("\n")
                        )
                        .setColor(result.won ? 0x57f287 : 0xed4245);
                    break;
                }

                default: {
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                }
            }

            // Set cooldown
            await redis.setJson(cdKey, 1, config.cooldown);

            return Reply.embedEdit(interaction, embed);
        } catch (error) {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
