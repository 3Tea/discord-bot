# RPG Phase 1B: Mana, Materials & Class-Weighted Drops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mana/MP system for skill costs, tiered material drops from dungeon encounters, and class-weighted equipment drop tables.

**Architecture:** All modifications to existing files — no new files. Config additions in `rpg.config.ts`, MP tracking in `combat.service.ts`, material/drop logic in `equipment.service.ts`, storage in `character.service.ts`, and UI updates in dungeon command + button handlers.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, ioredis

---

## File Map

| File | Changes |
|------|---------|
| `src/services/rpg/rpg.config.ts` | Add MP constants, `MATERIALS` array, `CLASS_PRIORITY_SLOTS`, drop weights |
| `src/services/rpg/combat.service.ts` | Add `mp`/`maxMp` to `CombatantState`, MP deduct/regen in `executeAction`, `insufficientMp` result |
| `src/services/rpg/equipment.service.ts` | Add `rollMaterialDrops()`, refactor `createEquipmentDrop` with `source` param, class-weighted slot selection |
| `src/services/rpg/character.service.ts` | Add `addMaterials()`, `getMaxMp()` |
| `src/services/economy/dungeon.service.ts` | Add `mp`/`maxMp` to `DungeonRunState`, material drops in resolve functions, pass `source` to equip drops |
| `src/commands/slash/dungeon.ts` | MP display in combat embed, disable skill buttons when low MP, material drops display |
| `src/buttons/dungeonAttack.button.ts` | MP display, material drops in win embed |
| `src/buttons/dungeonSkill1.button.ts` | MP check before action |
| `src/buttons/dungeonSkill2.button.ts` | MP check before action |
| `src/buttons/dungeonDefend.button.ts` | MP recovery display |
| `src/buttons/dungeonContinue.button.ts` | Material drops in treasure, MP carry-over |
| `src/locales/*.json` (15 files) | Add MP + material i18n keys |

---

## Task 1: Config + i18n additions

**Files:**
- Modify: `src/services/rpg/rpg.config.ts`
- Modify: `src/locales/*.json` (15 files)

- [ ] **Step 1: Add MP constants and material/drop config to `rpg.config.ts`**

Add before the `DUNGEON_REWARDS` section (around line 251):

```typescript
// --- Mana/MP Config ---

export const MP_BASE = 50;
export const MP_PER_LEVEL = 5;
export const MP_REGEN_PER_TURN = 5;
export const MP_REGEN_ON_DEFEND = 15;
export const SKILL1_MP_COST = 20;
export const SKILL2_MP_COST = 30;

// --- Material Config ---

export interface MaterialDef {
    key: string;
    emoji: string;
    minFloor: number;
    dropChance: number;
    minQty: number;
    maxQty: number;
}

// Ordered high → low for roll-from-top algorithm
export const MATERIALS: MaterialDef[] = [
    { key: "mythic_heart", emoji: "🟥", minFloor: 20, dropChance: 0.02, minQty: 1, maxQty: 1 },
    { key: "legendary_soul", emoji: "🟨", minFloor: 15, dropChance: 0.05, minQty: 1, maxQty: 1 },
    { key: "epic_core", emoji: "🟪", minFloor: 10, dropChance: 0.10, minQty: 1, maxQty: 1 },
    { key: "rare_essence", emoji: "🟦", minFloor: 6, dropChance: 0.20, minQty: 1, maxQty: 2 },
    { key: "uncommon_fragment", emoji: "🟩", minFloor: 3, dropChance: 0.35, minQty: 1, maxQty: 3 },
    { key: "common_shard", emoji: "⬜", minFloor: 1, dropChance: 0.60, minQty: 2, maxQty: 4 },
];

// --- Class-Weighted Drop Config ---

export const CLASS_PRIORITY_SLOTS: Record<ClassType, [EquipmentSlot, EquipmentSlot, EquipmentSlot]> = {
    swordsman: ["weapon", "armor", "shield"],
    tank: ["shield", "armor", "helmet"],
    mage: ["weapon", "accessory", "shield"],
    archer: ["weapon", "boots", "accessory"],
    assassin: ["weapon", "boots", "accessory"],
    healer: ["weapon", "shield", "helmet"],
};

export const CLASS_PRIORITY_WEIGHTS = [0.4, 0.35, 0.25] as const;
export const CLASS_MATCH_CHANCE = 0.7;
```

- [ ] **Step 2: Add i18n keys to all 15 locale files**

Add to `en.json`:
```json
"dungeon.combat.mp": "MP: **{{mp}}**/{{maxMp}}",
"dungeon.combat.mp_recover": "Recovered **{{amount}}** MP",
"dungeon.combat.mp_cost": "(-{{cost}} MP)",
"dungeon.combat.insufficient_mp": "Not enough MP for this skill!",
"rpg.material.common_shard": "Common Shard",
"rpg.material.uncommon_fragment": "Uncommon Fragment",
"rpg.material.rare_essence": "Rare Essence",
"rpg.material.epic_core": "Epic Core",
"rpg.material.legendary_soul": "Legendary Soul",
"rpg.material.mythic_heart": "Mythic Heart"
```

Add to `vi.json`:
```json
"dungeon.combat.mp": "MP: **{{mp}}**/{{maxMp}}",
"dungeon.combat.mp_recover": "Hồi **{{amount}}** MP",
"dungeon.combat.mp_cost": "(-{{cost}} MP)",
"dungeon.combat.insufficient_mp": "Không đủ MP cho kỹ năng này!",
"rpg.material.common_shard": "Mảnh Thường",
"rpg.material.uncommon_fragment": "Mảnh Không Thường",
"rpg.material.rare_essence": "Tinh Chất Hiếm",
"rpg.material.epic_core": "Lõi Sử Thi",
"rpg.material.legendary_soul": "Linh Hồn Huyền Thoại",
"rpg.material.mythic_heart": "Trái Tim Thần Thoại"
```

Add native translations to all other 13 locales. MP format strings stay the same. Material names get native translations.

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/services/rpg/rpg.config.ts src/locales/*.json
git commit -m "feat(rpg): add MP constants, material config, class-weighted drop config, and i18n keys"
```

---

## Task 2: Combat service MP integration

**Files:**
- Modify: `src/services/rpg/combat.service.ts`

- [ ] **Step 1: Read the current combat service**

Read `src/services/rpg/combat.service.ts` fully to understand existing structure.

- [ ] **Step 2: Add MP imports and update types**

Add to the import from `./rpg.config`:
```typescript
MP_REGEN_PER_TURN, MP_REGEN_ON_DEFEND, SKILL1_MP_COST, SKILL2_MP_COST,
```

Update `CombatantState`:
```typescript
export interface CombatantState {
    hp: number;
    maxHp: number;
    mp: number;        // NEW
    maxMp: number;     // NEW
    stats: StatBlock;
    statusEffects: StatusEffect[];
}
```

Update `CombatActionResult`:
```typescript
export interface CombatActionResult {
    // ... all existing fields ...
    mpCost: number;           // NEW — MP spent this action
    mpRegen: number;          // NEW — MP recovered this turn (passive + defend)
    currentMp: number;        // NEW — MP after action + regen
    insufficientMp: boolean;  // NEW — true if skill failed due to no MP
}
```

- [ ] **Step 3: Update `initCombat` to accept MP params**

Add `userMp: number` and `maxMp: number` parameters:

```typescript
function initCombat(
    userId: string,
    classType: ClassType,
    userStats: StatBlock,
    userHp: number,
    maxHp: number,
    userMp: number,    // NEW
    maxMp: number,     // NEW
    monster: { name: string; emoji: string; stats: MonsterStats },
    isBoss: boolean
): RpgCombatState {
    // ... existing code ...
    user: {
        hp: userHp,
        maxHp,
        mp: userMp,      // NEW
        maxMp,            // NEW
        stats: { ...userStats },
        statusEffects: [],
    },
    // ...
}
```

- [ ] **Step 4: Update `executeAction` with MP logic**

Key changes inside `executeAction`:

**At the start, before any action logic:**
```typescript
// MP cost check for skills
let mpCost = 0;
if (action === "skill1") mpCost = SKILL1_MP_COST;
if (action === "skill2") mpCost = SKILL2_MP_COST;

if (mpCost > 0 && state.user.mp < mpCost) {
    return {
        userDamage: 0, monsterDamage: 0,
        userHp: state.user.hp, monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: false, lost: false, fled: false, turnsUp: false,
        mpCost: 0, mpRegen: 0, currentMp: state.user.mp,
        insufficientMp: true,
    };
}

// Deduct MP
if (mpCost > 0) {
    state.user.mp -= mpCost;
}
```

**At the end of every action (before return), add MP regen:**
```typescript
// MP regen (passive + defend bonus)
let mpRegen = MP_REGEN_PER_TURN;
if (action === "defend") {
    mpRegen += MP_REGEN_ON_DEFEND;
}
state.user.mp = Math.min(state.user.maxMp, state.user.mp + mpRegen);
```

**Add `mpCost`, `mpRegen`, `currentMp`, `insufficientMp: false` to ALL return objects.**

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: May have errors in files importing `CombatActionResult` (dungeon buttons) — they'll be updated in Task 4. The combat service itself should compile.

- [ ] **Step 6: Commit**

```bash
git add src/services/rpg/combat.service.ts
git commit -m "feat(rpg): add MP system to combat service — cost, regen, and insufficient check"
```

---

## Task 3: Equipment service — materials + class-weighted drops

**Files:**
- Modify: `src/services/rpg/equipment.service.ts`
- Modify: `src/services/rpg/character.service.ts`

- [ ] **Step 1: Add material drop function to `equipment.service.ts`**

Add imports:
```typescript
import { MATERIALS, CLASS_PRIORITY_SLOTS, CLASS_PRIORITY_WEIGHTS, CLASS_MATCH_CHANCE, type MaterialDef } from "./rpg.config";
import { randomInRange } from "../../util/math/random";
```

Add function:
```typescript
function rollMaterialDrops(floor: number, source: "monster" | "treasure" | "boss"): { key: string; qty: number }[] {
    const drops: { key: string; qty: number }[] = [];

    for (const mat of MATERIALS) {
        if (floor < mat.minFloor) continue;
        if (Math.random() < mat.dropChance) {
            drops.push({ key: mat.key, qty: randomInRange(mat.minQty, mat.maxQty) });
        }
    }

    // Treasure always drops at least 1 material
    if (source === "treasure" && drops.length === 0) {
        drops.push({ key: "common_shard", qty: randomInRange(2, 4) });
    }

    // Boss guaranteed 1 Rare+ material
    if (source === "boss") {
        const hasRarePlus = drops.some((d) => {
            const mat = MATERIALS.find((m) => m.key === d.key);
            return mat && mat.minFloor >= 6; // Rare Essence minFloor = 6
        });
        if (!hasRarePlus) {
            // Find highest available tier at this floor that's Rare+
            const rareOrAbove = MATERIALS.filter((m) => m.minFloor >= 6 && floor >= m.minFloor);
            const fallback = rareOrAbove.length > 0 ? rareOrAbove[rareOrAbove.length - 1] : MATERIALS[MATERIALS.length - 2]; // uncommon_fragment if no rare available
            drops.push({ key: fallback.key, qty: 1 });
        }
    }

    return drops;
}
```

- [ ] **Step 2: Add class-weighted slot selection**

Add helper functions:
```typescript
function rollSlotForClass(classType: ClassType, source: "monster" | "treasure" | "boss"): EquipmentSlot {
    // Boss: 100% class priority
    // Others: 70% class priority, 30% random
    const useClassPriority = source === "boss" || Math.random() < CLASS_MATCH_CHANCE;

    if (useClassPriority) {
        const slots = CLASS_PRIORITY_SLOTS[classType];
        const roll = Math.random();
        if (roll < CLASS_PRIORITY_WEIGHTS[0]) return slots[0];
        if (roll < CLASS_PRIORITY_WEIGHTS[0] + CLASS_PRIORITY_WEIGHTS[1]) return slots[1];
        return slots[2];
    }

    return EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)];
}

function rollRarityForSource(floor: number, source: "monster" | "treasure" | "boss"): Rarity {
    if (source === "boss") {
        // Minimum Rare — reroll until >= Rare
        const rareIndex = RARITIES.indexOf("rare");
        let rarity = rollRarity(floor);
        while (RARITIES.indexOf(rarity) < rareIndex) {
            rarity = rollRarity(floor);
        }
        return rarity;
    }
    if (source === "treasure") {
        return rollRarity(floor + 5); // shift +1 tier
    }
    return rollRarity(floor);
}
```

- [ ] **Step 3: Refactor `createEquipmentDrop` to accept `source` param**

Change signature:
```typescript
async function createEquipmentDrop(ownerId: string, floor: number, classType: ClassType, source: "monster" | "treasure" | "boss" = "monster"): Promise<IEquipment> {
    const slot = rollSlotForClass(classType, source);
    const data = generateEquipment(ownerId, slot, floor, classType);
    // Override rarity with source-based roll
    data.rarity = rollRarityForSource(floor, source);
    // Regenerate stats with new rarity
    data.stats = generateEquipmentStats(slot, data.rarity, floor);
    return EquipmentModel.create(data);
}
```

Note: The `generateEquipment` function already exists. We just override the rarity after generation.

- [ ] **Step 4: Add `rollMaterialDrops` and updated functions to export**

Add to the default export object:
```typescript
rollMaterialDrops,
rollSlotForClass,
rollRarityForSource,
```

- [ ] **Step 5: Add `addMaterials` to `character.service.ts`**

```typescript
async function addMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void> {
    if (materials.length === 0) return;
    const inc: Record<string, number> = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = qty;
    }
    await CharacterModel.updateOne({ userId }, { $inc: inc });
    await redis.deleteKey(`rpg_char:${userId}`);
}

function getMaxMp(level: number): number {
    return MP_BASE + level * MP_PER_LEVEL;
}
```

Add import for `MP_BASE`, `MP_PER_LEVEL` from `./rpg.config`.
Add `addMaterials` and `getMaxMp` to the default export.

- [ ] **Step 6: Verify build**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/services/rpg/equipment.service.ts src/services/rpg/character.service.ts
git commit -m "feat(rpg): add material drops, class-weighted equipment drops, and addMaterials service"
```

---

## Task 4: Dungeon service + command + button handlers integration

**Files:**
- Modify: `src/services/economy/dungeon.service.ts`
- Modify: `src/commands/slash/dungeon.ts`
- Modify: `src/buttons/dungeonAttack.button.ts`
- Modify: `src/buttons/dungeonSkill1.button.ts`
- Modify: `src/buttons/dungeonSkill2.button.ts`
- Modify: `src/buttons/dungeonDefend.button.ts`
- Modify: `src/buttons/dungeonContinue.button.ts`

This is the big integration task. All changes are interconnected — modifying one file affects imports/types in others.

- [ ] **Step 1: Read ALL files that need modification**

Read each file fully before making changes:
- `src/services/economy/dungeon.service.ts`
- `src/commands/slash/dungeon.ts`
- All 5 button files listed above

Also read the updated services:
- `src/services/rpg/combat.service.ts` (updated in Task 2)
- `src/services/rpg/equipment.service.ts` (updated in Task 3)
- `src/services/rpg/character.service.ts` (updated in Task 3)

- [ ] **Step 2: Update `dungeon.service.ts`**

Key changes:

**Add `mp`/`maxMp` to `DungeonRunState`:**
```typescript
export interface DungeonRunState {
    // ... existing fields ...
    mp: number;       // NEW — persists across encounters
    maxMp: number;    // NEW
}
```

**Update `startRun` to initialize MP:**
```typescript
async function startRun(userId: string, locale: string): Promise<DungeonRunState> {
    const char = await CharacterService.requireCharacter(userId);
    const stats = await CharacterService.getEffectiveStats(userId);
    const maxMp = CharacterService.getMaxMp(char.level);

    return {
        // ... existing fields ...
        mp: maxMp,        // start full
        maxMp,
    };
}
```

**Update `resolveCombatWin` to include material drops:**
Add `EquipmentService.rollMaterialDrops(floor, isBoss ? "boss" : "monster")` call.
Add `CharacterService.addMaterials(userId, materialDrops)` call.
Pass `source` to `EquipmentService.createEquipmentDrop(userId, floor, classType, isBoss ? "boss" : "monster")`.
Return `materialDrops` in the result.

**Update `resolveTreasure` similarly:**
`rollMaterialDrops(floor, "treasure")`, `addMaterials`, pass `"treasure"` to `createEquipmentDrop`.

**Update `CombatResolveResult` and `TreasureResult` types to include `materialDrops: { key: string; qty: number }[]`.**

- [ ] **Step 3: Update `dungeon.ts` command**

Key changes:

**`buildCombatRow`** — disable skill buttons when MP insufficient:
```typescript
export function buildCombatRow(locale: SupportedLocale, classType: ClassType, currentMp: number): ActionRowBuilder<ButtonBuilder> {
    const [skill1, skill2] = CombatService.getSkillLabels(classType);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        // Attack — always enabled
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_ATTACK)
            .setLabel(t(locale, "dungeon.btn.attack"))
            .setEmoji("⚔️")
            .setStyle(ButtonStyle.Danger),
        // Skill 1 — disabled if MP < 20
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL1)
            .setLabel(t(locale, `rpg.skill.${skill1.key}`))
            .setEmoji(skill1.emoji)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentMp < SKILL1_MP_COST),
        // Skill 2 — disabled if MP < 30
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL2)
            .setLabel(t(locale, `rpg.skill.${skill2.key}`))
            .setEmoji(skill2.emoji)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentMp < SKILL2_MP_COST),
        // Defend + Run unchanged
        // ...
    );
}
```

Add `SKILL1_MP_COST`, `SKILL2_MP_COST` to imports from rpg.config.

**Combat embed** — add MP line after HP:
```
HP: **85**/120 | Dragon HP: **45**/230
MP: **55**/100
```

**Pass `currentMp` to `buildCombatRow` everywhere it's called** (in processEncounter and button handlers that rebuild the combat row).

**`initCombat` calls** — pass `runState.mp` and `runState.maxMp` as new params.

- [ ] **Step 4: Update combat button handlers**

**`dungeonAttack.button.ts`:**
- After combat action, update `runState.mp = result.currentMp` (save MP to run state)
- Display MP in combat embed
- Display material drops in win description
- Pass `currentMp` to `buildCombatRow` when rebuilding buttons

**`dungeonSkill1.button.ts` and `dungeonSkill2.button.ts`:**
- If `result.insufficientMp`, reply ephemeral with `t(locale, "dungeon.combat.insufficient_mp")`
- Display MP cost in action line: `"Used Fireball (-20 MP)"`
- Otherwise same as attack handler for win/loss resolution

**`dungeonDefend.button.ts`:**
- Display MP recovery: `"Recovered 20 MP"` in action description
- Update `runState.mp = result.currentMp`

**`dungeonContinue.button.ts`:**
- For treasure encounters: display material drops in treasure embed
- Pass `runState.mp` and `runState.maxMp` to `initCombat` for monster encounters
- After combat win resolution, save `runState.mp` from the combat state

- [ ] **Step 5: Verify full build**

Run: `npm run build`
Expected: Clean compile with zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/economy/dungeon.service.ts src/commands/slash/dungeon.ts src/buttons/dungeonAttack.button.ts src/buttons/dungeonSkill1.button.ts src/buttons/dungeonSkill2.button.ts src/buttons/dungeonDefend.button.ts src/buttons/dungeonContinue.button.ts
git commit -m "feat(dungeon): integrate MP system, material drops, and class-weighted equipment in dungeon"
```

---

## Task 5: Integration testing

**Files:** None (testing only)

- [ ] **Step 1: Verify full build**

Run: `npm run build`

- [ ] **Step 2: Start dev server and test MP system**

1. `/adventure create` → pick Mage
2. `/dungeon` → verify combat embed shows `MP: **55**/55` (Level 1)
3. Use Fireball (Skill 1) → verify `-20 MP`, shows `MP: **40**/55` (after +5 regen)
4. Use Ice Shard (Skill 2) → verify `-30 MP`, shows `MP: **15**/55`
5. Try Skill 1 again → button should be disabled (15 < 20 MP)
6. Use Defend → verify `+20 MP` recovery (15 + 5 passive + 15 defend = 35 MP)
7. Basic Attack → verify free (no MP cost)

- [ ] **Step 3: Test material drops**

1. Win a monster on floor 1 → may drop Common Shard (60% chance)
2. Find treasure → always drops at least 1 material
3. Reach floor 5+ boss → verify guaranteed Rare+ material
4. `/adventure inventory` → verify materials shown (or check via profile)

- [ ] **Step 4: Test class-weighted drops**

1. Play as Mage → equipment drops should favor weapon (staff/wand), accessory, shield (tome)
2. Win boss → verify equipment is Rare+ rarity
3. Find treasure → verify rarity tends higher than normal monsters

- [ ] **Step 5: Commit fixes if needed**

```bash
git add -A && git commit -m "fix(dungeon): address Phase 1B integration issues"
```
