"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const gambling_service_1 = __importDefault(require("../../services/economy/gambling.service"));
const guildGamblingConfig_model_1 = __importDefault(require("../../models/guildGamblingConfig.model"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const economyLog_service_1 = __importDefault(require("../../services/economy/economyLog.service"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
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
};
async function getGamblingConfig(guildId) {
    const cacheKey = `gambling_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const config = await guildGamblingConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, returnDocument: "after" });
    await redis_1.default.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
async function playGame(params) {
    const { game, bet, diceMode, userId, guildId, locale } = params;
    const cdKey = `gamble_cd:${guildId}:${userId}`;
    // Deduct bet — throws InsufficientFundsError if balance too low
    await currency_service_1.default.deduct(userId, guildId, bet, 0, "gambling", {
        game,
        bet,
        phase: "deduct",
    });
    let embed;
    switch (game) {
        case "coinflip": {
            const result = gambling_service_1.default.coinflip();
            const payout = Math.floor(bet * result.multiplier);
            if (payout > 0) {
                await currency_service_1.default.addCoin(userId, guildId, payout, "gambling", {
                    game: "coinflip",
                    bet,
                    result: result.result,
                    won: true,
                    payout,
                });
                await quest_service_1.default.trackProgress(userId, guildId, "gamble_win").catch(() => { });
                economyLog_service_1.default.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle("Gambling Win")
                        .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on coinflip`)
                        .setColor(0x57f287)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            const resultText = result.result === "heads" ? (0, t_1.t)(locale, "gamble.coinflip.heads") : (0, t_1.t)(locale, "gamble.coinflip.tails");
            embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🪙 ${(0, t_1.t)(locale, "gamble.coinflip.title")}`)
                .setDescription([
                (0, t_1.t)(locale, "gamble.bet", { amount: String(bet) }),
                `${resultText} ${result.won ? "✅" : "❌"}`,
                result.won
                    ? (0, t_1.t)(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                    : (0, t_1.t)(locale, "gamble.payout.lose", { amount: String(bet) }),
            ].join("\n"))
                .setColor(result.won ? 0x57f287 : 0xed4245);
            break;
        }
        case "slots": {
            const result = gambling_service_1.default.slots();
            const payout = Math.floor(bet * result.multiplier);
            if (payout > 0) {
                await currency_service_1.default.addCoin(userId, guildId, payout, "gambling", {
                    game: "slots",
                    bet,
                    reels: result.reels,
                    combo: result.combo,
                    won: result.won,
                    payout,
                });
                await quest_service_1.default.trackProgress(userId, guildId, "gamble_win").catch(() => { });
                economyLog_service_1.default.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle("Gambling Win")
                        .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on slots`)
                        .setColor(0x57f287)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            const comboText = (0, t_1.t)(locale, `gamble.slots.combo.${result.combo}`);
            const payoutLine = result.multiplier >= 1
                ? (0, t_1.t)(locale, "gamble.payout.win", {
                    amount: String(payout - bet),
                    multiplier: String(result.multiplier),
                })
                : result.multiplier > 0
                    ? (0, t_1.t)(locale, "gamble.payout.partial", {
                        amount: String(payout),
                        multiplier: String(result.multiplier),
                    })
                    : (0, t_1.t)(locale, "gamble.payout.lose", { amount: String(bet) });
            embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🎰 ${(0, t_1.t)(locale, "gamble.slots.title")}`)
                .setDescription([
                `┃ ${result.reels[0]} ┃ ${result.reels[1]} ┃ ${result.reels[2]} ┃`,
                (0, t_1.t)(locale, "gamble.bet", { amount: String(bet) }),
                `${comboText} ${result.won ? "✅" : "❌"}`,
                payoutLine,
            ].join("\n"))
                .setColor(result.won ? 0x57f287 : 0xed4245);
            break;
        }
        case "dice": {
            const mode = diceMode ?? "high";
            const result = gambling_service_1.default.dice(mode);
            const payout = Math.floor(bet * result.multiplier);
            if (payout > 0) {
                await currency_service_1.default.addCoin(userId, guildId, payout, "gambling", {
                    game: "dice",
                    bet,
                    dice: result.dice,
                    total: result.total,
                    mode,
                    won: true,
                    payout,
                });
                await quest_service_1.default.trackProgress(userId, guildId, "gamble_win").catch(() => { });
                economyLog_service_1.default.shouldLog(guildId, "gambling_win", payout)
                    .then((should) => {
                    if (!should)
                        return;
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle("Gambling Win")
                        .setDescription(`<@${userId}> won **${payout.toLocaleString()}** coin on dice`)
                        .setColor(0x57f287)
                        .setTimestamp();
                    economyLog_service_1.default.sendLog(guildId, logEmbed);
                })
                    .catch(() => { });
            }
            const modeText = mode === "high" ? (0, t_1.t)(locale, "gamble.dice.high") : (0, t_1.t)(locale, "gamble.dice.low");
            embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🎲 ${(0, t_1.t)(locale, "gamble.dice.title")} — ${modeText}`)
                .setDescription([
                `🎲 ${result.dice[0]} + 🎲 ${result.dice[1]} = **${result.total}**`,
                (0, t_1.t)(locale, "gamble.bet", { amount: String(bet) }),
                result.won
                    ? (0, t_1.t)(locale, "gamble.payout.win", { amount: String(payout - bet), multiplier: "2" })
                    : (0, t_1.t)(locale, "gamble.payout.lose", { amount: String(bet) }),
            ].join("\n"))
                .setColor(result.won ? 0x57f287 : 0xed4245);
            break;
        }
        default: {
            embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "common.unknown_subcommand")).setColor(0xed4245);
        }
    }
    // Set cooldown
    await redis_1.default.setJson(cdKey, 1, GAMBLE_COOLDOWN);
    return embed;
}
// --- buildReplayComponents: buttons + select menu ---
function buildReplayComponents(currentGame, currentDiceMode, locale) {
    // Row 1: Game buttons + Change Bet
    const buttonRow = new discord_js_1.ActionRowBuilder();
    if (currentGame === "dice") {
        buttonRow.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(CUSTOM_ID.DICE_HIGH)
            .setEmoji("🎲")
            .setLabel((0, t_1.t)(locale, "gamble.dice_high_btn"))
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(CUSTOM_ID.DICE_LOW)
            .setEmoji("🎲")
            .setLabel((0, t_1.t)(locale, "gamble.dice_low_btn"))
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    else {
        buttonRow.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(CUSTOM_ID.PLAY_AGAIN)
            .setEmoji("🔄")
            .setLabel((0, t_1.t)(locale, "gamble.play_again"))
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    buttonRow.addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(CUSTOM_ID.CHANGE_BET)
        .setEmoji("💰")
        .setLabel((0, t_1.t)(locale, "gamble.change_bet"))
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    // Row 2: Game switch select menu
    const selectOptions = [];
    if (currentGame !== "coinflip") {
        selectOptions.push(new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel((0, t_1.t)(locale, "gamble.coinflip.title"))
            .setValue("coinflip")
            .setEmoji("🪙"));
    }
    if (currentGame !== "slots") {
        selectOptions.push(new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel((0, t_1.t)(locale, "gamble.slots.title"))
            .setValue("slots")
            .setEmoji("🎰"));
    }
    if (!(currentGame === "dice" && currentDiceMode === "high")) {
        selectOptions.push(new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(`${(0, t_1.t)(locale, "gamble.dice.title")} — ${(0, t_1.t)(locale, "gamble.dice.high")}`)
            .setValue("dice:high")
            .setEmoji("🎲"));
    }
    if (!(currentGame === "dice" && currentDiceMode === "low")) {
        selectOptions.push(new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(`${(0, t_1.t)(locale, "gamble.dice.title")} — ${(0, t_1.t)(locale, "gamble.dice.low")}`)
            .setValue("dice:low")
            .setEmoji("🎲"));
    }
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(CUSTOM_ID.SWITCH_GAME)
        .setPlaceholder(`🎮 ${(0, t_1.t)(locale, "gamble.switch_game")}`)
        .addOptions(selectOptions));
    return [buttonRow, selectRow];
}
// --- buildChangeBetModal ---
function buildChangeBetModal(locale) {
    return new discord_js_1.ModalBuilder()
        .setCustomId(CUSTOM_ID.CHANGE_BET_MODAL)
        .setTitle((0, t_1.t)(locale, "gamble.new_bet_title"))
        .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
        .setCustomId(CUSTOM_ID.NEW_BET_INPUT)
        .setLabel((0, t_1.t)(locale, "gamble.new_bet_label"))
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10)));
}
async function validateAndReplay(ctx) {
    const cdKey = `gamble_cd:${ctx.guildId}:${ctx.userId}`;
    const remaining = await redis_1.default.ttlKey(cdKey);
    if (remaining > 0)
        return { status: "cooldown", seconds: remaining };
    if (await economyAdmin_service_1.default.isFrozen(ctx.userId, ctx.guildId))
        return { status: "frozen" };
    const config = await getGamblingConfig(ctx.guildId);
    if (!config.enabled)
        return { status: "disabled" };
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
        await reply_1.default.embedEditComponents(ctx.interaction, embed, components);
        return { status: "ok", bet };
    }
    catch (error) {
        if (error instanceof currency_service_1.default.InsufficientFundsError) {
            const balance = await currency_service_1.default.getBalance(ctx.userId, ctx.guildId);
            return { status: "insufficient", balance: balance.coin };
        }
        logger_mixed_1.logger.error("Gamble replay error", error);
        return { status: "error" };
    }
}
async function handleReplayResult(result, followUp, locale, collector) {
    switch (result.status) {
        case "ok":
            return;
        case "cooldown":
            await followUp((0, t_1.t)(locale, "gamble.cooldown", { seconds: String(result.seconds) }));
            return;
        case "frozen":
            await followUp((0, t_1.t)(locale, "common.frozen"));
            return;
        case "disabled":
            await followUp((0, t_1.t)(locale, "gamble.disabled"));
            collector.stop();
            return;
        case "insufficient":
            await followUp((0, t_1.t)(locale, "gamble.insufficient", { balance: String(result.balance) }));
            return;
        case "error":
            await followUp((0, t_1.t)(locale, "common.error"));
            return;
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gambling mini-games — bet coins on coinflip, slots, or dice")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.gamble.desc"))
        .addSubcommand((sub) => sub
        .setName("coinflip")
        .setDescription("Flip a coin — 50/50 chance to double your bet")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.gamble.coinflip.desc"))
        .addIntegerOption((opt) => opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("slots")
        .setDescription("Spin the slot machine — match symbols to win")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.gamble.slots.desc"))
        .addIntegerOption((opt) => opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("dice")
        .setDescription("Roll 2 dice — guess high or low to win")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.gamble.dice.desc"))
        .addIntegerOption((opt) => opt.setName("bet").setDescription("Amount of coin to bet").setMinValue(1).setRequired(true))
        .addStringOption((opt) => opt
        .setName("mode")
        .setDescription("Guess high (≥8) or low (≤6)")
        .setRequired(true)
        .addChoices({ name: "High (≥8)", value: "high" }, { name: "Low (≤6)", value: "low" }))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (await economyAdmin_service_1.default.isFrozen(interaction.user.id, interaction.guildId)) {
            await interaction.editReply((0, t_1.t)(locale, "common.frozen"));
            return;
        }
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand(true);
        const initialBet = interaction.options.getInteger("bet", true);
        try {
            // Load config
            const config = await getGamblingConfig(guildId);
            // Check enabled
            if (!config.enabled) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gamble.disabled")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Validate bet
            if (initialBet < config.minBet) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "gamble.min_bet", { min: String(config.minBet) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (initialBet > config.maxBet) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "gamble.max_bet", { max: String(config.maxBet) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Check cooldown
            const cdKey = `gamble_cd:${guildId}:${userId}`;
            const remaining = await redis_1.default.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "gamble.cooldown", { seconds: String(remaining) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // --- Closure state for replay ---
            let currentGame = subcommand;
            let currentBet = initialBet;
            let currentDiceMode = subcommand === "dice" ? interaction.options.getString("mode", true) : undefined;
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
            await reply_1.default.embedEditComponents(interaction, embed, components);
            // --- Collector loop ---
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({ idle: 30_000 });
            collector.on("collect", async (i) => {
                // Owner-only check
                if (i.user.id !== userId) {
                    await i.reply({
                        content: (0, t_1.t)(locale, "gamble.not_your_game"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
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
                        if (!submitted)
                            return;
                        const raw = submitted.fields.getTextInputValue(CUSTOM_ID.NEW_BET_INPUT);
                        const newBet = parseInt(raw, 10);
                        const freshConfig = await getGamblingConfig(guildId);
                        if (isNaN(newBet) || newBet < 1) {
                            await submitted.reply({
                                content: (0, t_1.t)(locale, "gamble.invalid_bet"),
                                flags: discord_js_1.MessageFlags.Ephemeral,
                            });
                            return;
                        }
                        if (newBet < freshConfig.minBet) {
                            await submitted.reply({
                                content: (0, t_1.t)(locale, "gamble.min_bet", { min: String(freshConfig.minBet) }),
                                flags: discord_js_1.MessageFlags.Ephemeral,
                            });
                            return;
                        }
                        if (newBet > freshConfig.maxBet) {
                            await submitted.reply({
                                content: (0, t_1.t)(locale, "gamble.max_bet", { max: String(freshConfig.maxBet) }),
                                flags: discord_js_1.MessageFlags.Ephemeral,
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
                        const followUp = (content) => submitted.followUp({ content, flags: discord_js_1.MessageFlags.Ephemeral });
                        await handleReplayResult(result, followUp, locale, collector);
                        if (result.status === "ok")
                            currentBet = result.bet;
                        return;
                    }
                    // --- Button replays (Play Again / Dice High / Dice Low) ---
                    if (i.isButton()) {
                        if (i.customId === CUSTOM_ID.DICE_HIGH) {
                            currentGame = "dice";
                            currentDiceMode = "high";
                        }
                        else if (i.customId === CUSTOM_ID.DICE_LOW) {
                            currentGame = "dice";
                            currentDiceMode = "low";
                        }
                    }
                    // --- Game switch (StringSelectMenu) ---
                    if (i.isStringSelectMenu() && i.customId === CUSTOM_ID.SWITCH_GAME) {
                        const value = i.values[0];
                        if (value.startsWith("dice:")) {
                            currentGame = "dice";
                            currentDiceMode = value.split(":")[1];
                        }
                        else {
                            currentGame = value;
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
                    const followUp = (content) => i.followUp({ content, flags: discord_js_1.MessageFlags.Ephemeral });
                    await handleReplayResult(result, followUp, locale, collector);
                    if (result.status === "ok")
                        currentBet = result.bet;
                }
                catch (error) {
                    logger_mixed_1.logger.error("Gamble collector error", error);
                }
            });
            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => { });
            });
        }
        catch (error) {
            if (error instanceof currency_service_1.default.InsufficientFundsError) {
                const balance = await currency_service_1.default.getBalance(userId, guildId);
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "gamble.insufficient", { balance: String(balance.coin) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
