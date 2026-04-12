---
title: Dungeon
command: dungeon
category: economy
description: Explore a dungeon with combat, traps, treasure, and NPC merchants across multi-encounter runs.
cooldown: "1h"
---

## Usage

```
/dungeon
```

## How It Works

Enter a dungeon and face up to **5 encounters** per run. Each encounter can be a monster battle, treasure chest, trap, or NPC merchant. Your HP (100) persists across the entire run, so manage it wisely.

### Encounter Types

| Encounter | Chance | What Happens |
|-----------|--------|-------------|
| Monster | 50% | Turn-based combat (up to 3 rounds) |
| Treasure | 25% | Instant coin/gem reward, floor advances |
| Trap | 15% | HP and coin loss, floor stays |
| Merchant | 10% | Buy healing, buffs, or exchange coins for gems |

### Combat

Fight monsters using button-based actions:

| Action | Effect |
|--------|--------|
| ⚔️ Attack | Full damage to monster, full damage to you |
| 🛡️ Defend | 70% damage to monster, take only 50% damage |
| 🏃 Run | Escape — no reward, no penalty |

Combat lasts up to **3 turns**. If you don't defeat the monster in time, you escape automatically.

**Win rewards:** 50–150 coins + depth bonus, 10% gem chance, 3% star drop chance.

**Lose (HP reaches 0):** Lose 100–200 coins, floor resets to checkpoint. Run ends.

### Monsters

| Tier | Floors | Enemies |
|------|--------|---------|
| Tier 1 | 1–5 | Rat 🐀, Bat 🦇, Slime 🟢, Goblin 👺, Spider 🕷️ |
| Tier 2 | 6–10 | Skeleton 💀, Zombie 🧟, Wolf 🐺, Orc 👹, Ghost 👻 |
| Tier 3 | 11+ | Dragon 🐉, Demon 😈, Lich 🧙, Hydra 🐍, Titan ⚡ |

### NPC Merchant

The merchant offers **one** service per visit:

| Service | Cost | Effect |
|---------|------|--------|
| 🧪 Heal | 80 + floor × 5 coin | Restore 30 + floor × 2 HP (max 100) |
| ⚔️ Buff | 100 + floor × 5 coin | Random buff for remaining encounters |
| 💱 Exchange | 300–600 coin | 1 gem |

**Buff types:** Attack (×1.3 damage), Defense (take ×0.7 damage), or Luck (more treasure, fewer traps).

### Floor Progression

Floors advance on monster wins and treasure finds. Checkpoints auto-save at **prime-numbered floors** (same as `/mine`). On death, you fall back to your last checkpoint.

### Run Flow

After each encounter you choose **Continue** (next encounter) or **Leave** (exit with rewards). The run ends when you leave, finish 5 encounters, die, or the 15-minute timeout expires.

> **Tip:** Don't be greedy — if your HP is low after a tough fight, consider leaving to keep your rewards. The merchant's heal can save a run if you're lucky enough to encounter one!
