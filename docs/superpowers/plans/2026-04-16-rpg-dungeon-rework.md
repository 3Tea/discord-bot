# RPG Dungeon Rework (Plan 1A-ii-b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the dungeon system to use RPG character stats, class skills, Gold currency, equipment drops, and boss encounters — replacing the old per-guild coin/gem random-damage system.

**Architecture:** Rewrite `dungeon.service.ts` to use `CharacterService`, `EquipmentService`, and `CombatService` from the RPG layer. Rework `dungeon.ts` command and all 8 button handlers to use the new stat-based combat, Gold rewards, and EXP gains. Add 2 new skill button handlers. Update `DungeonRunState` and `CombatState` Redis schemas.

**Tech Stack:** Discord.js v14, Mongoose, ioredis, existing RPG services from Plan 1A-i

**Prerequisite:** Plan 1A-i (models + services) and Plan 1A-ii-a (`/adventure` command + i18n) must be complete.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/util/config/button.ts` | Modify | Add `DUNGEON_SKILL1`, `DUNGEON_SKILL2` button IDs |
| `src/locales/en.json` + 14 others | Modify | Add/update dungeon combat i18n keys for skills, Gold, EXP, bosses |
| `src/services/economy/dungeon.service.ts` | **Rewrite** | RPG-aware dungeon logic: character-based startRun, new reward structure (Gold + EXP + drops), boss encounters |
| `src/services/economy/merchant.service.ts` | Modify | Gold-based pricing, replace exchange with equipment purchase |
| `src/commands/slash/dungeon.ts` | **Rewrite** | Character gate, RPG combat buttons (5 actions), new embeds with stats |
| `src/buttons/dungeonAttack.button.ts` | **Rewrite** | Use `CombatService.executeAction("attack")`, Gold + EXP rewards |
| `src/buttons/dungeonDefend.button.ts` | **Rewrite** | Use `CombatService.executeAction("defend")` |
| `src/buttons/dungeonRun.button.ts` | Modify | Use `CombatService.executeAction("run")` |
| `src/buttons/dungeonContinue.button.ts` | Modify | Grant EXP + Gold + equipment drops on encounter resolution |
| `src/buttons/dungeonLeave.button.ts` | Modify | Accumulate Gold + EXP on run end |
| `src/buttons/dungeonHeal.button.ts` | Modify | Gold-based pricing, use character maxHp |
| `src/buttons/dungeonBuff.button.ts` | Modify | Gold-based pricing |
| `src/buttons/dungeonExchange.button.ts` | **Rewrite** | Replace coin→gem exchange with equipment purchase |
| `src/buttons/dungeonSkill1.button.ts` | **Create** | Class skill 1 button handler |
| `src/buttons/dungeonSkill2.button.ts` | **Create** | Class skill 2 button handler |

---

## Task 1: Add button IDs + dungeon i18n keys

**Files:**
- Modify: `src/util/config/button.ts`
- Modify: `src/locales/*.json` (15 files)

- [ ] **Step 1: Add new button IDs to `src/util/config/button.ts`**

Add after the existing `DUNGEON_LEAVE` entry:

```typescript
    // Dungeon skill buttons (RPG)
    DUNGEON_SKILL1: "dungeon_skill1",
    DUNGEON_SKILL2: "dungeon_skill2",
    // Dungeon merchant equipment purchase (replaces exchange)
    DUNGEON_EQUIP_BUY: "dungeon_equip_buy",
```

- [ ] **Step 2: Add/update dungeon i18n keys in `src/locales/en.json`**

Update existing keys and add new ones. Find the `dungeon.*` section and update/add:

```json
"dungeon.combat.hp": "Your HP: **{{userHp}}**/{{maxHp}} | {{monster}} HP: **{{monsterHp}}**/{{maxMonsterHp}}",
"dungeon.combat.skill": "You used **{{skill}}** dealing **{{userDmg}}** damage and took **{{monsterDmg}}** damage.",
"dungeon.combat.crit": "**CRITICAL HIT!** ",
"dungeon.combat.poison_tick": "Poison dealt **{{dmg}}** damage.",
"dungeon.combat.status_applied": "Applied **{{effect}}**!",
"dungeon.combat.heal_skill": "You healed **{{amount}}** HP!",
"dungeon.combat.turns_up": "The monster is too tough — you escaped after {{turns}} turns.",
"dungeon.combat.boss_appear": "**BOSS: {{monster}}** appears on floor **{{floor}}**!",
"dungeon.reward.gold": "+**{{amount}}** Gold 🪙",
"dungeon.reward.exp": "+**{{amount}}** EXP",
"dungeon.reward.equip_drop": "Equipment drop: {{rarity}} **{{name}}**!",
"dungeon.reward.material_drop": "Material: **{{name}}** ×{{amount}}",
"dungeon.require_character": "Create a character first! Use `/adventure create`.",
"dungeon.btn.skill1": "{{name}}",
"dungeon.btn.skill2": "{{name}}",
"dungeon.merchant.heal_option": "Restore **{{amount}}** HP (Cost: **{{cost}}** Gold 🪙)",
"dungeon.merchant.buff_option": "**{{buffType}}** boost for remaining encounters (Cost: **{{cost}}** Gold 🪙)",
"dungeon.merchant.equip_option": "Buy random equipment (Cost: **{{cost}}** Gold 🪙)",
"dungeon.merchant.heal_result": "The merchant heals you for **{{amount}}** HP. (HP: **{{hp}}**/{{maxHp}})",
"dungeon.merchant.equip_result": "Purchased: {{rarity}} **{{name}}** ({{slot}})!",
"dungeon.merchant.no_gold": "Not enough Gold!",
"dungeon.merchant.hp_full": "Your HP is already full!",
"dungeon.run.gold_summary": "Gold earned: **{{gold}}** 🪙 | EXP earned: **{{exp}}**",
"dungeon.levelup": "🎉 Level Up! **{{old}}** → **{{new}}**!"
```

- [ ] **Step 3: Add same keys to Vietnamese (`vi.json`)**

```json
"dungeon.combat.hp": "HP: **{{userHp}}**/{{maxHp}} | {{monster}} HP: **{{monsterHp}}**/{{maxMonsterHp}}",
"dungeon.combat.skill": "Bạn dùng **{{skill}}** gây **{{userDmg}}** sát thương và nhận **{{monsterDmg}}** sát thương.",
"dungeon.combat.crit": "**CHÍ MẠNG!** ",
"dungeon.combat.poison_tick": "Độc gây **{{dmg}}** sát thương.",
"dungeon.combat.status_applied": "Đã áp dụng **{{effect}}**!",
"dungeon.combat.heal_skill": "Bạn hồi **{{amount}}** HP!",
"dungeon.combat.turns_up": "Quái vật quá mạnh — bạn trốn thoát sau {{turns}} lượt.",
"dungeon.combat.boss_appear": "**BOSS: {{monster}}** xuất hiện tại tầng **{{floor}}**!",
"dungeon.reward.gold": "+**{{amount}}** Vàng 🪙",
"dungeon.reward.exp": "+**{{amount}}** EXP",
"dungeon.reward.equip_drop": "Nhận trang bị: {{rarity}} **{{name}}**!",
"dungeon.reward.material_drop": "Nguyên liệu: **{{name}}** ×{{amount}}",
"dungeon.require_character": "Tạo nhân vật trước! Dùng `/adventure create`.",
"dungeon.btn.skill1": "{{name}}",
"dungeon.btn.skill2": "{{name}}",
"dungeon.merchant.heal_option": "Hồi **{{amount}}** HP (Giá: **{{cost}}** Vàng 🪙)",
"dungeon.merchant.buff_option": "Tăng **{{buffType}}** cho các lượt còn lại (Giá: **{{cost}}** Vàng 🪙)",
"dungeon.merchant.equip_option": "Mua trang bị ngẫu nhiên (Giá: **{{cost}}** Vàng 🪙)",
"dungeon.merchant.heal_result": "Thương nhân hồi **{{amount}}** HP. (HP: **{{hp}}**/{{maxHp}})",
"dungeon.merchant.equip_result": "Đã mua: {{rarity}} **{{name}}** ({{slot}})!",
"dungeon.merchant.no_gold": "Không đủ Vàng!",
"dungeon.merchant.hp_full": "HP đã đầy!",
"dungeon.run.gold_summary": "Vàng: **{{gold}}** 🪙 | EXP: **{{exp}}**",
"dungeon.levelup": "🎉 Lên cấp! **{{old}}** → **{{new}}**!"
```

- [ ] **Step 4: Add translations to all other 13 locale files**

Same keys with native translations per language. The implementer should provide natural translations. Stat abbreviations (HP, EXP) stay in English.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```bash
git add src/util/config/button.ts src/locales/*.json
git commit -m "feat(i18n): add dungeon RPG combat i18n keys and skill button IDs"
```

---

## Task 2: Rewrite dungeon.service.ts

**Files:**
- Rewrite: `src/services/economy/dungeon.service.ts`

The dungeon service needs a full rewrite to use RPG character data instead of fixed values. Key changes:
- `startRun` loads from `CharacterModel` instead of `UserEconomyModel`
- `DungeonRunState` adds `maxHp`, `gold`, `exp`, `drops`, `classType`, `statusEffects`
- Remove `processCombatAction` (replaced by `CombatService.executeAction`)
- `resolveCombatWin` uses Gold + EXP + equipment drops instead of coin/gem
- `resolveCombatLoss` deducts Gold instead of coin
- Boss detection: `floor % 5 === 0`
- Monster stats from `getMonsterStats`/`getBossStats` instead of fixed formulas

- [ ] **Step 1: Read the current file**

Read `src/services/economy/dungeon.service.ts` fully to understand what to keep vs replace.

- [ ] **Step 2: Rewrite the file**

Replace the entire file content. The new version must:

**Keep from old version:**
- Monster tables (TIER_1, TIER_2, TIER_3) — same monster names/emojis
- `rollMonster(floor)` — same logic
- `rollEncounterType(hasLuckBuff)` — same probability table
- `rollEncounterForRun(runState)` — same logic
- `tickBuff(runState)` — same logic
- `isPrime` import from `../../util/math/prime`

**Replace/Add:**
- Import `CharacterService` from `../rpg/character.service`
- Import `CharacterModel` from `../../models/character.model`
- Import `EquipmentService` from `../rpg/equipment.service`
- Import `{ getMonsterStats, getBossStats, DUNGEON_REWARDS, ENCOUNTERS_PER_RUN, type ClassType }` from `../rpg/rpg.config`
- Import `{ tryStarDrop }` from `../../util/economy/starDrop`

**New `DungeonRunState`:**
```typescript
export interface DungeonRunState {
    userId: string;
    locale: string;
    classType: ClassType;
    hp: number;
    maxHp: number;
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    activeBuff: Buff | null;
    accumulatedGold: number;
    accumulatedExp: number;
    drops: string[];          // equipment ObjectId[] found this run
    messageId: string;
}
```
Note: removed `guildId` (dungeon is now global).

**New `startRun`:**
```typescript
async function startRun(userId: string, locale: string): Promise<DungeonRunState> {
    const char = await CharacterService.requireCharacter(userId);
    const stats = await CharacterService.getEffectiveStats(userId);

    return {
        userId,
        locale,
        classType: char.class as ClassType,
        hp: stats.hp,
        maxHp: stats.hp,
        floor: char.dungeonDepth,
        checkpoint: char.dungeonCheckpoint,
        encountersLeft: ENCOUNTERS_PER_RUN,
        activeBuff: null,
        accumulatedGold: 0,
        accumulatedExp: 0,
        drops: [],
        messageId: "",
    };
}
```

**New `resolveCombatWin`:**
```typescript
export interface CombatResolveResult {
    goldReward: number;
    expReward: number;
    starReward: boolean;
    equipDrop: { name: string; rarity: string; slot: string; id: string } | null;
    floorAdvanced: boolean;
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
    isBoss: boolean;
}

async function resolveCombatWin(userId: string, floor: number, isBoss: boolean, classType: ClassType): Promise<CombatResolveResult> {
    const rewards = DUNGEON_REWARDS.monster;
    const multiplier = isBoss ? DUNGEON_REWARDS.boss.rewardMultiplier : 1;

    const goldReward = Math.floor((rewards.goldBase + floor * rewards.goldPerFloor) * multiplier);
    const expReward = Math.floor((rewards.expBase + floor * rewards.expPerFloor) * multiplier);
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    // Gold + EXP added to character (global)
    await CharacterService.addGold(userId, goldReward);
    const levelResult = await CharacterService.addExp(userId, expReward);

    // Equipment drop check
    const equipChance = isBoss ? DUNGEON_REWARDS.boss.equipChance : rewards.equipChance;
    let equipDrop = null;
    if (Math.random() < equipChance) {
        const item = await EquipmentService.createEquipmentDrop(userId, floor, classType);
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }

    // Floor advancement
    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const char = await CharacterService.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;

    await CharacterService.updateDungeonProgress(userId, newFloor, newCheckpoint);

    return {
        goldReward,
        expReward,
        starReward,
        equipDrop,
        floorAdvanced: true,
        newFloor,
        checkpoint: newCheckpoint,
        checkpointReached,
        isBoss,
    };
}
```

**New `resolveCombatLoss`:**
```typescript
export interface CombatLossResult {
    goldLost: number;
    newFloor: number;
    checkpoint: number;
}

async function resolveCombatLoss(userId: string): Promise<CombatLossResult> {
    const char = await CharacterService.requireCharacter(userId);
    const checkpoint = char.dungeonCheckpoint;
    const goldLost = Math.min(char.gold, randomInRange(DUNGEON_REWARDS.collapse.goldLossBase, DUNGEON_REWARDS.collapse.goldLossMax));

    if (goldLost > 0) {
        await CharacterService.deductGold(userId, goldLost).catch(() => {});
    }
    await CharacterService.updateDungeonProgress(userId, checkpoint, checkpoint);

    return { goldLost, newFloor: checkpoint, checkpoint };
}
```

**New `resolveTreasure`:**
```typescript
export interface TreasureResult {
    goldReward: number;
    expReward: number;
    starReward: boolean;
    equipDrop: { name: string; rarity: string; slot: string; id: string } | null;
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
}

async function resolveTreasure(userId: string, floor: number, classType: ClassType): Promise<TreasureResult> {
    const rewards = DUNGEON_REWARDS.treasure;
    const goldReward = rewards.goldBase + floor * rewards.goldPerFloor;
    const expReward = rewards.expBase + floor * rewards.expPerFloor;
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    await CharacterService.addGold(userId, goldReward);
    await CharacterService.addExp(userId, expReward);

    let equipDrop = null;
    if (Math.random() < rewards.equipChance) {
        const item = await EquipmentService.createEquipmentDrop(userId, floor, classType);
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }

    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const char = await CharacterService.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;
    await CharacterService.updateDungeonProgress(userId, newFloor, newCheckpoint);

    return { goldReward, expReward, starReward, equipDrop, newFloor, checkpoint: newCheckpoint, checkpointReached };
}
```

**New `resolveTrap`:**
```typescript
export interface TrapResult {
    hpLost: number;
    goldLost: number;
    collapsed: boolean;
    collapseResult?: CombatLossResult;
}

async function resolveTrap(userId: string, floor: number, currentHp: number): Promise<TrapResult> {
    const hpLost = randomInRange(10, 20);
    const goldLoss = DUNGEON_REWARDS.trap.goldLossBase + floor * DUNGEON_REWARDS.trap.goldLossPerFloor;

    const char = await CharacterService.requireCharacter(userId);
    const actualGoldLost = Math.min(char.gold, goldLoss);
    if (actualGoldLost > 0) {
        await CharacterService.deductGold(userId, actualGoldLost).catch(() => {});
    }

    const collapsed = currentHp - hpLost <= 0;
    let collapseResult: CombatLossResult | undefined;
    if (collapsed) {
        collapseResult = await resolveCombatLoss(userId);
    }

    return { hpLost, goldLost: actualGoldLost, collapsed, collapseResult };
}
```

**New `isBossFloor`:**
```typescript
function isBossFloor(floor: number, encounterIndex: number): boolean {
    return floor % 5 === 0 && encounterIndex === 0; // Boss on encounter start of every 5th floor
}
```

**Keep all old exports + add new ones on the default export object.**

Remove `processCombatAction` (replaced by `CombatService`), `CombatState` type (replaced by `RpgCombatState`), `CombatActionResult` type (replaced by `CombatActionResult` from combat.service).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build WILL fail because dungeon.ts and button handlers still import old types. That's expected — they'll be updated in subsequent tasks. Verify only that `dungeon.service.ts` itself has no syntax/type errors by checking the specific error messages.

- [ ] **Step 4: Commit (may need `--no-verify` if build fails due to downstream consumers)**

```bash
git add src/services/economy/dungeon.service.ts
git commit -m "feat(dungeon): rewrite dungeon service for RPG stats, Gold, EXP, and equipment drops"
```

Note: If pre-commit hooks require a clean build, the implementer should also stub-update the imports in dungeon.ts to make the build pass. This is acceptable.

---

## Task 3: Rewrite dungeon.ts command

**Files:**
- Rewrite: `src/commands/slash/dungeon.ts`

The command file needs major changes:

- [ ] **Step 1: Read the current `dungeon.ts` fully**

Understand the embed builders, `processEncounter`, timeout scheduling, and execute flow.

- [ ] **Step 2: Rewrite the command**

Key changes:

**Imports:** Replace `CurrencyService`, `UserEconomyModel` with `CharacterService`, `CombatService`, `EquipmentService`, RPG config imports.

**Character gate:** At the start of `execute()`, after `deferReply` and `resolveLocale`, check for character:
```typescript
const char = await CharacterService.getCharacter(userId);
if (!char) {
    const embed = new EmbedBuilder()
        .setDescription(t(locale, "dungeon.require_character"))
        .setColor(0xed4245);
    return Reply.embedEdit(interaction, embed);
}
```

**Remove guild-only check:** Dungeon is now global, remove `inGuild()` check and `guildId` dependency.

**Remove economy freeze check:** Dungeon uses global Gold, not per-guild economy.

**`buildCombatRow`:** Now has 5 buttons instead of 3:
```typescript
export function buildCombatRow(locale: SupportedLocale, classType: ClassType): ActionRowBuilder<ButtonBuilder> {
    const [skill1, skill2] = CombatService.getSkillLabels(classType);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_ATTACK)
            .setLabel(t(locale, "dungeon.btn.attack"))
            .setEmoji("⚔️")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL1)
            .setLabel(t(locale, `rpg.skill.${skill1.key}`, { name: skill1.key }))
            .setEmoji(skill1.emoji)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL2)
            .setLabel(t(locale, `rpg.skill.${skill2.key}`, { name: skill2.key }))
            .setEmoji(skill2.emoji)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_DEFEND)
            .setLabel(t(locale, "dungeon.btn.defend"))
            .setEmoji("🛡️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_RUN)
            .setLabel(t(locale, "dungeon.btn.run"))
            .setEmoji("🏃")
            .setStyle(ButtonStyle.Secondary)
    );
}
```

**`buildMerchantRow`:** Replace exchange button with equipment purchase, use Gold instead of coin:
```typescript
export function buildMerchantRow(
    locale: SupportedLocale,
    merchantState: MerchantState,
    userGold: number,
    userHp: number,
    maxHp: number
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_HEAL)
            .setLabel(t(locale, "dungeon.btn.heal"))
            .setEmoji("🧪")
            .setStyle(ButtonStyle.Success)
            .setDisabled(userHp >= maxHp || userGold < merchantState.healCost),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_BUFF)
            .setLabel(t(locale, "dungeon.btn.buff"))
            .setEmoji("✨")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(userGold < merchantState.buffCost),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_EQUIP_BUY)
            .setLabel(t(locale, "dungeon.btn.exchange"))
            .setEmoji("🎁")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(userGold < merchantState.equipCost)
    );
}
```

**`processEncounter`:** For monster encounters, init combat using `CombatService.initCombat()` with character stats. Store `RpgCombatState` in Redis instead of old `CombatState`. For boss floors, use `getBossStats()`.

**Cooldown key:** Change from `dungeon_cd:${guildId}:${userId}` to `dungeon_cd:${userId}` (global).

**`startRun` call:** Pass only `(userId, locale)` instead of `(userId, guildId, locale)`.

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/dungeon.ts
git commit -m "feat(dungeon): rewrite command for RPG combat with 5 action buttons and Gold rewards"
```

---

## Task 4: Rewrite combat button handlers (attack, defend, run, skill1, skill2)

**Files:**
- Rewrite: `src/buttons/dungeonAttack.button.ts`
- Rewrite: `src/buttons/dungeonDefend.button.ts`
- Modify: `src/buttons/dungeonRun.button.ts`
- Create: `src/buttons/dungeonSkill1.button.ts`
- Create: `src/buttons/dungeonSkill2.button.ts`

All combat buttons follow the same pattern:
1. Load `RpgCombatState` from Redis
2. Verify owner
3. Call `CombatService.executeAction(state, action)`
4. Handle result (win → `resolveCombatWin`, loss → `resolveCombatLoss`, flee, turnsUp)
5. Update Redis state or clean up
6. Edit the original message with new embed

- [ ] **Step 1: Rewrite `dungeonAttack.button.ts`**

This is the most complex handler. It must:
- Import `CombatService` and `RpgCombatState` from `../../services/rpg/combat.service`
- Import `DungeonService` (new version) for `resolveCombatWin`, `resolveCombatLoss`
- Import `CharacterService` for Gold/EXP display
- Import `RARITY_CONFIG` for equipment drop display
- Load `RpgCombatState` from Redis key `dungeon_combat:${userId}`
- Call `CombatService.executeAction(state, "attack")`
- Build result embed showing: damage dealt, damage taken, HP bars, status effects
- On win: call `DungeonService.resolveCombatWin()`, show Gold + EXP + equipment drop, update `DungeonRunState`
- On loss: call `DungeonService.resolveCombatLoss()`, show collapse message
- On turnsUp: show escape message, continue/leave buttons
- Save updated combat state to Redis after each turn

- [ ] **Step 2: Rewrite `dungeonDefend.button.ts`**

Same pattern as attack but calls `CombatService.executeAction(state, "defend")`. Show heal amount + reduced damage.

- [ ] **Step 3: Modify `dungeonRun.button.ts`**

Update to load `RpgCombatState` instead of old `CombatState`. Call `CombatService.executeAction(state, "run")`.

- [ ] **Step 4: Create `dungeonSkill1.button.ts`**

New file. Same pattern as attack but calls `CombatService.executeAction(state, "skill1")`. Show skill name in the action line. Display crit hits, status effects applied, poison ticks.

```typescript
// Template structure:
export default {
    id: BUTTON_ID.DUNGEON_SKILL1,
    async execute(interaction: ButtonInteraction) {
        // Load combat state from Redis
        // Verify owner
        // Execute skill1 action via CombatService
        // Build result embed (with skill name, crit indicator, status effect)
        // Handle win/loss/turnsUp
        // Update Redis or cleanup
        // Edit message
    },
};
```

- [ ] **Step 5: Create `dungeonSkill2.button.ts`**

Same as skill1 but calls `CombatService.executeAction(state, "skill2")`.

- [ ] **Step 6: Verify build**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/buttons/dungeonAttack.button.ts src/buttons/dungeonDefend.button.ts src/buttons/dungeonRun.button.ts src/buttons/dungeonSkill1.button.ts src/buttons/dungeonSkill2.button.ts
git commit -m "feat(dungeon): rewrite combat button handlers for RPG skills and stat-based damage"
```

---

## Task 5: Rewrite continue, leave, and merchant button handlers

**Files:**
- Modify: `src/buttons/dungeonContinue.button.ts`
- Modify: `src/buttons/dungeonLeave.button.ts`
- Modify: `src/buttons/dungeonHeal.button.ts`
- Modify: `src/buttons/dungeonBuff.button.ts`
- Rewrite: `src/buttons/dungeonExchange.button.ts` → equipment purchase

- [ ] **Step 1: Modify `dungeonContinue.button.ts`**

Key changes:
- Load character stats for combat initialization
- On monster encounter: init `RpgCombatState` via `CombatService.initCombat()` using character effective stats
- Boss detection: check `DungeonService.isBossFloor()`
- For boss encounters, use `getBossStats()` instead of `getMonsterStats()`
- Store `RpgCombatState` in Redis
- Pass `classType` to `buildCombatRow()` for skill buttons

- [ ] **Step 2: Modify `dungeonLeave.button.ts`**

Key changes:
- Show accumulated Gold + EXP summary from `DungeonRunState`
- Set cooldown with global key: `dungeon_cd:${userId}` instead of `dungeon_cd:${guildId}:${userId}`
- Track quest progress (keep existing `QuestService.trackProgress`)

- [ ] **Step 3: Modify `dungeonHeal.button.ts`**

Key changes:
- Use `CharacterService.deductGold()` instead of `CurrencyService.deduct()`
- Use `runState.maxHp` instead of fixed 100
- HP display: `{{hp}}/{{maxHp}}` instead of `{{hp}}/100`

- [ ] **Step 4: Modify `dungeonBuff.button.ts`**

Key changes:
- Use `CharacterService.deductGold()` instead of `CurrencyService.deduct()`

- [ ] **Step 5: Rewrite `dungeonExchange.button.ts` → equipment purchase**

Complete rewrite. Instead of coin→gem exchange, this now purchases a random equipment item:
- Load merchant state from Redis
- Verify owner and Gold balance
- `CharacterService.deductGold(userId, merchantState.equipCost)`
- `EquipmentService.createEquipmentDrop(userId, runState.floor, runState.classType)`
- Show purchased equipment with rarity emoji + name + slot
- Update continue/leave buttons

- [ ] **Step 6: Modify `merchant.service.ts`**

Update merchant state to use Gold pricing and add `equipCost`:
```typescript
export interface MerchantState {
    encounterId: string;
    floor: number;
    currentHp: number;
    maxHp: number;          // NEW: from character stats
    healCost: number;       // Gold
    healAmount: number;
    buffCost: number;       // Gold
    buffType: BuffType;
    equipCost: number;      // NEW: replaces exchangeRate
}
```

Update `buildMerchantState` to accept `maxHp` parameter and compute `equipCost = 200 + floor * 10`.

- [ ] **Step 7: Verify build**

Run: `npm run build`

- [ ] **Step 8: Commit**

```bash
git add src/buttons/dungeonContinue.button.ts src/buttons/dungeonLeave.button.ts src/buttons/dungeonHeal.button.ts src/buttons/dungeonBuff.button.ts src/buttons/dungeonExchange.button.ts src/services/economy/merchant.service.ts
git commit -m "feat(dungeon): rewrite merchant and run handlers for Gold currency and equipment drops"
```

---

## Task 6: Add skill name i18n keys

**Files:**
- Modify: `src/locales/*.json` (15 files)

The combat buttons reference skill names via i18n keys. Add these:

- [ ] **Step 1: Add skill i18n keys to all 15 locale files**

```json
"rpg.skill.power_strike": "Power Strike",
"rpg.skill.whirlwind": "Whirlwind",
"rpg.skill.shield_bash": "Shield Bash",
"rpg.skill.fortify": "Fortify",
"rpg.skill.fireball": "Fireball",
"rpg.skill.ice_shard": "Ice Shard",
"rpg.skill.precision_shot": "Precision Shot",
"rpg.skill.quick_shot": "Quick Shot",
"rpg.skill.backstab": "Backstab",
"rpg.skill.poison_blade": "Poison Blade",
"rpg.skill.holy_light": "Holy Light",
"rpg.skill.heal": "Heal"
```

Vietnamese:
```json
"rpg.skill.power_strike": "Đòn Mạnh",
"rpg.skill.whirlwind": "Xoáy Kiếm",
"rpg.skill.shield_bash": "Đập Khiên",
"rpg.skill.fortify": "Phòng Thủ",
"rpg.skill.fireball": "Cầu Lửa",
"rpg.skill.ice_shard": "Mảnh Băng",
"rpg.skill.precision_shot": "Bắn Chính Xác",
"rpg.skill.quick_shot": "Bắn Nhanh",
"rpg.skill.backstab": "Đâm Lén",
"rpg.skill.poison_blade": "Lưỡi Độc",
"rpg.skill.holy_light": "Ánh Sáng Thánh",
"rpg.skill.heal": "Hồi Máu"
```

All other 13 locales get native translations.

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add RPG skill name translations to all 15 locales"
```

---

## Task 7: Integration testing

**Files:** None (testing only)

- [ ] **Step 1: Verify clean build**

Run: `npm run build`
Expected: Zero errors.

- [ ] **Step 2: Start dev server and test full flow**

Run: `npm run start:dev`

Test sequence:
1. `/adventure create` — pick a class (e.g., Mage)
2. `/adventure profile` — verify stats, starter gear
3. `/dungeon` — verify dungeon starts with character HP (not 100)
4. Combat: verify 5 buttons (Attack, Skill1, Skill2, Defend, Run)
5. Use Skill1 (Fireball for Mage) — verify 2.0x MAG damage
6. Use Skill2 (Ice Shard) — verify status effect applied message
7. Win a monster — verify Gold + EXP rewards (not coin/gem)
8. Treasure encounter — verify Gold + EXP + possible equipment drop
9. Trap encounter — verify Gold loss (not coin loss)
10. Merchant — verify Gold pricing, equipment purchase option
11. Boss encounter (reach floor 5 or 10) — verify "BOSS:" prefix, 2x stats
12. Leave dungeon — verify Gold + EXP summary
13. `/adventure profile` — verify Gold and EXP updated

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(dungeon): address issues found during RPG integration testing"
```

Only create this commit if fixes were needed.
