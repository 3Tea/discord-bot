# Gamble Replay Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add replay buttons, a game-switch dropdown, and a change-bet modal to `/gamble` results so users can keep playing without re-typing the command.

**Architecture:** Refactor `gamble.ts` by extracting game execution into a `playGame()` helper and component building into `buildReplayComponents()`. After each play, attach buttons + select menu to the result message and listen with a `createMessageComponentCollector` (idle: 30s). Add one new `embedEditComponents()` method to the Reply utility. No new files created.

**Tech Stack:** Discord.js v14 (ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, MessageComponentCollector), i18next, ioredis

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/commands/slash/gamble.ts` | Modify | Extract `playGame()`, `buildReplayComponents()`, `buildChangeBetModal()`, refactor `execute()` to use collector loop |
| `src/util/decorator/reply.ts` | Modify | Add `embedEditComponents()` method |
| `src/locales/en.json` | Modify | Add 9 new `gamble.*` i18n keys |
| `src/locales/vi.json` | Modify | Add 9 new `gamble.*` i18n keys (Vietnamese) |
| `src/locales/id.json` | Modify | Add 9 new `gamble.*` i18n keys (Indonesian) |
| `src/locales/es.json` | Modify | Add 9 new `gamble.*` i18n keys (Spanish) |
| `src/locales/ja.json` | Modify | Add 9 new `gamble.*` i18n keys (Japanese) |
| `src/locales/zh.json` | Modify | Add 9 new `gamble.*` i18n keys (Chinese) |
| `src/locales/ko.json` | Modify | Add 9 new `gamble.*` i18n keys (Korean) |
| `src/locales/pt-BR.json` | Modify | Add 9 new `gamble.*` i18n keys (Portuguese BR) |
| `src/locales/fr.json` | Modify | Add 9 new `gamble.*` i18n keys (French) |
| `src/locales/de.json` | Modify | Add 9 new `gamble.*` i18n keys (German) |
| `src/locales/ru.json` | Modify | Add 9 new `gamble.*` i18n keys (Russian) |
| `src/locales/tr.json` | Modify | Add 9 new `gamble.*` i18n keys (Turkish) |
| `src/locales/it.json` | Modify | Add 9 new `gamble.*` i18n keys (Italian) |
| `src/locales/pl.json` | Modify | Add 9 new `gamble.*` i18n keys (Polish) |
| `src/locales/nl.json` | Modify | Add 9 new `gamble.*` i18n keys (Dutch) |

---

## Task 1: Add i18n keys to all 15 locale files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/ko.json`
- Modify: `src/locales/pt-BR.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/de.json`
- Modify: `src/locales/ru.json`
- Modify: `src/locales/tr.json`
- Modify: `src/locales/it.json`
- Modify: `src/locales/pl.json`
- Modify: `src/locales/nl.json`

- [ ] **Step 1: Add English keys to `src/locales/en.json`**

Add after the existing `"gamble.insufficient"` line (line 565):

```json
"gamble.play_again": "Play Again",
"gamble.change_bet": "Change Bet",
"gamble.switch_game": "Switch Game",
"gamble.not_your_game": "This isn't your game.",
"gamble.dice_high_btn": "High (≥8)",
"gamble.dice_low_btn": "Low (≤6)",
"gamble.new_bet_title": "Change Bet",
"gamble.new_bet_label": "New bet amount",
"gamble.invalid_bet": "Invalid bet amount.",
```

- [ ] **Step 2: Add Vietnamese keys to `src/locales/vi.json`**

Add after the existing `"gamble.insufficient"` line:

```json
"gamble.play_again": "Chơi lại",
"gamble.change_bet": "Đổi cược",
"gamble.switch_game": "Đổi trò chơi",
"gamble.not_your_game": "Đây không phải trò chơi của bạn.",
"gamble.dice_high_btn": "Cao (≥8)",
"gamble.dice_low_btn": "Thấp (≤6)",
"gamble.new_bet_title": "Đổi cược",
"gamble.new_bet_label": "Số tiền cược mới",
"gamble.invalid_bet": "Số tiền cược không hợp lệ.",
```

- [ ] **Step 3: Add keys to all other 13 locale files**

Each file gets native translations for the same 9 keys. Add after the existing `"gamble.insufficient"` line in each file.

**`id.json` (Indonesian):**
```json
"gamble.play_again": "Main Lagi",
"gamble.change_bet": "Ubah Taruhan",
"gamble.switch_game": "Ganti Permainan",
"gamble.not_your_game": "Ini bukan permainanmu.",
"gamble.dice_high_btn": "Tinggi (≥8)",
"gamble.dice_low_btn": "Rendah (≤6)",
"gamble.new_bet_title": "Ubah Taruhan",
"gamble.new_bet_label": "Jumlah taruhan baru",
"gamble.invalid_bet": "Jumlah taruhan tidak valid.",
```

**`es.json` (Spanish):**
```json
"gamble.play_again": "Jugar otra vez",
"gamble.change_bet": "Cambiar apuesta",
"gamble.switch_game": "Cambiar juego",
"gamble.not_your_game": "Este no es tu juego.",
"gamble.dice_high_btn": "Alto (≥8)",
"gamble.dice_low_btn": "Bajo (≤6)",
"gamble.new_bet_title": "Cambiar apuesta",
"gamble.new_bet_label": "Nueva cantidad de apuesta",
"gamble.invalid_bet": "Cantidad de apuesta inválida.",
```

**`ja.json` (Japanese):**
```json
"gamble.play_again": "もう一度プレイ",
"gamble.change_bet": "賭け金を変更",
"gamble.switch_game": "ゲームを変更",
"gamble.not_your_game": "これはあなたのゲームではありません。",
"gamble.dice_high_btn": "ハイ (≥8)",
"gamble.dice_low_btn": "ロー (≤6)",
"gamble.new_bet_title": "賭け金を変更",
"gamble.new_bet_label": "新しい賭け金",
"gamble.invalid_bet": "無効な賭け金です。",
```

**`zh.json` (Chinese):**
```json
"gamble.play_again": "再玩一次",
"gamble.change_bet": "更改赌注",
"gamble.switch_game": "切换游戏",
"gamble.not_your_game": "这不是你的游戏。",
"gamble.dice_high_btn": "高 (≥8)",
"gamble.dice_low_btn": "低 (≤6)",
"gamble.new_bet_title": "更改赌注",
"gamble.new_bet_label": "新赌注金额",
"gamble.invalid_bet": "无效的赌注金额。",
```

**`ko.json` (Korean):**
```json
"gamble.play_again": "다시 플레이",
"gamble.change_bet": "베팅 변경",
"gamble.switch_game": "게임 변경",
"gamble.not_your_game": "이것은 당신의 게임이 아닙니다.",
"gamble.dice_high_btn": "높음 (≥8)",
"gamble.dice_low_btn": "낮음 (≤6)",
"gamble.new_bet_title": "베팅 변경",
"gamble.new_bet_label": "새 베팅 금액",
"gamble.invalid_bet": "잘못된 베팅 금액입니다.",
```

**`pt-BR.json` (Portuguese BR):**
```json
"gamble.play_again": "Jogar novamente",
"gamble.change_bet": "Mudar aposta",
"gamble.switch_game": "Trocar jogo",
"gamble.not_your_game": "Este não é o seu jogo.",
"gamble.dice_high_btn": "Alto (≥8)",
"gamble.dice_low_btn": "Baixo (≤6)",
"gamble.new_bet_title": "Mudar aposta",
"gamble.new_bet_label": "Novo valor da aposta",
"gamble.invalid_bet": "Valor de aposta inválido.",
```

**`fr.json` (French):**
```json
"gamble.play_again": "Rejouer",
"gamble.change_bet": "Changer la mise",
"gamble.switch_game": "Changer de jeu",
"gamble.not_your_game": "Ce n'est pas votre jeu.",
"gamble.dice_high_btn": "Haut (≥8)",
"gamble.dice_low_btn": "Bas (≤6)",
"gamble.new_bet_title": "Changer la mise",
"gamble.new_bet_label": "Nouveau montant de mise",
"gamble.invalid_bet": "Montant de mise invalide.",
```

**`de.json` (German):**
```json
"gamble.play_again": "Nochmal spielen",
"gamble.change_bet": "Einsatz ändern",
"gamble.switch_game": "Spiel wechseln",
"gamble.not_your_game": "Das ist nicht dein Spiel.",
"gamble.dice_high_btn": "Hoch (≥8)",
"gamble.dice_low_btn": "Niedrig (≤6)",
"gamble.new_bet_title": "Einsatz ändern",
"gamble.new_bet_label": "Neuer Einsatzbetrag",
"gamble.invalid_bet": "Ungültiger Einsatzbetrag.",
```

**`ru.json` (Russian):**
```json
"gamble.play_again": "Играть снова",
"gamble.change_bet": "Изменить ставку",
"gamble.switch_game": "Сменить игру",
"gamble.not_your_game": "Это не ваша игра.",
"gamble.dice_high_btn": "Высокий (≥8)",
"gamble.dice_low_btn": "Низкий (≤6)",
"gamble.new_bet_title": "Изменить ставку",
"gamble.new_bet_label": "Новая сумма ставки",
"gamble.invalid_bet": "Недопустимая сумма ставки.",
```

**`tr.json` (Turkish):**
```json
"gamble.play_again": "Tekrar oyna",
"gamble.change_bet": "Bahsi değiştir",
"gamble.switch_game": "Oyun değiştir",
"gamble.not_your_game": "Bu senin oyunun değil.",
"gamble.dice_high_btn": "Yüksek (≥8)",
"gamble.dice_low_btn": "Düşük (≤6)",
"gamble.new_bet_title": "Bahsi değiştir",
"gamble.new_bet_label": "Yeni bahis miktarı",
"gamble.invalid_bet": "Geçersiz bahis miktarı.",
```

**`it.json` (Italian):**
```json
"gamble.play_again": "Gioca ancora",
"gamble.change_bet": "Cambia puntata",
"gamble.switch_game": "Cambia gioco",
"gamble.not_your_game": "Questo non è il tuo gioco.",
"gamble.dice_high_btn": "Alto (≥8)",
"gamble.dice_low_btn": "Basso (≤6)",
"gamble.new_bet_title": "Cambia puntata",
"gamble.new_bet_label": "Nuovo importo della puntata",
"gamble.invalid_bet": "Importo della puntata non valido.",
```

**`pl.json` (Polish):**
```json
"gamble.play_again": "Zagraj ponownie",
"gamble.change_bet": "Zmień zakład",
"gamble.switch_game": "Zmień grę",
"gamble.not_your_game": "To nie twoja gra.",
"gamble.dice_high_btn": "Wysoki (≥8)",
"gamble.dice_low_btn": "Niski (≤6)",
"gamble.new_bet_title": "Zmień zakład",
"gamble.new_bet_label": "Nowa kwota zakładu",
"gamble.invalid_bet": "Nieprawidłowa kwota zakładu.",
```

**`nl.json` (Dutch):**
```json
"gamble.play_again": "Opnieuw spelen",
"gamble.change_bet": "Inzet wijzigen",
"gamble.switch_game": "Spel wisselen",
"gamble.not_your_game": "Dit is niet jouw spel.",
"gamble.dice_high_btn": "Hoog (≥8)",
"gamble.dice_low_btn": "Laag (≤6)",
"gamble.new_bet_title": "Inzet wijzigen",
"gamble.new_bet_label": "Nieuw inzetbedrag",
"gamble.invalid_bet": "Ongeldig inzetbedrag.",
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile, no missing key errors.

- [ ] **Step 5: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add gamble replay button translation keys to all 15 locales"
```

---

## Task 2: Add `embedEditComponents()` to Reply utility

**Files:**
- Modify: `src/util/decorator/reply.ts`

- [ ] **Step 1: Add imports**

Add `StringSelectMenuBuilder` and `MessageActionRowComponentBuilder` to the import statement at `src/util/decorator/reply.ts:1`:

Change:
```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
} from "discord.js";
```

To:
```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
    type MessageActionRowComponentBuilder,
} from "discord.js";
```

- [ ] **Step 2: Add `embedEditComponents()` method**

Add the following method inside the `Reply` class, after the existing `embedEdit()` method (after line 42):

```typescript
async embedEditComponents(
    interaction: ChatInputCommandInteraction,
    embed: EmbedBuilder,
    components: ActionRowBuilder<MessageActionRowComponentBuilder>[]
) {
    applyFooter(embed);
    return interaction.editReply({ embeds: [embed], components });
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 4: Commit**

```bash
git add src/util/decorator/reply.ts
git commit -m "feat(reply): add embedEditComponents method for multi-row component responses"
```

---

## Task 3: Extract `playGame()` helper from gamble.ts

**Files:**
- Modify: `src/commands/slash/gamble.ts`

This task extracts the game execution logic (deduct bet → run game → add payout → quest/log → set cooldown → build embed) into a reusable `playGame()` function. The `execute()` method continues to call this function exactly as before — no behavior change.

- [ ] **Step 1: Add the `PlayGameParams` type and `playGame()` function**

Add after the `getGamblingConfig()` function (after line 31), before `export default`:

```typescript
interface PlayGameParams {
    game: "coinflip" | "slots" | "dice";
    bet: number;
    diceMode?: "high" | "low";
    userId: string;
    guildId: string;
    locale: SupportedLocale;
}

async function playGame(params: PlayGameParams): Promise<EmbedBuilder> {
    const { game, bet, userId, guildId, locale } = params;

    // Deduct bet
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
            const mode = params.diceMode ?? "high";
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
            embed = new EmbedBuilder()
                .setDescription(t(locale, "common.unknown_subcommand"))
                .setColor(0xed4245);
        }
    }

    // Set cooldown
    const cdKey = `gamble_cd:${guildId}:${userId}`;
    await redis.setJson(cdKey, 1, GAMBLE_COOLDOWN);

    return embed;
}
```

- [ ] **Step 2: Refactor `execute()` to use `playGame()`**

Replace the entire `try` block inside `execute()` (lines 94–312) with:

```typescript
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

            // Play game
            const diceMode = subcommand === "dice" ? (interaction.options.getString("mode", true) as "high" | "low") : undefined;

            try {
                const embed = await playGame({ game: subcommand as "coinflip" | "slots" | "dice", bet, diceMode, userId, guildId, locale });
                return Reply.embedEdit(interaction, embed);
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
        } catch (error) {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
```

- [ ] **Step 3: Verify build and behavior is unchanged**

Run: `npm run build`
Expected: Clean compile. The command behaves identically — no buttons yet, just refactored internals.

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/gamble.ts
git commit -m "refactor(gamble): extract playGame helper for reuse in replay loop"
```

---

## Task 4: Add `buildReplayComponents()` and `buildChangeBetModal()` helpers

**Files:**
- Modify: `src/commands/slash/gamble.ts`

- [ ] **Step 1: Add new imports**

At `src/commands/slash/gamble.ts:1`, update the discord.js import to include all needed types:

Change:
```typescript
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
```

To:
```typescript
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
```

- [ ] **Step 2: Add `buildReplayComponents()` function**

Add after the `playGame()` function, before `export default`:

```typescript
function buildReplayComponents(
    currentGame: "coinflip" | "slots" | "dice",
    currentDiceMode: "high" | "low" | undefined,
    locale: SupportedLocale
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();

    if (currentGame === "dice") {
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId("gamble_dice_high")
                .setLabel(`🎲 ${t(locale, "gamble.dice_high_btn")}`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("gamble_dice_low")
                .setLabel(`🎲 ${t(locale, "gamble.dice_low_btn")}`)
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId("gamble_play_again")
                .setLabel(`🔄 ${t(locale, "gamble.play_again")}`)
                .setStyle(ButtonStyle.Primary)
        );
    }

    buttonRow.addComponents(
        new ButtonBuilder()
            .setCustomId("gamble_change_bet")
            .setLabel(`💰 ${t(locale, "gamble.change_bet")}`)
            .setStyle(ButtonStyle.Secondary)
    );

    // Game switch dropdown — exclude current game
    const gameOptions: { game: string; diceMode?: "high" | "low"; label: string; emoji: string }[] = [
        { game: "coinflip", label: t(locale, "gamble.coinflip.title"), emoji: "🪙" },
        { game: "slots", label: t(locale, "gamble.slots.title"), emoji: "🎰" },
        { game: "dice", diceMode: "high", label: `${t(locale, "gamble.dice.title")} — ${t(locale, "gamble.dice.high")}`, emoji: "🎲" },
        { game: "dice", diceMode: "low", label: `${t(locale, "gamble.dice.title")} — ${t(locale, "gamble.dice.low")}`, emoji: "🎲" },
    ];

    const filteredOptions = gameOptions.filter((opt) => {
        if (opt.game === currentGame && opt.game !== "dice") return false;
        if (opt.game === "dice" && currentGame === "dice" && opt.diceMode === currentDiceMode) return false;
        return true;
    });

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("gamble_switch_game")
            .setPlaceholder(`🎮 ${t(locale, "gamble.switch_game")}`)
            .addOptions(
                filteredOptions.map((opt) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(opt.label)
                        .setValue(opt.diceMode ? `${opt.game}:${opt.diceMode}` : opt.game)
                        .setEmoji(opt.emoji)
                )
            )
    );

    return [buttonRow, selectRow] as ActionRowBuilder<MessageActionRowComponentBuilder>[];
}
```

- [ ] **Step 3: Add `buildChangeBetModal()` function**

Add after `buildReplayComponents()`:

```typescript
function buildChangeBetModal(locale: SupportedLocale): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId("gamble_change_bet_modal")
        .setTitle(t(locale, "gamble.new_bet_title"));

    const betInput = new TextInputBuilder()
        .setCustomId("gamble_new_bet_input")
        .setLabel(t(locale, "gamble.new_bet_label"))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(betInput));
    return modal;
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile. Functions exist but are not yet called.

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/gamble.ts
git commit -m "feat(gamble): add buildReplayComponents and buildChangeBetModal helpers"
```

---

## Task 5: Wire up the collector loop in `execute()`

**Files:**
- Modify: `src/commands/slash/gamble.ts`

This is the core task — after the initial play, attach buttons + select menu and start the collector loop.

- [ ] **Step 1: Import Reply at top if not already**

Ensure this import exists (it should from the original file):
```typescript
import Reply from "../../util/decorator/reply";
```

- [ ] **Step 2: Replace the game execution block in `execute()`**

In the `execute()` function's try block, replace the section that calls `playGame()` and returns (the inner try/catch with `playGame` + `Reply.embedEdit`). Replace from the `// Play game` comment through the inner try/catch:

```typescript
            // Play game
            let currentGame = subcommand as "coinflip" | "slots" | "dice";
            let currentBet = bet;
            let currentDiceMode: "high" | "low" | undefined =
                subcommand === "dice" ? (interaction.options.getString("mode", true) as "high" | "low") : undefined;

            let embed: EmbedBuilder;
            try {
                embed = await playGame({ game: currentGame, bet: currentBet, diceMode: currentDiceMode, userId, guildId, locale });
            } catch (error) {
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    const balance = await CurrencyService.getBalance(userId, guildId);
                    const errEmbed = new EmbedBuilder()
                        .setDescription(t(locale, "gamble.insufficient", { balance: String(balance.coin) }))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, errEmbed);
                }
                throw error;
            }

            // Send result with replay components
            const components = buildReplayComponents(currentGame, currentDiceMode, locale);
            await Reply.embedEditComponents(interaction, embed, components);

            // Collector loop
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({ idle: 30_000 });

            collector.on("collect", async (i) => {
                // Owner-only check
                if (i.user.id !== userId) {
                    await i.reply({ content: t(locale, "gamble.not_your_game"), flags: MessageFlags.Ephemeral });
                    return;
                }

                try {
                    // Handle "Change Bet" — show modal
                    if (i.customId === "gamble_change_bet") {
                        const modal = buildChangeBetModal(locale);
                        await i.showModal(modal);

                        const submitted = await i
                            .awaitModalSubmit({
                                filter: (m) => m.customId === "gamble_change_bet_modal" && m.user.id === userId,
                                time: 30_000,
                            })
                            .catch(() => null);

                        if (!submitted) return; // Modal dismissed or timed out

                        const rawBet = submitted.fields.getTextInputValue("gamble_new_bet_input");
                        const newBet = parseInt(rawBet, 10);

                        // Validate new bet
                        if (isNaN(newBet) || newBet < 1) {
                            await submitted.reply({ content: t(locale, "gamble.invalid_bet"), flags: MessageFlags.Ephemeral });
                            return;
                        }

                        const cfg = await getGamblingConfig(guildId);
                        if (newBet < cfg.minBet) {
                            await submitted.reply({ content: t(locale, "gamble.min_bet", { min: String(cfg.minBet) }), flags: MessageFlags.Ephemeral });
                            return;
                        }
                        if (newBet > cfg.maxBet) {
                            await submitted.reply({ content: t(locale, "gamble.max_bet", { max: String(cfg.maxBet) }), flags: MessageFlags.Ephemeral });
                            return;
                        }

                        // Check cooldown
                        const cdKey = `gamble_cd:${guildId}:${userId}`;
                        const remaining = await redis.ttlKey(cdKey);
                        if (remaining > 0) {
                            await submitted.reply({ content: t(locale, "gamble.cooldown", { seconds: String(remaining) }), flags: MessageFlags.Ephemeral });
                            return;
                        }

                        // Check freeze
                        if (await EconomyAdminService.isFrozen(userId, guildId)) {
                            await submitted.reply({ content: t(locale, "common.frozen"), flags: MessageFlags.Ephemeral });
                            return;
                        }

                        currentBet = newBet;

                        try {
                            const newEmbed = await playGame({ game: currentGame, bet: currentBet, diceMode: currentDiceMode, userId, guildId, locale });
                            const newComponents = buildReplayComponents(currentGame, currentDiceMode, locale);
                            await submitted.deferUpdate();
                            await Reply.embedEditComponents(interaction, newEmbed, newComponents);
                        } catch (error) {
                            if (error instanceof CurrencyService.InsufficientFundsError) {
                                const balance = await CurrencyService.getBalance(userId, guildId);
                                await submitted.reply({ content: t(locale, "gamble.insufficient", { balance: String(balance.coin) }), flags: MessageFlags.Ephemeral });
                            } else {
                                await submitted.reply({ content: t(locale, "common.error"), flags: MessageFlags.Ephemeral });
                            }
                        }
                        return;
                    }

                    // For button/select interactions — deferUpdate first
                    await i.deferUpdate();

                    // Determine game and mode from interaction
                    if (i.customId === "gamble_play_again") {
                        // Same game, same bet (coinflip or slots)
                    } else if (i.customId === "gamble_dice_high") {
                        currentGame = "dice";
                        currentDiceMode = "high";
                    } else if (i.customId === "gamble_dice_low") {
                        currentGame = "dice";
                        currentDiceMode = "low";
                    } else if (i.customId === "gamble_switch_game" && i.isStringSelectMenu()) {
                        const value = i.values[0];
                        if (value.includes(":")) {
                            const [game, mode] = value.split(":");
                            currentGame = game as "coinflip" | "slots" | "dice";
                            currentDiceMode = mode as "high" | "low";
                        } else {
                            currentGame = value as "coinflip" | "slots";
                            currentDiceMode = undefined;
                        }
                    }

                    // Check cooldown
                    const cdKey = `gamble_cd:${guildId}:${userId}`;
                    const remaining = await redis.ttlKey(cdKey);
                    if (remaining > 0) {
                        await i.followUp({ content: t(locale, "gamble.cooldown", { seconds: String(remaining) }), flags: MessageFlags.Ephemeral });
                        return;
                    }

                    // Check freeze
                    if (await EconomyAdminService.isFrozen(userId, guildId)) {
                        await i.followUp({ content: t(locale, "common.frozen"), flags: MessageFlags.Ephemeral });
                        return;
                    }

                    // Check gambling still enabled
                    const cfg = await getGamblingConfig(guildId);
                    if (!cfg.enabled) {
                        await i.followUp({ content: t(locale, "gamble.disabled"), flags: MessageFlags.Ephemeral });
                        collector.stop();
                        return;
                    }

                    // Validate current bet still within limits
                    if (currentBet < cfg.minBet || currentBet > cfg.maxBet) {
                        currentBet = Math.max(cfg.minBet, Math.min(currentBet, cfg.maxBet));
                    }

                    // Play game
                    try {
                        const newEmbed = await playGame({ game: currentGame, bet: currentBet, diceMode: currentDiceMode, userId, guildId, locale });
                        const newComponents = buildReplayComponents(currentGame, currentDiceMode, locale);
                        await Reply.embedEditComponents(interaction, newEmbed, newComponents);
                    } catch (error) {
                        if (error instanceof CurrencyService.InsufficientFundsError) {
                            const balance = await CurrencyService.getBalance(userId, guildId);
                            await i.followUp({ content: t(locale, "gamble.insufficient", { balance: String(balance.coin) }), flags: MessageFlags.Ephemeral });
                        } else {
                            await i.followUp({ content: t(locale, "common.error"), flags: MessageFlags.Ephemeral });
                        }
                    }
                } catch {
                    // Silently handle unexpected collector errors
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });
```

- [ ] **Step 3: Clean up unused import**

The `Reply.embedEdit` call for the final game result is now replaced by `Reply.embedEditComponents`. Check if `Reply.embedEdit` is still used elsewhere in the function (it is — for error responses like disabled, min/max bet, cooldown). Keep the import.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/gamble.ts
git commit -m "feat(gamble): add replay buttons, game-switch dropdown, and change-bet modal"
```

---

## Task 6: Manual testing in development

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run start:dev`
Expected: Bot connects to Discord gateway successfully.

- [ ] **Step 2: Test coinflip with replay**

In a Discord test channel:
1. Run `/gamble coinflip bet:50`
2. Verify result embed shows with buttons: `[🔄 Play Again] [💰 Change Bet]` and dropdown `[🎮 Switch Game ▾]`
3. Wait for cooldown (~30s), click "Play Again"
4. Verify new result replaces the old one with same bet (50), buttons still present
5. Wait for timeout (30s no action) — verify buttons disappear

- [ ] **Step 3: Test dice with high/low buttons**

1. Run `/gamble dice bet:100 mode:High`
2. Verify buttons show: `[🎲 High (≥8)] [🎲 Low (≤6)] [💰 Change Bet]`
3. Wait for cooldown, click "Low (≤6)"
4. Verify dice plays with low mode, bet stays 100

- [ ] **Step 4: Test game switching via dropdown**

1. Run `/gamble slots bet:75`
2. Open dropdown — verify it shows Coinflip, Dice (High), Dice (Low) (no Slots since that's current)
3. Select "Dice — High"
4. Verify dice game plays with bet 75

- [ ] **Step 5: Test Change Bet**

1. Run `/gamble coinflip bet:50`
2. Click "Change Bet" — verify modal appears
3. Enter "200" — verify coinflip plays with new bet 200
4. Click "Play Again" — verify bet is now 200 (persisted from change)

- [ ] **Step 6: Test edge cases**

1. **Non-owner click**: Have another user (or alt account) click a button — verify ephemeral "This isn't your game."
2. **Insufficient funds**: Set bet high enough to drain balance, click replay — verify ephemeral insufficient funds error, buttons remain
3. **Cooldown**: Click replay immediately after playing — verify ephemeral cooldown message
4. **Invalid bet in modal**: Enter "abc" or "0" — verify ephemeral "Invalid bet amount."
5. **Min/max bet**: Enter bet below server min or above max in modal — verify appropriate error

- [ ] **Step 7: Commit any fixes found during testing**

```bash
git add src/commands/slash/gamble.ts
git commit -m "fix(gamble): address issues found during manual testing"
```

Only create this commit if fixes were needed.
