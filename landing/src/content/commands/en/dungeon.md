---
title: Dungeon
command: dungeon
category: rpg
description: Explore dungeons with RPG stat-based combat, class skills, boss encounters, and team play for Gold, EXP, and equipment.
cooldown: "1h"
---

## Usage

```
/dungeon
/dungeon team
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `/dungeon` | Enter a solo dungeon run |
| `/dungeon team` | Create or join a team dungeon (2–4 players) |

> **Requires an RPG character.** Use `/adventure create` first if you haven't already.

## How It Works

Enter a dungeon and face up to **5 encounters** per run. Each encounter can be a monster battle, treasure chest, trap, or NPC merchant. Your character's HP persists across the entire run, so manage it wisely.

### Encounter Types

| Encounter | Chance | What Happens |
|-----------|--------|-------------|
| Monster | 50% | Stat-based combat using your class skills |
| Treasure | 25% | Gold, materials, or equipment drops, floor advances |
| Trap | 15% | HP loss, floor stays |
| Merchant | 10% | Buy healing, buffs, or exchange Gold for gems |

### Combat

Fight monsters using button-based actions tied to your RPG class:

| Action | Effect |
|--------|--------|
| ⚔️ Attack | Basic attack based on STR/MAG |
| 🎯 Skill 1 | Class-specific skill (costs MP) |
| 🔥 Skill 2 | Class-specific skill (costs MP) |
| 🛡️ Defend | Reduce incoming damage |
| 🏃 Run | Escape — no reward, no penalty |
| 💥 Ultimate | Powerful skill for advanced classes (level 20+) |

MP starts at 50 + level x 5. Skills cost MP — manage your resources across encounters.

**Win rewards:** Gold + EXP + material drops + equipment chance + crate drops. Boss every 5 floors.

**Lose (HP reaches 0):** Floor resets to checkpoint. Run ends.

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
| 🧪 Heal | 80 + floor x 5 Gold | Restore HP based on floor depth |
| ⚔️ Buff | 100 + floor x 5 Gold | Random buff for remaining encounters |
| 💱 Exchange | 300–600 Gold | 1 gem |

**Buff types:** Attack (x1.3 damage), Defense (take x0.7 damage), or Luck (more treasure, fewer traps).

### Floor Progression

Floors advance on monster wins and treasure finds. Checkpoints auto-save at **prime-numbered floors** (same as `/mine`). On death, you fall back to your last checkpoint.

### Run Flow

After each encounter you choose **Continue** (next encounter) or **Leave** (exit with rewards). The run ends when you leave, finish 5 encounters, die, or the 15-minute timeout expires.

### Team Dungeon

Use `/dungeon team` to create or join a party of 2–4 players. All party members must have an RPG character. Monsters are scaled to the party size. Turns are simultaneous — all players choose actions at the same time.

> **Tip:** Don't be greedy — if your HP is low after a tough fight, consider leaving to keep your rewards. The merchant's heal can save a run if you're lucky enough to encounter one!
