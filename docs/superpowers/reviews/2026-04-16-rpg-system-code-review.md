# RPG System Code Review — 2026-04-16

## Overview

Full code review of the RPG system (~24K lines, 76 files). Two focused reviews: architecture + combat/PvP/team.

## Critical Issues (Must Fix)

### C1. Redis cache returns plain objects — Map.get() crashes

**File:** `src/services/rpg/character.service.ts`
**Problem:** `getCharacter()` returns cached plain JSON objects cast as `ICharacter`. But `ICharacter.materials` is a `Map`, and after Redis deserialization it's a plain object. Calling `char.materials.get(key)` in `deductMaterials`/`hasEnoughMaterials` throws `TypeError`.
**Fix:** Convert materials to Map when reading from cache, or use `Object.entries` fallback.

### C2. Race condition in addGP — non-atomic read-modify-write

**File:** `src/services/rpg/guild.service.ts`
**Problem:** `addGP` reads GP, computes new value in JS, then `$set`. Concurrent calls can lose GP.
**Fix:** Use `$inc` for GP, handle rank-up check separately.

### C3. PvP rating decrement not atomic

**File:** `src/services/rpg/pvp.service.ts`
**Problem:** Two-step update for loser rating. `$max: { pvpRating: 0 }` is a no-op in first update. Second read-write can race.
**Fix:** Single aggregation pipeline update: `$set: { pvpRating: { $max: [0, { $subtract }] } }`.

### C4. Duplicated getEffectiveStat — divergence risk

**Files:** `src/services/rpg/combat.service.ts:174`, `src/services/rpg/pvp.service.ts:102`
**Problem:** Same function copy-pasted. If one is updated, the other silently diverges.
**Fix:** Export from `combat.service.ts`, import in PvP + team dungeon.

### C5. Team dungeon monster damage ignores defense

**File:** `src/services/rpg/teamDungeon.service.ts:455`
**Problem:** `(monster.stats.str * 1.5) - (0)` — placeholder never replaced with defense calculation.
**Fix:** Apply standard formula: `- (avgDefense * 0.5)` or per-target defense.

### C6. PvP/team action submission race condition

**Files:** `src/services/rpg/pvp.service.ts`, `src/services/rpg/teamDungeon.service.ts`
**Problem:** `submitAction` does read-modify-write on full Redis state. Concurrent clicks can overwrite each other.
**Fix:** Use separate Redis keys per player action, or Redis Lua script.

## Important Issues (Should Fix)

### I1. InsufficientGoldError reused for materials

**File:** `src/services/rpg/character.service.ts:259`
**Problem:** Throws gold-specific error for material insufficiency.
**Fix:** Create `InsufficientMaterialsError` class.

### I2. Equipment inventory no size limit

**File:** `src/services/rpg/equipment.service.ts:310`
**Problem:** `getInventory()` fetches ALL equipment with no limit. Grows unbounded.
**Fix:** Add `.limit(100)` or implement salvage/sell mechanic.

### I3. getMemberCountInServer counts global, not per-server

**File:** `src/services/rpg/branch.service.ts:137-148`
**Problem:** Returns global adventurer count, not per-server. Per-capita scoring is meaningless.
**Fix:** Filter by server member IDs (fetch from Discord API, cache in Redis).

### I4. Hardcoded English strings in team dungeon + PvP

**Files:** `src/commands/slash/dungeon.ts`, `src/commands/slash/pvp.ts`
**Problem:** Multiple hardcoded strings: "defended", "dealt damage", "Duration", "Skill 1", "Boss", etc.
**Fix:** Replace with i18n `t(locale, key)` calls.

### I5. PvP/team buttons show generic labels

**Files:** `src/commands/slash/pvp.ts:420`, `src/commands/slash/dungeon.ts:596`
**Problem:** Shows "Skill 1", "Skill 2" instead of class-specific skill names.
**Fix:** Use `CombatService.getSkillLabels(classType)` like solo dungeon does.

### I6. Team dungeon cooldown uses leader's premium tier

**File:** `src/commands/slash/dungeon.ts:1104-1115`
**Problem:** Leader's `PremiumService.getConfig()` applied to all members.
**Fix:** Call `PremiumService.getConfig()` per member when setting cooldown.

### I7. dungeon.ts is 1241 lines

**File:** `src/commands/slash/dungeon.ts`
**Problem:** Solo + team + embeds + lobby + encounters all in one file.
**Fix:** Split into `dungeon/` directory or extract team handlers.

## Minor Issues

- M1. `levelFromExp` linear scan — fine for MAX_LEVEL=50, won't scale to 200+
- M2. `advancedClass` typed as `string | null` instead of `AdvancedClassType | null`
- M3. `pickFromArray` duplicated in guildQuest + branch services
- M4. Boss rarity retry loop (20 attempts) — could filter weights directly
- M5. Branch event scores in Redis only — lost on flush
- M6. Redis counter increment pattern not atomic (getJson/setJson)
- M7. `tickStatusEffects` inconsistent: mutates in combat, returns new in PvP
- M8. Team NPC encounter gives treasure instead of merchant interaction
- M9. `scheduleCombatTimeout` doesn't use `encounterId` parameter
- M10. Magic numbers (0.05, 0.5, 0.3, 30_000) should be named constants
- M11. Dead code: `buildPvPActionRow` in pvp.ts superseded by `buildCombinedActionRows`
- M12. Team floor uses leader's depth — could regress deeper members
