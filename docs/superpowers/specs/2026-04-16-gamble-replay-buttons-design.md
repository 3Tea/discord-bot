# Gamble Replay Buttons Design

**Date:** 2026-04-16
**Status:** Approved

## Problem

Users must re-type `/gamble <game> <bet>` every time they want to play again. This is tedious for repeated sessions. The first play should use the slash command, but subsequent plays should be available via buttons for convenience.

## Solution

Add replay buttons and a game-switch dropdown to the gamble result message, using an inline `awaitMessageComponent` collector loop within `gamble.ts`. No new files are created.

## Decisions

| Question | Answer |
|----------|--------|
| Bet on replay | Option C — "Play Again (same bet)" plays immediately + "Change Bet" opens modal for new amount |
| Game switching | Select dropdown menu (scales for future games) |
| Button timeout | 30 seconds (matches existing cooldown) |
| Dice replay | Two buttons: "High (≥8)" and "Low (≤6)" instead of single "Play Again" |
| Change Bet modal | Opens Discord Modal with 1 text input, plays immediately after submit |
| Owner-only | Only original player can interact; others get ephemeral "not your game" |

## UI Components

### Row 1 — Buttons

| Button | Label | Style | Condition |
|--------|-------|-------|-----------|
| Play Again | `🔄 Play Again` | Primary | coinflip, slots |
| Again High | `🎲 High (≥8)` | Primary | dice only |
| Again Low | `🎲 Low (≤6)` | Primary | dice only |
| Change Bet | `💰 Change Bet` | Secondary | always |

### Row 2 — Select Menu

| Component | Placeholder | Options |
|-----------|------------|---------|
| StringSelectMenu | `🎮 Switch Game` | Coinflip, Slots, Dice (High), Dice (Low) — hides current game |

### Visual Examples

Coinflip result (bet 100, won):
```
🪙 Coinflip
Bet: 100 coin
Heads ✅
+100 coin (×2)

[🔄 Play Again]  [💰 Change Bet]
[🎮 Switch Game ▾]
```

Dice result (bet 200, high, won):
```
🎲 Dice — High
🎲 4 + 🎲 5 = 9
Bet: 200 coin
+200 coin (×2)

[🎲 High (≥8)]  [🎲 Low (≤6)]  [💰 Change Bet]
[🎮 Switch Game ▾]
```

## Game Loop Flow

```
/gamble <game> <bet>
  → deferReply()
  → validate (freeze, config, bet, balance, cooldown)
  → playGame() → result embed
  → editReply(embed + buttons + select menu)
  → createMessageComponentCollector({ idle: 30_000 })
     on "collect":
     ├─ Non-owner user
     │    → reply ephemeral "not your game", return
     ├─ "Play Again" / "High" / "Low"
     │    → deferUpdate()
     │    → validate (freeze, balance, cooldown)
     │    → playGame(same bet, same/selected mode)
     │    → editReply(new result + components)
     ├─ "Change Bet"
     │    → showModal(bet input)
     │    → awaitModalSubmit({ time: 30_000 })
     │    → validate new bet (min/max/balance)
     │    → playGame(new bet, same game)
     │    → update message(new result + components)
     ├─ Select Menu (switch game)
     │    → deferUpdate()
     │    → validate (freeze, balance, cooldown)
     │    → playGame(selected game, same bet)
     │    → editReply(new result + components)
     on "end":
     └─ Idle timeout (30s no interaction)
          → editReply(embed unchanged, components: []) — remove buttons
```

## State Management

All state lives in the closure — no Redis, no external storage:

- `currentGame`: `"coinflip" | "slots" | "dice"`
- `currentBet`: `number`
- `currentDiceMode`: `"high" | "low" | null`
- `userId`, `guildId`, `locale`: immutable for session

## Cooldown Handling

The 30s Redis cooldown (`gamble_cd:{guildId}:{userId}`) is checked on every replay:

1. Play game → cooldown starts, buttons appear
2. User clicks within cooldown → `deferUpdate()` + ephemeral followUp "Wait Xs", collector continues waiting
3. User clicks after cooldown (~30s) → game plays, cooldown resets, new 30s collector starts
4. No click within 30s → timeout, buttons removed

## Owner-Only Enforcement

Uses `createMessageComponentCollector` (not `awaitMessageComponent`) so that non-owner clicks can be handled properly:

```typescript
const collector = message.createMessageComponentCollector({ idle: 30_000 });

collector.on("collect", async (i) => {
    if (i.user.id !== userId) {
        await i.reply({ content: t(locale, "gamble.not_your_game"), flags: MessageFlags.Ephemeral });
        return;
    }
    // ... handle replay logic
});

collector.on("end", async () => {
    // Remove buttons
});
```

- Owner interactions → process game replay
- Non-owner interactions → ephemeral rejection, collector continues
- `idle: 30_000` resets on each owner interaction (not non-owner), so non-owner clicks don't extend the session

Note: `idle` timer resets on every collected interaction including non-owner ones. To avoid non-owners extending the session, track last owner interaction timestamp and manually check/stop if needed. For simplicity, this is acceptable — a non-owner clicking only extends by up to 30s at most.

## Code Changes

### `src/commands/slash/gamble.ts`

Refactor into three parts:

1. **`playGame(params)` helper** — extracted from the current switch-case:
   - Deducts bet via `CurrencyService.deduct()`
   - Runs game logic (`GamblingService.coinflip/slots/dice`)
   - Adds payout if won via `CurrencyService.addCoin()`
   - Tracks quest progress (fire-and-forget)
   - Logs significant wins (fire-and-forget)
   - Sets cooldown
   - Returns result `EmbedBuilder`
   - Throws `CurrencyService.InsufficientFundsError` on insufficient balance

2. **`buildReplayComponents(params)` helper** — builds the 2 action rows:
   - Row 1: Buttons based on current game (Play Again vs High/Low + Change Bet)
   - Row 2: StringSelectMenu with available games (excluding current)

3. **`execute()` refactored** — initial validation + `playGame()` + collector loop

### `src/util/decorator/reply.ts`

Add one method:

```typescript
async embedEditComponents(
    interaction: ChatInputCommandInteraction,
    embed: EmbedBuilder,
    components: ActionRowBuilder[]
): Promise<void>
```

Calls `interaction.editReply({ embeds: [embed], components })` with footer applied.

### `src/locales/*.json` (all 15 files)

New i18n keys:

| Key | EN value | Purpose |
|-----|----------|---------|
| `gamble.play_again` | `Play Again` | Button label |
| `gamble.change_bet` | `Change Bet` | Button label |
| `gamble.switch_game` | `Switch Game` | Select menu placeholder |
| `gamble.not_your_game` | `This isn't your game.` | Ephemeral rejection |
| `gamble.dice_high_btn` | `High (≥8)` | Dice replay button |
| `gamble.dice_low_btn` | `Low (≤6)` | Dice replay button |
| `gamble.new_bet_label` | `New bet amount` | Modal input label |
| `gamble.new_bet_title` | `Change Bet` | Modal title |
| `gamble.invalid_bet` | `Invalid bet amount.` | Modal validation error |

## No New Files

Everything stays within existing files:
- No new button handler files (collector-based, not auto-loaded)
- No new BUTTON_ID constants needed
- No new model files
- No new service files

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Balance drops below bet between plays | `InsufficientFundsError` → ephemeral message, buttons remain |
| Economy frozen between plays | Ephemeral "frozen" message, buttons remain |
| Gambling disabled between plays | Ephemeral "disabled" message, buttons removed |
| Config min/max changes between plays | Re-validate on each play, reject if invalid |
| Bot restart during session | Collector dies, buttons become unresponsive, Discord removes them after 15min |
| Change Bet modal timeout | `awaitModalSubmit` times out → collector continues, buttons still active |
| Change Bet value out of range | Ephemeral error, buttons remain for retry |
