# RPG Phase 4A: Class Advancement Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 4A adds class advancement — each base class can evolve into one of two advanced classes at level 20. Advanced classes get enhanced stats, a new ultimate skill (1 per combat), and retain their 2 base skills. Advancement requires level 20 + completion of an advancement quest + rare materials.

## Advancement Requirements

| Requirement | Value |
|-------------|-------|
| Minimum level | 20 |
| Advancement quest | Class-specific (kill bosses, reach floor, etc.) |
| Materials | 5 Epic Core + 10 Rare Essence |
| Gold | 3,000 |

### Advancement Quests (per base class)

| Base Class | Quest | Target |
|-----------|-------|--------|
| Swordsman | Defeat 15 bosses | `defeat_boss` ≥ 15 (from `bossKills`) |
| Tank | Reach floor 25 | `dungeonDepth` ≥ 25 |
| Mage | Earn 20,000 Gold total | Lifetime gold earned check |
| Archer | Kill 200 monsters | Lifetime monster kills check |
| Assassin | Complete 50 guild quests | `questsCompleted` ≥ 50 |
| Healer | Craft 20 equipment | Lifetime craft count check |

Note: Some requirements use existing fields (`bossKills`, `dungeonDepth`, `questsCompleted`). Others need new tracking fields on `CharacterModel` (`monstersKilled`, `goldEarned`, `itemsCrafted`).

## 12 Advanced Classes

### Offensive Path (Path 1)

| Advanced Class | Key | Emoji | Base | Role | Stat Bonus |
|---------------|-----|-------|------|------|------------|
| Berserker | `berserker` | ⚔️ | Swordsman | Burst STR, crit, lifesteal | STR +20%, HP -10% |
| Fortress | `fortress` | 🏰 | Tank | Counter-attack, immovable | DEF +25%, SPD -15% |
| Warlock | `warlock` | 😈 | Mage | Dark burst, DoT, HP sacrifice | MAG +25%, HP -15% |
| Sniper | `sniper` | 🎯 | Archer | Extreme crit, one-shot | STR +15%, SPD +10%, DEF -15% |
| Phantom | `phantom` | 👻 | Assassin | Stealth burst, ignore DEF | STR +20%, SPD +10%, HP -20% |
| Druid | `druid` | 🌱 | Healer | Nature damage + HoT | MAG +15%, HP +10% |

### Defensive Path (Path 2)

| Advanced Class | Key | Emoji | Base | Role | Stat Bonus |
|---------------|-----|-------|------|------|------------|
| Knight | `knight` | 🛡️ | Swordsman | Balanced STR+DEF | DEF +15%, STR +5% |
| Paladin | `paladin` | ✨ | Tank | Holy tank, self-heal | HP +20%, MAG_DEF +15% |
| Archmage | `archmage` | 🔮 | Mage | Pure MAG, shield | MAG +10%, MAG_DEF +20% |
| Ranger | `ranger` | 🌿 | Archer | SPD + evasion, multi-hit | SPD +20%, DEF +10% |
| Shadow | `shadow` | 🌑 | Assassin | Poison, SPD debuffs | SPD +15%, MAG +10% |
| Priest | `priest` | 🙏 | Healer | Pure healer | HP +15%, MAG +10%, MAG_DEF +15% |

### Stat Bonus Application

Advanced class stat bonus is a percentage modifier applied AFTER base stat + growth + equipment:

```typescript
effectiveStat = Math.floor((baseStat + growthStat + equipBonus) * (1 + advancementBonus))
```

For example, Berserker STR +20%: if base+growth+equip STR = 100, effective = 120.
Negative bonuses (e.g., HP -10%): effective = Math.floor(100 * 0.9) = 90.

## Ultimate Skills (1 per advanced class, 1 use per combat)

### Offensive Ultimates

| Class | Skill | Key | Effect |
|-------|-------|-----|--------|
| Berserker | 🩸 Blood Frenzy | `blood_frenzy` | 3.0x STR dmg + heal 30% of damage dealt |
| Fortress | 🪨 Stone Wall | `stone_wall` | Reflect 100% of next monster attack back + take 0 damage |
| Warlock | 💀 Soul Burn | `soul_burn` | 4.0x MAG dmg, costs 20% of user's current HP |
| Sniper | 💥 Headshot | `headshot` | 5.0x STR dmg, 50% chance to instant-kill (HP < 30%) |
| Phantom | 🌀 Shadow Strike | `shadow_strike` | 3.5x STR dmg, ignores 100% DEF |
| Druid | 🌿 Nature's Wrath | `natures_wrath` | 2.5x MAG dmg + heal 25% max HP + poison 3 turns |

### Defensive Ultimates

| Class | Skill | Key | Effect |
|-------|-------|-----|--------|
| Knight | ⚔️ Guardian's Oath | `guardians_oath` | DEF +100% for 3 turns + 1.5x STR attack |
| Paladin | ✨ Divine Shield | `divine_shield` | Heal 50% max HP + immune to damage for 1 turn |
| Archmage | 🌟 Arcane Barrier | `arcane_barrier` | MAG_DEF +100% for 2 turns + 2.5x MAG attack |
| Ranger | 🏹 Arrow Rain | `arrow_rain` | 1.0x STR dmg × 5 hits (multi-hit) |
| Shadow | ☠️ Toxic Cloud | `toxic_cloud` | Poison 20% HP/turn for 4 turns + SPD -50% for 3 turns |
| Priest | 💫 Resurrection | `resurrection` | When HP drops to 0 this combat, revive with 50% HP (passive, auto-trigger) |

### Ultimate Mechanics

- **1 use per combat** — button disabled after use, tracked in `RpgCombatState`
- **50 MP cost** — higher than regular skills but not prohibitive
- **Button style:** `ButtonStyle.Danger` (red) to distinguish from regular skills
- **Priest Resurrection:** Passive — auto-triggers on lethal hit, no button needed. Tracked as a flag.

## Advancement Flow

### `/adventure advance` (new subcommand)

```
/adventure advance
→ Check: level ≥ 20
→ Check: still base class (not already advanced)
→ Show 2 paths with stats comparison + ultimate preview
→ Select menu: choose path
→ Check: materials + gold sufficient
→ Confirm button
→ On confirm: deduct materials + gold, update class, show success
```

### Embed Preview

```
⚔️ Class Advancement Available!

Path 1: Berserker ⚔️
STR +20%, HP -10%
Ultimate: 🩸 Blood Frenzy — 3.0x STR dmg + heal 30% of damage dealt

Path 2: Knight 🛡️
DEF +15%, STR +5%
Ultimate: ⚔️ Guardian's Oath — DEF +100% 3 turns + 1.5x STR attack

Cost: 5 Epic Core + 10 Rare Essence + 3,000 Gold

[Select Path ▾]
```

## Data Model Changes

### `CharacterModel` — add fields

```typescript
advancedClass: string | null;    // null = base class, "berserker" | "knight" | etc.
monstersKilled: number;          // lifetime total (for advancement quest)
goldEarned: number;              // lifetime total (for advancement quest)
itemsCrafted: number;            // lifetime total (for advancement quest)
ultimateUsed: boolean;           // reset each combat (tracked in Redis CombatState instead)
```

Only `advancedClass`, `monstersKilled`, `goldEarned`, `itemsCrafted` on the model. `ultimateUsed` goes in `RpgCombatState` (Redis).

### `RpgCombatState` — add field

```typescript
ultimateUsed: boolean;  // true after ultimate used this combat
```

## Config Changes (`rpg.config.ts`)

### Advanced Class Config

```typescript
export const ADVANCED_CLASSES = [
    "berserker", "knight", "fortress", "paladin", "warlock", "archmage",
    "sniper", "ranger", "phantom", "shadow", "druid", "priest",
] as const;
export type AdvancedClassType = (typeof ADVANCED_CLASSES)[number];

export interface AdvancedClassConfig {
    key: AdvancedClassType;
    emoji: string;
    baseClass: ClassType;
    path: "offensive" | "defensive";
    statBonus: Partial<Record<keyof StatBlock, number>>; // percentage, e.g., { str: 0.2, hp: -0.1 }
    ultimate: SkillDef & { mpCost: number };
}

export const ADVANCED_CLASS_CONFIG: Record<AdvancedClassType, AdvancedClassConfig> = { ... };

export const ADVANCEMENT_REQUIREMENTS = {
    level: 20,
    materials: [{ key: "epic_core", qty: 5 }, { key: "rare_essence", qty: 10 }],
    goldCost: 3000,
};

export const BASE_TO_ADVANCED: Record<ClassType, [AdvancedClassType, AdvancedClassType]> = {
    swordsman: ["berserker", "knight"],
    tank: ["fortress", "paladin"],
    mage: ["warlock", "archmage"],
    archer: ["sniper", "ranger"],
    assassin: ["phantom", "shadow"],
    healer: ["druid", "priest"],
};
```

## Combat Changes

### `combat.service.ts`

- `initCombat`: accept `advancedClass` param, apply stat bonuses, set `ultimateUsed: false`
- `executeAction`: add `"ultimate"` action type. Check `ultimateUsed`, deduct 50 MP, execute ultimate effect, set `ultimateUsed = true`
- `getSkillLabels`: return 3 skills for advanced classes (2 base + 1 ultimate)
- Add `ULTIMATE_MP_COST = 50` constant

### `dungeon.ts` command

- `buildCombatRow`: show 4th button (ultimate) for advanced classes, disabled when used or MP < 50
- Combat embed: show advanced class name + emoji

### Button handlers

- Add `dungeonUltimate.button.ts` — new button handler for ultimate skill
- Add `DUNGEON_ULTIMATE` to `BUTTON_ID`

## Lifetime Tracking Hooks

Add increment calls at existing points:

| Field | Where incremented |
|-------|------------------|
| `monstersKilled` | `dungeonAttack.button.ts` on monster win (+1) |
| `goldEarned` | `CharacterService.addGold` (+amount) |
| `itemsCrafted` | `adventure.ts` handleCraft (+1) |

## Files

### New Files

| File | Purpose |
|------|---------|
| `src/buttons/dungeonUltimate.button.ts` | Ultimate skill button handler |

### Modified Files

| File | Changes |
|------|---------|
| `src/services/rpg/rpg.config.ts` | Add advanced class config, advancement requirements |
| `src/models/character.model.ts` | Add `advancedClass`, `monstersKilled`, `goldEarned`, `itemsCrafted` |
| `src/util/config/button.ts` | Add `DUNGEON_ULTIMATE` |
| `src/services/rpg/character.service.ts` | Add `getEffectiveStats` advanced class bonus, `advance` function |
| `src/services/rpg/combat.service.ts` | Add ultimate action, `ultimateUsed` state, advanced stat bonuses |
| `src/commands/slash/adventure.ts` | Add `advance` subcommand |
| `src/commands/slash/dungeon.ts` | Update `buildCombatRow` for ultimate button |
| `src/buttons/dungeonAttack.button.ts` | Track `monstersKilled`, pass `ultimateUsed` to combat row |
| `src/locales/*.json` (15 files) | ~40 new i18n keys |

## i18n Keys (new, ~40)

Key groups:
- `rpg.advanced.*` — 12 advanced class names + descriptions
- `rpg.ultimate.*` — 12 ultimate skill names + descriptions
- `adventure.advance.*` — advancement flow UI strings
- `adventure.advance.quest.*` — 6 advancement quest descriptions
- `dungeon.btn.ultimate` — ultimate button label

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Already advanced, try advance again | "Already advanced" error |
| Level < 20 | "Reach level 20 first" |
| Insufficient materials/gold | Show what's missing |
| Ultimate used, button click | Button disabled (should not reach handler) |
| Priest resurrection trigger | Auto-trigger on lethal hit, no button needed. Tracked in CombatState. |
| Advanced class in profile | Show advanced name + emoji instead of base |
| Advanced class in dungeon embed | Show advanced class title |
