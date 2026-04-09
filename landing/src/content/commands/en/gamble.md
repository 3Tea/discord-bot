---
title: Gamble
command: gamble
category: economy
description: Gambling mini-games — bet coins on coinflip, slots, or dice.
cooldown: "30s (configurable)"
---

## Usage

```
/gamble coinflip bet:100
/gamble slots bet:50
/gamble dice bet:100 mode:high
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `coinflip` | Flip a coin — 50/50 chance to double your bet |
| `slots` | Spin the slot machine — match symbols to win up to ×20 |
| `dice` | Roll 2 dice — guess high (≥8) or low (≤6) to win ×2 |

## How It Works

### Coinflip
50/50 chance. Win = double your bet. Fair game with 0% house edge.

### Slots
7 possible outcomes with different payouts:

| Combo | Payout |
|-------|--------|
| 7️⃣ 7️⃣ 7️⃣ | ×20 (Jackpot!) |
| 💎 💎 💎 | ×8 |
| 🔔 🔔 🔔 | ×4 |
| 🍋 🍋 🍋 | ×2 |
| 🍒 🍒 🍒 | ×1.5 |
| 🍒 🍒 ✖ | ×0.5 (partial) |
| No match | Lose bet |

### Dice
Roll 2 dice (2d6). Choose **high** (total ≥ 8) or **low** (total ≤ 6). Rolling 7 always loses — that's the house edge.

> **Note:** Gambling is a coin sink — you'll lose coins on average over time. Bet responsibly!

### Server Config
Admins can configure min/max bet, cooldown, and enable/disable via `/economy gambling-config-*` commands.
