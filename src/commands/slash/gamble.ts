import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    type MessageActionRowComponentBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import GamblingService from "../../services/economy/gambling.service";
import GuildGamblingConfigModel, { IGuildGamblingConfig } from "../../models/guildGamblingConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import EconomyAdminService from "../../services/economy/economyAdmin.service";
import QuestService from "../../services/quest/quest.service";
import EconomyLogService from "../../services/economy/economyLog.service";
import { logger } from "../../util/log/logger.mixed";

const CONFIG_CACHE_TTL = 300;
const GAMBLE_COOLDOWN = 30; // seconds

// --- Custom IDs (local to this command, not in BUTTON_ID) ---
const CUSTOM_ID = {
    PLAY_AGAIN: "gamble_play_again",
    DICE_HIGH: "gamble_dice_high",
    DICE_LOW: "gamble_dice_low",
    CHANGE_BET: "gamble_change_bet",
    SWITCH_GAME: "gamble_switch_game",
    CHANGE_BET_MODAL: "gamble_change_bet_modal",
    NEW_BET_INPUT: "gamble_new_bet_input",
} as const;

type GameType = "coinflip" | "slots" | "dice";

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

// --- playGame: extracted game execution logic ---

interface PlayGameParams {
    game: GameType;
    bet: number;
    diceMode?: "high" | "low";
    userId: string;
    guildId: string;
    locale: SupportedLocale;
}

async function playGame(params: PlayGameParams): Promise<EmbedBuilder> {
    const { game, bet, diceMode, userId, guildId, locale } = params;
    const cdKey = `gamble_cd:${guildId}:${userId}`;

    // Deduct bet — throws InsufficientFundsError if balance too low
    await CurrencyService.deduct(userId, guildId, bet, 0, "gambling", {
        game,
        bet,
        phase: "deduct",
    });

    let embed: EmbedBuilder;

    switch (game) {
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
                await QuestService.trackProgress(userId, guildId, "gamble_win").catch(() => {});
                EconomyLogService.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                        if (!should) return;
                        const logEmbed = new EmbedBuilder()
                            .setTitle("Gambling Win")
                            .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on coinflip`)
                            .setColor(0x57f287)
                            .setTimestamp();
                        EconomyLogService.sendLog(guildId, logEmbed);
                    })
                    .catch(() => {});
            }

            const resultText =
                result.result === "heads" ? t(locale, "gamble.coinflip.heads") : t(locale, "gamble.coinflip.tails");

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
                await QuestService.trackProgress(userId, guildId, "gamble_win").catch(() => {});
                EconomyLogService.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                        if (!should) return;
                        const logEmbed = new EmbedBuilder()
                            .setTitle("Gambling Win")
                            .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on slots`)
                            .setColor(0x57f287)
                            .setTimestamp();
                        EconomyLogService.sendLog(guildId, logEmbed);
                    })
                    .catch(() => {});
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
            const mode = diceMode ?? "high";
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
                await QuestService.trackProgress(userId, guildId, "gamble_win").catch(() => {});
                EconomyLogService.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                        if (!should) return;
                        const logEmbed = new EmbedBuilder()
                            .setTitle("Gambling Win")
                            .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on dice`)
                            .setColor(0x57f287)
                            .setTimestamp();
                        EconomyLogService.sendLog(guildId, logEmbed);
                    })
                    .catch(() => {});
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
            embed = new EmbedBuilder().setDescription(t(locale, "common.unknown_subcommand")).setColor(0xed4245);
        }
    }

    // Set cooldown
    await redis.setJson(cdKey, 1, GAMBLE_COOLDOWN);

    return embed;
}

// --- buildReplayComponents: buttons + select menu ---

function buildReplayComponents(
    currentGame: GameType,
    currentDiceMode: "high" | "low" | undefined,
    locale: SupportedLocale
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
    // Row 1: Game buttons + Change Bet
    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    if (currentGame === "dice") {
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_ID.DICE_HIGH)
                .setEmoji("🎲")
                .setLabel(t(locale, "gamble.dice_high_btn"))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(CUSTOM_ID.DICE_LOW)
                .setEmoji("🎲")
                .setLabel(t(locale, "gamble.dice_low_btn"))
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_ID.PLAY_AGAIN)
                .setEmoji("🔄")
                .setLabel(t(locale, "gamble.play_again"))
                .setStyle(ButtonStyle.Primary)
        );
    }

    buttonRow.addComponents(
        new ButtonBuilder()
            .setCustomId(CUSTOM_ID.CHANGE_BET)
            .setEmoji("💰")
            .setLabel(t(locale, "gamble.change_bet"))
            .setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Game switch select menu
    const selectOptions: StringSelectMenuOptionBuilder[] = [];

    if (currentGame !== "coinflip") {
        selectOptions.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(t(locale, "gamble.coinflip.title"))
                .setValue("coinflip")
                .setEmoji("🪙")
        );
    }
    if (currentGame !== "slots") {
        selectOptions.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(t(locale, "gamble.slots.title"))
                .setValue("slots")
                .setEmoji("🎰")
        );
    }
    if (!(currentGame === "dice" && currentDiceMode === "high")) {
        selectOptions.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${t(locale, "gamble.dice.title")} — ${t(locale, "gamble.dice.high")}`)
                .setValue("dice:high")
                .setEmoji("🎲")
        );
    }
    if (!(currentGame === "dice" && currentDiceMode === "low")) {
        selectOptions.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${t(locale, "gamble.dice.title")} — ${t(locale, "gamble.dice.low")}`)
                .setValue("dice:low")
                .setEmoji("🎲")
        );
    }

    const selectRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(CUSTOM_ID.SWITCH_GAME)
            .setPlaceholder(`🎮 ${t(locale, "gamble.switch_game")}`)
            .addOptions(selectOptions)
    );

    return [buttonRow, selectRow];
}

// --- buildChangeBetModal ---

function buildChangeBetModal(locale: SupportedLocale): ModalBuilder {
    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.CHANGE_BET_MODAL)
        .setTitle(t(locale, "gamble.new_bet_title"))
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(CUSTOM_ID.NEW_BET_INPUT)
                    .setLabel(t(locale, "gamble.new_bet_label"))
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(10)
            )
        );
}

// --- validateAndReplay: shared validation + play + update logic for collector ---

interface ReplayContext {
    interaction: ChatInputCommandInteraction;
    userId: string;
    guildId: string;
    locale: SupportedLocale;
    currentGame: GameType;
    currentBet: number;
    currentDiceMode: "high" | "low" | undefined;
}

type ReplayResult =
    | { status: "ok"; bet: number }
    | { status: "cooldown"; seconds: number }
    | { status: "frozen" }
    | { status: "disabled" }
    | { status: "insufficient"; balance: number }
    | { status: "error" };

async function validateAndReplay(ctx: ReplayContext): Promise<ReplayResult> {
    const cdKey = `gamble_cd:${ctx.guildId}:${ctx.userId}`;
    const remaining = await redis.ttlKey(cdKey);
    if (remaining > 0) return { status: "cooldown", seconds: remaining };

    if (await EconomyAdminService.isFrozen(ctx.userId, ctx.guildId)) return { status: "frozen" };

    const config = await getGamblingConfig(ctx.guildId);
    if (!config.enabled) return { status: "disabled" };

    // Auto-clamp bet if config changed
    const bet = Math.max(config.minBet, Math.min(config.maxBet, ctx.currentBet));

    try {
        const embed = await playGame({
            game: ctx.currentGame,
            bet,
            diceMode: ctx.currentDiceMode,
            userId: ctx.userId,
            guildId: ctx.guildId,
            locale: ctx.locale,
        });
        const components = buildReplayComponents(ctx.currentGame, ctx.currentDiceMode, ctx.locale);
        await Reply.embedEditComponents(ctx.interaction, embed, components);
        return { status: "ok", bet };
    } catch (error) {
        if (error instanceof CurrencyService.InsufficientFundsError) {
            const balance = await CurrencyService.getBalance(ctx.userId, ctx.guildId);
            return { status: "insufficient", balance: balance.coin };
        }
        logger.error("Gamble replay error", error);
        return { status: "error" };
    }
}

async function handleReplayResult(
    result: ReplayResult,
    followUp: (content: string) => Promise<unknown>,
    locale: SupportedLocale,
    collector: { stop: () => void }
): Promise<void> {
    switch (result.status) {
        case "ok":
            return;
        case "cooldown":
            await followUp(t(locale, "gamble.cooldown", { seconds: String(result.seconds) }));
            return;
        case "frozen":
            await followUp(t(locale, "common.frozen"));
            return;
        case "disabled":
            await followUp(t(locale, "gamble.disabled"));
            collector.stop();
            return;
        case "insufficient":
            await followUp(t(locale, "gamble.insufficient", { balance: String(result.balance) }));
            return;
        case "error":
            await followUp(t(locale, "common.error"));
            return;
    }
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
                .setDescriptionLocalizations(descriptionLocales("cmd.gamble.coinflip.desc"))
                .addIntegerOption((opt) =>
                    opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("slots")
                .setDescription("Spin the slot machine — match symbols to win")
                .setDescriptionLocalizations(descriptionLocales("cmd.gamble.slots.desc"))
                .addIntegerOption((opt) =>
                    opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("dice")
                .setDescription("Roll 2 dice — guess high or low to win")
                .setDescriptionLocalizations(descriptionLocales("cmd.gamble.dice.desc"))
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

        if (await EconomyAdminService.isFrozen(interaction.user.id, interaction.guildId!)) {
            await interaction.editReply(t(locale, "common.frozen"));
            return;
        }

        const guildId = interaction.guildId!;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand(true);
        const initialBet = interaction.options.getInteger("bet", true);

        try {
            // Load config
            const config = await getGamblingConfig(guildId);

            // Check enabled
            if (!config.enabled) {
                const embed = new EmbedBuilder().setDescription(t(locale, "gamble.disabled")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate bet
            if (initialBet < config.minBet) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.min_bet", { min: String(config.minBet) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (initialBet > config.maxBet) {
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

            // --- Closure state for replay ---
            let currentGame: GameType = subcommand as GameType;
            let currentBet = initialBet;
            let currentDiceMode: "high" | "low" | undefined =
                subcommand === "dice" ? (interaction.options.getString("mode", true) as "high" | "low") : undefined;

            // Initial play
            const embed = await playGame({
                game: currentGame,
                bet: currentBet,
                diceMode: currentDiceMode,
                userId,
                guildId,
                locale,
            });

            const components = buildReplayComponents(currentGame, currentDiceMode, locale);
            await Reply.embedEditComponents(interaction, embed, components);

            // --- Collector loop ---
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({ idle: 30_000 });

            collector.on("collect", async (i) => {
                // Owner-only check
                if (i.user.id !== userId) {
                    await i.reply({
                        content: t(locale, "gamble.not_your_game"),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                try {
                    // --- Change Bet (opens modal) ---
                    if (i.isButton() && i.customId === CUSTOM_ID.CHANGE_BET) {
                        const modal = buildChangeBetModal(locale);
                        await i.showModal(modal);

                        const submitted = await i
                            .awaitModalSubmit({
                                filter: (mi) => mi.customId === CUSTOM_ID.CHANGE_BET_MODAL && mi.user.id === userId,
                                time: 30_000,
                            })
                            .catch(() => null);

                        if (!submitted) return;

                        const raw = submitted.fields.getTextInputValue(CUSTOM_ID.NEW_BET_INPUT);
                        const newBet = parseInt(raw, 10);

                        const freshConfig = await getGamblingConfig(guildId);

                        if (isNaN(newBet) || newBet < 1) {
                            await submitted.reply({
                                content: t(locale, "gamble.invalid_bet"),
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                        if (newBet < freshConfig.minBet) {
                            await submitted.reply({
                                content: t(locale, "gamble.min_bet", { min: String(freshConfig.minBet) }),
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                        if (newBet > freshConfig.maxBet) {
                            await submitted.reply({
                                content: t(locale, "gamble.max_bet", { max: String(freshConfig.maxBet) }),
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }

                        await submitted.deferUpdate();
                        currentBet = newBet;

                        const result = await validateAndReplay({
                            interaction,
                            userId,
                            guildId,
                            locale,
                            currentGame,
                            currentBet,
                            currentDiceMode,
                        });
                        const followUp = (content: string) =>
                            submitted.followUp({ content, flags: MessageFlags.Ephemeral });
                        await handleReplayResult(result, followUp, locale, collector);
                        if (result.status === "ok") currentBet = result.bet;
                        return;
                    }

                    // --- Button replays (Play Again / Dice High / Dice Low) ---
                    if (i.isButton()) {
                        if (i.customId === CUSTOM_ID.DICE_HIGH) {
                            currentGame = "dice";
                            currentDiceMode = "high";
                        } else if (i.customId === CUSTOM_ID.DICE_LOW) {
                            currentGame = "dice";
                            currentDiceMode = "low";
                        }
                    }

                    // --- Game switch (StringSelectMenu) ---
                    if (i.isStringSelectMenu() && i.customId === CUSTOM_ID.SWITCH_GAME) {
                        const value = i.values[0];
                        if (value.startsWith("dice:")) {
                            currentGame = "dice";
                            currentDiceMode = value.split(":")[1] as "high" | "low";
                        } else {
                            currentGame = value as GameType;
                            currentDiceMode = undefined;
                        }
                    }

                    await i.deferUpdate();

                    const result = await validateAndReplay({
                        interaction,
                        userId,
                        guildId,
                        locale,
                        currentGame,
                        currentBet,
                        currentDiceMode,
                    });
                    const followUp = (content: string) => i.followUp({ content, flags: MessageFlags.Ephemeral });
                    await handleReplayResult(result, followUp, locale, collector);
                    if (result.status === "ok") currentBet = result.bet;
                } catch (error) {
                    logger.error("Gamble collector error", error);
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                const balance = await CurrencyService.getBalance(userId, guildId);
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "gamble.insufficient", { balance: String(balance.coin) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
