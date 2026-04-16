# RPG Core Foundation Design (Phase 1A)

**Date:** 2026-04-16
**Status:** Approved

## Vision

Transform the dungeon into a global fantasy RPG adventure system inspired by isekai anime. Users create characters, choose classes, equip gear, and fight through stat-based combat. This is Phase 1A of a multi-phase project:

- **Phase 1A (this spec):** Character creation, 6 classes, stats, leveling, equipment (6 slots, 6 rarities), Gold currency, dungeon combat rework
- **Phase 1B (future):** Skills with mana cost, equipment drop tables, material drop system
- **Phase 1C (future):** Craft system, gacha crate system, equipment shop
- **Phase 2 (future):** Adventurer Guild (global), quest distribution
- **Phase 3 (future):** Branch Guilds (per-server), events, raids

## Character System

### Class Selection

Users choose a class once via `/adventure create`. Class determines base stats, stat growth rates, equipment restrictions, and available skills.

**6 Base Classes:**

| Class | Emoji | Role | Primary Stats | Future Advancement |
|-------|-------|------|---------------|-------------------|
| Swordsman | ⚔️ | Balanced melee DPS | STR, DEF | → Knight / Berserker |
| Tank | 🛡️ | High HP, absorb damage | HP, DEF | → Paladin / Fortress |
| Mage | 🔮 | Burst magic damage | MAG, MAG_DEF | → Archmage / Warlock |
| Archer | 🏹 | Fast ranged attacker | STR, SPD | → Sniper / Ranger |
| Assassin | 🗡️ | High crit, speed | STR, SPD | → Shadow / Phantom |
| Healer | 💚 | Support, sustain | MAG, HP | → Priest / Druid |

Class advancement is not in Phase 1A scope — base classes only. The data model supports advancement for future phases.

### Stat System (6 stats)

| Stat | Abbr | Purpose |
|------|------|---------|
| Health Points | HP | Total hit points in combat |
| Strength | STR | Physical attack power |
| Defense | DEF | Physical damage reduction |
| Magic | MAG | Magical attack power |
| Magic Defense | MAG_DEF | Magical damage reduction |
| Speed | SPD | Turn order priority |

### Base Stats (Level 1)

| Stat | Swordsman | Tank | Mage | Archer | Assassin | Healer |
|------|-----------|------|------|--------|----------|--------|
| HP | 120 | 180 | 80 | 90 | 85 | 100 |
| STR | 25 | 15 | 5 | 20 | 22 | 8 |
| DEF | 20 | 30 | 8 | 12 | 10 | 15 |
| MAG | 5 | 5 | 30 | 5 | 8 | 25 |
| MAG_DEF | 10 | 15 | 20 | 10 | 12 | 22 |
| SPD | 12 | 8 | 10 | 18 | 25 | 10 |

### Stat Growth (per level)

Each class has different growth rates per stat. Stats gained = `growthRate * level`. Defined in a config-driven `CLASS_CONFIG` object for easy balancing.

| Stat | Swordsman | Tank | Mage | Archer | Assassin | Healer |
|------|-----------|------|------|--------|----------|--------|
| HP | +12 | +18 | +8 | +9 | +8 | +10 |
| STR | +4 | +2 | +1 | +3 | +4 | +1 |
| DEF | +3 | +5 | +1 | +2 | +1 | +2 |
| MAG | +1 | +1 | +5 | +1 | +1 | +4 |
| MAG_DEF | +1 | +2 | +3 | +1 | +2 | +3 |
| SPD | +2 | +1 | +1 | +3 | +4 | +1 |

**Effective stat** = base + (growth * (level - 1)) + equipment bonus

### Leveling

| Aspect | Detail |
|--------|--------|
| EXP sources | Dungeon combat, dungeon treasure, message XP (integrated with existing guild XP system via a configurable conversion rate) |
| Level formula | `expForLevel(n) = 100 * n^1.5` (same curve style as existing XP system) |
| Max level (Phase 1A) | 50 (soft cap, expandable) |
| Level-up notification | Embed in dungeon result or followUp, showing stat gains |

### Message XP → Character EXP Integration

When users earn guild message XP (existing system), a fraction converts to character EXP:
- Conversion: `characterEXP += Math.floor(guildXPGained * MESSAGE_XP_TO_EXP_RATE)` where `MESSAGE_XP_TO_EXP_RATE = 0.1` (configurable in `rpg.config.ts`)
- Only applies if user has created a character
- Fire-and-forget, does not block message XP flow

## Gold Currency

| Aspect | Detail |
|--------|--------|
| Name | Gold (🪙) |
| Scope | Global — stored on `CharacterModel`, not per-guild |
| Earn from | Dungeon rewards, future: quest rewards, selling equipment, craft |
| Spend on | Future: craft, gacha crates, equipment shop, merchant |
| Relation to Star | Separate — Star is premium meta-currency, Gold is RPG gameplay currency |
| Relation to Coin/Gem | Separate — Coin/Gem remain per-guild for economy commands (work, fish, mine, pray, shop) |

## Equipment System

### 6 Slots

| Slot | Key | Primary stats | Example items |
|------|-----|--------------|---------------|
| Weapon | `weapon` | STR or MAG (class-dependent) | Iron Sword, Fire Staff, Long Bow |
| Shield/Offhand | `shield` | DEF, MAG_DEF | Wooden Shield, Magic Tome, Quiver |
| Helmet | `helmet` | HP, MAG_DEF | Iron Helm, Mage Hood, Leather Cap |
| Armor | `armor` | DEF, HP | Plate Armor, Robe, Leather Vest |
| Boots | `boots` | SPD, DEF | Iron Boots, Swift Sandals |
| Accessory | `accessory` | Any stat | Ring of Luck, Amulet of Power |

### 6 Rarity Tiers

| Rarity | Key | Color | Stat multiplier | Dungeon drop rate |
|--------|-----|-------|-----------------|-------------------|
| Common | `common` | ⬜ Gray | 1.0x | 45% |
| Uncommon | `uncommon` | 🟩 Green | 1.3x | 25% |
| Rare | `rare` | 🟦 Blue | 1.6x | 15% |
| Epic | `epic` | 🟪 Purple | 2.0x | 10% |
| Legendary | `legendary` | 🟨 Gold | 2.5x | 4% |
| Mythic | `mythic` | 🟥 Red | 3.2x | 1% |

Drop rate affected by floor depth: higher floors shift the distribution toward higher rarities.

### Class → Weapon Restrictions

| Class | Allowed weapon types | Allowed shield types |
|-------|---------------------|---------------------|
| Swordsman | sword, greatsword | shield |
| Tank | mace, hammer | heavy_shield |
| Mage | staff, wand | magic_tome |
| Archer | bow, crossbow | quiver |
| Assassin | dagger, katana | none |
| Healer | staff, scepter | holy_tome |

Helmet, Armor, Boots, Accessory — all classes can use, but different items have different stat distributions.

### Starter Gear

When a character is created, they receive a Common weapon + Common armor matching their class. Other slots start empty.

## Dungeon Combat Rework

### Changes from Current System

| Aspect | Current | After rework |
|--------|---------|-------------|
| HP | Fixed 100 | From character HP stat + equipment |
| Damage | `random(15-25) + floor*2` | Based on STR/MAG + weapon + skill multiplier |
| Defense | "Defend" button reduces 50% | DEF/MAG_DEF reduce damage passively; Defend action adds 50% reduction + 5% heal |
| Max turns | 3 | 5 |
| Actions | Attack / Defend / Run | Attack / Skill 1 / Skill 2 / Defend / Run |
| Rewards | Coin/Gem (per-guild) | Gold + EXP + Material drops + Equipment drops (global) |
| Monster scaling | `30 + floor*5` HP | Scale by floor + player level |
| Economy | Per-guild | Global (Gold currency) |

### Combat Formula

```
Physical Damage = (userSTR * 1.5 + weaponSTR) * skillMultiplier - (monsterDEF * 0.5)
Magical Damage  = (userMAG * 1.5 + weaponMAG) * skillMultiplier - (monsterMAG_DEF * 0.5)
Minimum damage  = 1 (never 0)
Speed           → determines turn order (higher SPD acts first)
```

### Monster Scaling

```
Monster HP      = 80 + (floor * 15) + (playerLevel * 5)
Monster STR     = 10 + (floor * 4)
Monster DEF     = 5 + (floor * 2)
Monster MAG     = 8 + (floor * 3)
Monster MAG_DEF = 5 + (floor * 2)
Monster SPD     = 8 + (floor * 2)
```

Monster names remain tiered by floor (Tier 1: 1-5, Tier 2: 6-10, Tier 3: 11+) using existing `DungeonService` monster lists.

### Combat Buttons (5 actions)

| Button | Emoji | Label | Effect |
|--------|-------|-------|--------|
| Attack | ⚔️ | `Attack` | Basic attack: 1.0x STR/MAG damage, no cost |
| Skill 1 | ✨ | Class-specific name | See skills table below |
| Skill 2 | 🔥 | Class-specific name | See skills table below |
| Defend | 🛡️ | `Defend` | Incoming damage -50% this turn + heal 5% max HP |
| Run | 🏃 | `Run` | Escape combat, no reward, no penalty |

### Class Skills (2 per class)

| Class | Skill 1 | Effect | Skill 2 | Effect |
|-------|---------|--------|---------|--------|
| Swordsman | ⚡ Power Strike | 1.8x STR dmg | 🌀 Whirlwind | 1.3x STR dmg + ignore 30% DEF |
| Tank | 🔨 Shield Bash | 1.4x STR dmg + self DEF +20% 2 turns | 🏰 Fortify | Heal 20% HP + DEF +40% 1 turn |
| Mage | 🔥 Fireball | 2.0x MAG dmg | ❄️ Ice Shard | 1.5x MAG dmg + monster SPD -30% 2 turns |
| Archer | 🎯 Precision Shot | 1.8x STR dmg + ignore 50% DEF | 💨 Quick Shot | 1.2x STR dmg + attack twice |
| Assassin | 🗡️ Backstab | 2.2x STR dmg (30% crit: 3x) | 💀 Poison Blade | 1.0x STR dmg + poison 10% HP/turn 3 turns |
| Healer | ✨ Holy Light | 1.6x MAG dmg | 💚 Heal | Restore 30% max HP |

Skills have no mana/MP cost in Phase 1A — all actions are freely available each turn. MP system deferred to Phase 1B.

### Status Effects (from skills)

| Effect | Mechanic | Duration |
|--------|----------|----------|
| DEF buff | Increase DEF by % | X turns |
| SPD debuff | Reduce monster SPD by % | X turns |
| Poison | Damage % of max HP per turn | X turns |
| Crit | Chance to multiply damage | Per-attack |

Status effects are tracked in `CombatState` (Redis) and tick each turn.

### Boss Encounters

Every 5th floor (5, 10, 15, 20...) — the final encounter of a run on a boss floor is a boss fight:

| Aspect | Normal monster | Boss |
|--------|---------------|------|
| Stats | Normal scaling | 2x all stats |
| Max turns | 5 | 7 |
| Gold reward | Normal | 3x |
| EXP reward | Normal | 3x |
| Material drop | 30% chance | 100% (rare+ guaranteed) |
| Equipment drop | 10% chance | 50% (rare+ guaranteed) |
| Name | Regular monster pool | "Boss: {MonsterName}" prefix |

### Dungeon Rewards (reworked — global)

| Source | Gold | EXP | Material | Equipment |
|--------|------|-----|----------|-----------|
| Monster win | `50 + floor*15` | `20 + floor*8` | 30% chance | 10% chance |
| Treasure chest | `30 + floor*10` | `10 + floor*5` | 50% chance | 15% chance |
| Trap | Lose `20 + floor*5` gold | 0 | 0 | 0 |
| Boss win | `(50 + floor*15) * 3` | `(20 + floor*8) * 3` | 100% rare+ | 50% rare+ |

Equipment rarity on drop is influenced by floor: `floor / 5` shifts the rarity distribution one tier up (floor 5 = Uncommon base, floor 10 = Rare base, etc.).

### Merchant Rework

Merchant encounter stays the same but uses Gold instead of per-guild coin:
- Heal: `80 + floor*5` Gold
- Buff: `100 + floor*5` Gold
- Exchange: removed (was coin→gem, no longer relevant in global system)
- **New: Buy random equipment** — `200 + floor*10` Gold, rarity influenced by floor

## `/adventure` Command

### Subcommands

| Subcommand | Description | Notes |
|------------|-------------|-------|
| `/adventure create` | Choose class, create character | Select menu with 6 classes + stat preview. One-time only. |
| `/adventure profile` | View character info | Embed: class, level, EXP progress, stats (base + equipment), gold, equipped items |
| `/adventure equip <slot> <item>` | Equip item to slot | Autocomplete shows inventory items valid for slot + class |
| `/adventure inventory` | View owned equipment + materials | Paginated embed with rarity colors |
| `/adventure unequip <slot>` | Remove item from slot | Returns item to inventory |

### Character Creation Flow

1. User runs `/adventure create`
2. Embed shows 6 classes with emoji, role description, and stat overview
3. StringSelectMenu to pick class
4. Confirmation embed: "You chose {Class}! This cannot be changed."
5. Confirm button → create character + give starter gear
6. Welcome embed with character card

## Data Models (MongoDB)

### `CharacterModel` (new collection: `characters`)

```typescript
interface ICharacter extends Document {
    userId: string;              // unique
    class: ClassType;            // "swordsman" | "tank" | "mage" | "archer" | "assassin" | "healer"
    level: number;               // default 1
    exp: number;                 // default 0
    gold: number;                // default 0
    dungeonDepth: number;        // migrated from UserEconomy, default 1
    dungeonCheckpoint: number;   // migrated from UserEconomy, default 1
    equipment: {
        weapon: Types.ObjectId | null;
        shield: Types.ObjectId | null;
        helmet: Types.ObjectId | null;
        armor: Types.ObjectId | null;
        boots: Types.ObjectId | null;
        accessory: Types.ObjectId | null;
    };
    createdAt: Date;
    updatedAt: Date;
}
```

Index: `{ userId: 1 }` unique.

### `EquipmentModel` (new collection: `equipment`)

```typescript
interface IEquipment extends Document {
    ownerId: string;             // userId
    name: string;
    slot: EquipmentSlot;         // "weapon" | "shield" | "helmet" | "armor" | "boots" | "accessory"
    type: string;                // "sword" | "staff" | "bow" | "plate_armor" | etc.
    rarity: Rarity;              // "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
    stats: {
        hp: number;
        str: number;
        def: number;
        mag: number;
        magDef: number;
        spd: number;
    };
    classRestriction: ClassType[];  // empty = all classes
    requiredLevel: number;
    equipped: boolean;           // default false
    createdAt: Date;
}
```

Index: `{ ownerId: 1 }`, `{ ownerId: 1, equipped: true }`.

### `MaterialModel` (new collection: `materials`)

Deferred to Phase 1B. In Phase 1A, materials drop as items but are stored as a simple `Map<string, number>` on `CharacterModel.materials` for future use.

## Migration Strategy

### Dungeon Data

- `UserEconomyModel.dungeonDepth` → `CharacterModel.dungeonDepth`
- `UserEconomyModel.dungeonCheckpoint` → `CharacterModel.dungeonCheckpoint`
- Migration runs on first `/dungeon` use: if character exists but dungeon fields are default, check `UserEconomyModel` for existing progress and copy over
- Old fields remain on `UserEconomyModel` (no destructive migration)

### Command Changes

- `/dungeon` — requires character creation. If no character, reply: "Create your character first with `/adventure create`"
- Dungeon button handlers — reworked to use `CharacterModel` stats, Gold rewards, EXP grants
- Merchant — prices in Gold, exchange option replaced with equipment purchase

### Backward Compatibility

- Per-guild economy commands (work, fish, mine, pray, gamble, shop) remain unchanged
- Star/premium system remains unchanged
- Quest system: `dungeon` quest type still tracks "complete dungeon X times"
- Achievement system: existing dungeon achievements still work

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/models/character.model.ts` | Character schema + ICharacter interface |
| `src/models/equipment.model.ts` | Equipment schema + IEquipment interface |
| `src/services/rpg/character.service.ts` | Character CRUD, stat calculation, leveling, Gold operations |
| `src/services/rpg/equipment.service.ts` | Equipment generation, equip/unequip, inventory, drop tables |
| `src/services/rpg/combat.service.ts` | New stat-based combat engine (replaces GamblingService-style pure functions) |
| `src/services/rpg/rpg.config.ts` | Class configs, stat growth, equipment templates, rarity config, skill definitions |
| `src/commands/slash/adventure.ts` | `/adventure create/profile/equip/inventory/unequip` command |

### Modified Files

| File | Changes |
|------|---------|
| `src/commands/slash/dungeon.ts` | Rework: load character, use new combat service, Gold rewards, EXP grants, equipment drops |
| `src/services/economy/dungeon.service.ts` | Rework: monster scaling uses player stats, boss encounters, new reward structure |
| `src/services/economy/merchant.service.ts` | Gold pricing, remove exchange, add equipment purchase |
| `src/buttons/dungeonAttack.button.ts` | Use new combat service with stats + skills |
| `src/buttons/dungeonDefend.button.ts` | Use new combat service |
| `src/buttons/dungeonContinue.button.ts` | Grant EXP + Gold + drops after encounters |
| `src/buttons/dungeonHeal.button.ts` | Gold-based pricing |
| `src/buttons/dungeonBuff.button.ts` | Gold-based pricing |
| `src/buttons/dungeonExchange.button.ts` | Replace with equipment purchase handler |
| `src/buttons/dungeonLeave.button.ts` | Grant accumulated Gold + EXP on leave |
| `src/locales/*.json` (15 files) | New keys: `adventure.*`, `rpg.*`, `dungeon.*` updates |

### New Button Handlers

| File | Purpose |
|------|---------|
| `src/buttons/dungeonSkill1.button.ts` | Class skill 1 in combat |
| `src/buttons/dungeonSkill2.button.ts` | Class skill 2 in combat |

## Redis State Changes

### `DungeonRunState` (reworked)

```typescript
interface DungeonRunState {
    userId: string;
    hp: number;              // from character stats, not fixed 100
    maxHp: number;           // character HP stat + equipment
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    gold: number;            // accumulated Gold this run (global)
    exp: number;             // accumulated EXP this run
    drops: string[];         // equipment ObjectId[] found this run
    buff: { type: string; encountersLeft: number } | null;
    statusEffects: { type: string; value: number; turnsLeft: number }[];  // from skills
    messageId: string;
}
```

### `CombatState` (reworked)

```typescript
interface CombatState {
    userId: string;
    isBoss: boolean;
    monster: {
        name: string;
        hp: number;
        maxHp: number;
        str: number;
        def: number;
        mag: number;
        magDef: number;
        spd: number;
    };
    userHp: number;
    maxUserHp: number;
    turnsLeft: number;       // 5 normal, 7 boss
    userStats: {             // snapshot of character stats at combat start
        str: number;
        def: number;
        mag: number;
        magDef: number;
        spd: number;
        class: ClassType;
    };
    statusEffects: {
        user: { type: string; value: number; turnsLeft: number }[];
        monster: { type: string; value: number; turnsLeft: number }[];
    };
}
```

## i18n Keys (new, estimated 100+ keys)

Major key groups:
- `adventure.create.*` — class selection, confirmation
- `adventure.profile.*` — character card display
- `adventure.equip.*` — equip/unequip messages
- `adventure.inventory.*` — inventory display
- `rpg.class.*` — class names, descriptions
- `rpg.skill.*` — skill names, descriptions
- `rpg.equipment.*` — equipment names, rarity labels
- `rpg.stat.*` — stat abbreviations and labels
- `rpg.levelup.*` — level-up notification
- `dungeon.reward.*` — updated reward messages (Gold, EXP, drops)
- `dungeon.boss.*` — boss encounter messages
- `dungeon.combat.*` — updated combat messages with skill usage
- `dungeon.require_character` — "Create character first" gate message

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User runs `/dungeon` without character | Ephemeral: "Create your character first with `/adventure create`" + upgrade button to guide |
| User equips item for wrong class | Reject with error: "This item requires {class}" |
| User equips item above their level | Reject: "Requires level {level}" |
| Equipment inventory full | No hard cap in Phase 1A; revisit if needed |
| Existing dungeon progress | Lazy migration on first `/dungeon` use with character |
| Boss encounter at exactly 5th floor with 0 HP | Boss encounter checks HP first; if 0, collapse as normal |
| Poison kills user between turns | Check HP after each status effect tick; trigger collapse if ≤ 0 |
| Healer healing above max HP | Clamp to maxHp |
| Level up mid-dungeon | HP does NOT refresh mid-run (level-up bonus applied after run ends) |
