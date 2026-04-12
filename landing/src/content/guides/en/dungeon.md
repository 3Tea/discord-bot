---
title: Dungeon
description: Conquer the dungeon — learn combat tactics, encounter types, merchant strategies, and floor progression.
icon: "🏰"
order: 11
relatedCommands: ["dungeon", "balance", "wallet"]
---

## Overview

The dungeon is a **multi-encounter adventure** system. Each run gives you up to 5 encounters — monsters to fight, treasure to find, traps to survive, and merchants to trade with. Your HP carries across the entire run, so every decision matters.

## Getting Started

Run `/dungeon` to enter. There's a **1-hour cooldown** between runs. Once inside, the bot shows your first encounter and you interact through **buttons** — no commands needed during a run.

## Your Run

Each run starts with **100 HP** and **5 encounters**. After each encounter, you choose:

- **Continue** — Face the next encounter
- **Leave** — Exit the dungeon and keep all rewards earned so far

The run automatically ends when you use all 5 encounters, your HP hits 0, or 15 minutes pass.

## Encounter Types

| Encounter | Chance | Floor Advance? |
|-----------|--------|---------------|
| Monster | 50% | Yes (on win) |
| Treasure | 25% | Yes |
| Trap | 15% | No |
| Merchant | 10% | No |

## Combat

When you encounter a monster, you get **3 turns** to defeat it using button actions:

### Actions

| Button | Your Damage | Damage Taken |
|--------|------------|-------------|
| ⚔️ Attack | 100% | 100% |
| 🛡️ Defend | 70% | 50% |
| 🏃 Run | — | — (escape) |

### Damage Formulas

- **Your attack:** 15–25 base + (floor × 2)
- **Monster attack:** 10–20 base + (floor × 3)
- **Monster HP:** 30 + (floor × 5)

### Combat Outcomes

| Outcome | Result |
|---------|--------|
| Monster defeated | 50–150 coins + depth bonus, 10% gem chance, 3% star drop |
| Your HP hits 0 | Lose 100–200 coins, reset to checkpoint, run ends |
| 3 turns used | Auto-escape, no reward, no penalty |
| 30s timeout | Auto-escape |

> **Tip:** Use Defend on high floors where monster damage gets scary. Taking 50% damage while still dealing 70% can save your run.

## Treasure Chests

No combat needed — just collect:

- **Coins:** 30–100 base + (floor × 8)
- **Gem:** 15% chance for 1
- **Star:** 3% chance for 1

Floor advances by 1.

## Traps

Bad luck. You take damage and lose coins:

- **HP loss:** 10–20
- **Coin loss:** 30–60

Floor does **not** advance. If a trap drops your HP to 0, you collapse — reset to checkpoint with an additional 100–200 coin penalty.

## NPC Merchant

The merchant offers **one service** per encounter. Pick wisely:

| Service | Cost | Effect |
|---------|------|--------|
| 🧪 Heal | 80 + floor × 5 coin | Restore 30 + floor × 2 HP (max 100) |
| ⚔️ Buff | 100 + floor × 5 coin | Random buff for remaining encounters |
| 💱 Exchange | 300–600 coin | 1 gem |

### Buff Types

| Buff | Effect | Duration |
|------|--------|----------|
| Attack | Your damage × 1.3 | Rest of run |
| Defense | Monster damage × 0.7 | Rest of run |
| Luck | More treasure (35%), fewer traps (5%) | Rest of run |

> **Tip:** Luck buff is incredibly powerful — it nearly triples your treasure rate while reducing traps to almost nothing. If you can afford it, always take Luck.

## Monster Tiers

Monsters are cosmetic — they don't have individual stats. All damage is calculated by the floor formula.

| Tier | Floors | Monsters |
|------|--------|----------|
| Tier 1 | 1–5 | Rat 🐀, Bat 🦇, Slime 🟢, Goblin 👺, Spider 🕷️ |
| Tier 2 | 6–10 | Skeleton 💀, Zombie 🧟, Wolf 🐺, Orc 👹, Ghost 👻 |
| Tier 3 | 11+ | Dragon 🐉, Demon 😈, Lich 🧙, Hydra 🐍, Titan ⚡ |

## Floor Progression & Checkpoints

Floors work exactly like `/mine`:

- Floor increases by 1 on monster wins and treasure finds
- Checkpoints auto-save at **prime floors** (2, 3, 5, 7, 11, 13...)
- On death, floor resets to your last checkpoint
- Progress saves to the database **after each floor advance**, not at run end

## Strategy Guide

### Early Floors (1–5)

Low risk. Monsters hit softly, traps barely hurt. Aggressively Attack everything and push floors.

### Mid Floors (6–10)

Monsters start hurting. Consider Defending when your HP drops below 50. Merchant heals become valuable here.

### Deep Floors (11+)

Monster damage is significant. Always Defend unless you have a buff. Merchant buffs are almost mandatory. Don't be greedy — Leave when HP is low rather than risking a collapse.

### Run Priority

1. **Get a buff early** — Luck or Defense are the best
2. **Heal when below 50 HP** — traps can finish you off
3. **Leave before your 5th encounter** if HP is dangerously low — you can always come back
4. **Run from fights** you can't win — no shame in fleeing a Dragon at 30 HP

## Commands Reference

| Command | Description |
|---------|-------------|
| `/dungeon` | Start a dungeon run (1h cooldown) |
| `/balance` | Check your coin/gem balance |
| `/wallet view` | Check global star balance |
