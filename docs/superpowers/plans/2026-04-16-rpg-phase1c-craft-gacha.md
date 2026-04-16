# RPG Phase 1C: Craft & Gacha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add equipment crafting from materials, gacha crate system (open/buy), and crate drops from dungeon encounters.

**Architecture:** Config-driven recipes and crate definitions in `rpg.config.ts`. Service functions in `character.service.ts` (material/crate CRUD) and `equipment.service.ts` (craft/open logic). Three new subcommands on `/adventure` (craft, crate, shop). Crate drops wired into dungeon resolve functions.

**Tech Stack:** Discord.js v14 (StringSelectMenu, ButtonBuilder), Mongoose, i18next

---

## File Map

| File | Action | Changes |
|------|--------|---------|
| `src/services/rpg/rpg.config.ts` | Modify | Add `CRAFT_RECIPES`, `CRATES`, `CRATE_DROP_RATES`, types |
| `src/models/character.model.ts` | Modify | Add `crates` field |
| `src/services/rpg/character.service.ts` | Modify | Add `deductMaterials`, `hasEnoughMaterials`, `addCrate`, `deductCrate` |
| `src/services/rpg/equipment.service.ts` | Modify | Add `craftEquipment`, `openCrate` |
| `src/services/economy/dungeon.service.ts` | Modify | Add crate drops to resolve functions |
| `src/commands/slash/adventure.ts` | Modify | Add `craft`, `crate`, `shop` subcommands + update `profile`/`inventory` |
| `src/buttons/dungeonAttack.button.ts` | Modify | Show crate drops in embeds |
| `src/buttons/dungeonContinue.button.ts` | Modify | Show crate drops in embeds |
| `src/locales/*.json` (15 files) | Modify | Add ~20 i18n keys |

---

## Task 1: Config + model + i18n

**Files:**
- Modify: `src/services/rpg/rpg.config.ts`
- Modify: `src/models/character.model.ts`
- Modify: `src/locales/*.json` (15 files)

- [ ] **Step 1: Add craft and crate config to `rpg.config.ts`**

Add at the end of the file (before the closing, or after `ENCOUNTERS_PER_RUN`):

```typescript
// --- Craft Recipes ---

export interface CraftRecipe {
    rarity: Rarity;
    materials: { key: string; qty: number }[];
    goldCost: number;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
    { rarity: "common", materials: [{ key: "common_shard", qty: 5 }], goldCost: 50 },
    { rarity: "uncommon", materials: [{ key: "uncommon_fragment", qty: 3 }, { key: "common_shard", qty: 5 }], goldCost: 150 },
    { rarity: "rare", materials: [{ key: "rare_essence", qty: 3 }, { key: "uncommon_fragment", qty: 5 }], goldCost: 500 },
    { rarity: "epic", materials: [{ key: "epic_core", qty: 3 }, { key: "rare_essence", qty: 5 }], goldCost: 1500 },
    { rarity: "legendary", materials: [{ key: "legendary_soul", qty: 3 }, { key: "epic_core", qty: 5 }], goldCost: 5000 },
    { rarity: "mythic", materials: [{ key: "mythic_heart", qty: 3 }, { key: "legendary_soul", qty: 5 }], goldCost: 15000 },
];

// --- Gacha Crate Config ---

export type CrateType = "bronze" | "silver" | "gold";
export const CRATE_TYPES = ["bronze", "silver", "gold"] as const;

export interface CrateDef {
    key: CrateType;
    emoji: string;
    shopCost: number;
    rarityWeights: Partial<Record<Rarity, number>>;
}

export const CRATES: Record<CrateType, CrateDef> = {
    bronze: { key: "bronze", emoji: "🟫", shopCost: 200, rarityWeights: { common: 50, uncommon: 35, rare: 15 } },
    silver: { key: "silver", emoji: "🥈", shopCost: 800, rarityWeights: { uncommon: 40, rare: 35, epic: 25 } },
    gold: { key: "gold", emoji: "🥇", shopCost: 2500, rarityWeights: { rare: 35, epic: 30, legendary: 25, mythic: 10 } },
};

export const CRATE_DROP_RATES = {
    monster: { bronze: 0.05 },
    treasure: { bronze: 0.15, silver: 0.05 },
    boss: { silver: 0.50, gold: 0.15 },
} as const;
```

- [ ] **Step 2: Add `crates` field to `src/models/character.model.ts`**

Add to `ICharacter` interface:
```typescript
crates: {
    bronze: number;
    silver: number;
    gold: number;
};
```

Add to schema (after `materials`):
```typescript
crates: {
    bronze: { type: Number, default: 0, min: 0 },
    silver: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 0, min: 0 },
},
```

- [ ] **Step 3: Add i18n keys to all 15 locale files**

**English (`en.json`):**
```json
"adventure.craft.title": "Craft Equipment",
"adventure.craft.select_slot": "Select equipment slot",
"adventure.craft.select_rarity": "Select rarity",
"adventure.craft.confirm": "Craft {{rarity}} {{slot}}?\nCost: {{materials}} + **{{gold}}** Gold 🪙",
"adventure.craft.success": "Crafted: {{rarity}} **{{name}}** ({{slot}})",
"adventure.craft.no_materials": "Not enough materials. Missing: {{missing}}",
"adventure.craft.no_gold": "Not enough Gold. Have **{{balance}}**, need **{{required}}** 🪙",
"adventure.craft.cancelled": "Craft cancelled.",
"adventure.craft.no_recipes": "No recipes available with your current materials.",
"adventure.crate.title": "Your Crates",
"adventure.crate.counts": "🟫 ×{{bronze}} | 🥈 ×{{silver}} | 🥇 ×{{gold}}",
"adventure.crate.empty": "No crates. Earn them from dungeon or buy at `/adventure shop`.",
"adventure.crate.select": "Select crate to open",
"adventure.crate.opening": "Opening {{crate}}...",
"adventure.crate.result": "{{rarity}} **{{name}}** ({{slot}}) — added to inventory!",
"adventure.shop.title": "Equipment Crate Shop",
"adventure.shop.desc": "Buy crates with Gold. Equipment matches your class.",
"adventure.shop.bought": "Purchased and opened {{crate}}!",
"adventure.shop.no_gold": "Not enough Gold!",
"rpg.crate.bronze": "Bronze Crate",
"rpg.crate.silver": "Silver Crate",
"rpg.crate.gold": "Gold Crate",
"dungeon.reward.crate": "{{emoji}} {{name}} ×{{amount}}",
"cmd.adventure.craft.desc": "Craft equipment from materials",
"cmd.adventure.crate.desc": "Open crates from your inventory",
"cmd.adventure.shop.desc": "Buy equipment crates with Gold"
```

**Vietnamese (`vi.json`):**
```json
"adventure.craft.title": "Chế Tạo Trang Bị",
"adventure.craft.select_slot": "Chọn vị trí trang bị",
"adventure.craft.select_rarity": "Chọn độ hiếm",
"adventure.craft.confirm": "Chế tạo {{rarity}} {{slot}}?\nChi phí: {{materials}} + **{{gold}}** Vàng 🪙",
"adventure.craft.success": "Đã chế tạo: {{rarity}} **{{name}}** ({{slot}})",
"adventure.craft.no_materials": "Không đủ nguyên liệu. Thiếu: {{missing}}",
"adventure.craft.no_gold": "Không đủ Vàng. Có **{{balance}}**, cần **{{required}}** 🪙",
"adventure.craft.cancelled": "Đã hủy chế tạo.",
"adventure.craft.no_recipes": "Không có công thức nào khả dụng với nguyên liệu hiện tại.",
"adventure.crate.title": "Rương Của Bạn",
"adventure.crate.counts": "🟫 ×{{bronze}} | 🥈 ×{{silver}} | 🥇 ×{{gold}}",
"adventure.crate.empty": "Không có rương. Kiếm từ dungeon hoặc mua tại `/adventure shop`.",
"adventure.crate.select": "Chọn rương muốn mở",
"adventure.crate.opening": "Đang mở {{crate}}...",
"adventure.crate.result": "{{rarity}} **{{name}}** ({{slot}}) — đã thêm vào kho!",
"adventure.shop.title": "Cửa Hàng Rương Trang Bị",
"adventure.shop.desc": "Mua rương bằng Vàng. Trang bị phù hợp lớp của bạn.",
"adventure.shop.bought": "Đã mua và mở {{crate}}!",
"adventure.shop.no_gold": "Không đủ Vàng!",
"rpg.crate.bronze": "Rương Đồng",
"rpg.crate.silver": "Rương Bạc",
"rpg.crate.gold": "Rương Vàng",
"dungeon.reward.crate": "{{emoji}} {{name}} ×{{amount}}",
"cmd.adventure.craft.desc": "Chế tạo trang bị từ nguyên liệu",
"cmd.adventure.crate.desc": "Mở rương từ kho",
"cmd.adventure.shop.desc": "Mua rương trang bị bằng Vàng"
```

All other 13 locales: native translations. Format strings with `{{}}` stay the same.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/services/rpg/rpg.config.ts src/models/character.model.ts src/locales/*.json
git commit -m "feat(rpg): add craft recipes, crate config, character crates field, and i18n keys"
```

---

## Task 2: Character + equipment service functions

**Files:**
- Modify: `src/services/rpg/character.service.ts`
- Modify: `src/services/rpg/equipment.service.ts`

- [ ] **Step 1: Add material/crate functions to `character.service.ts`**

Add imports: `type CrateType` from `./rpg.config`

Add functions:

```typescript
async function hasEnoughMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<boolean> {
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        if ((char.materials.get(key) ?? 0) < qty) return false;
    }
    return true;
}

async function deductMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void> {
    // Pre-check
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        if ((char.materials.get(key) ?? 0) < qty) {
            throw new InsufficientGoldError(char.materials.get(key) ?? 0, qty); // reuse error class
        }
    }
    const inc: Record<string, number> = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = -qty;
    }
    await CharacterModel.updateOne({ userId }, { $inc: inc });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function addCrate(userId: string, crateType: CrateType, qty: number = 1): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { [`crates.${crateType}`]: qty } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function deductCrate(userId: string, crateType: CrateType): Promise<boolean> {
    const result = await CharacterModel.updateOne(
        { userId, [`crates.${crateType}`]: { $gte: 1 } },
        { $inc: { [`crates.${crateType}`]: -1 } }
    );
    if (result.modifiedCount === 0) return false;
    await redis.deleteKey(`rpg_char:${userId}`);
    return true;
}
```

Add all 4 to the default export.

- [ ] **Step 2: Add craft/crate functions to `equipment.service.ts`**

Add imports: `CRAFT_RECIPES, CRATES, type CrateType, type CraftRecipe` from `./rpg.config`

Add functions:

```typescript
function getCrateRarity(crateType: CrateType): Rarity {
    const weights = CRATES[crateType].rarityWeights;
    const entries = Object.entries(weights) as [Rarity, number][];
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (const [rarity, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return rarity;
    }
    return entries[0][0]; // fallback
}

async function openCrate(ownerId: string, crateType: CrateType, classType: ClassType, level: number): Promise<IEquipment> {
    const rarity = getCrateRarity(crateType);
    const slot = rollSlotForClass(classType, "monster"); // class-weighted slot
    const data = generateEquipment(ownerId, slot, level, classType);
    (data as Record<string, unknown>).rarity = rarity;
    (data as Record<string, unknown>).stats = generateEquipmentStats(slot, rarity, level);
    return EquipmentModel.create(data);
}

async function craftEquipment(ownerId: string, slot: EquipmentSlot, rarity: Rarity, classType: ClassType, level: number): Promise<IEquipment> {
    const data = generateEquipment(ownerId, slot, level, classType);
    (data as Record<string, unknown>).rarity = rarity;
    (data as Record<string, unknown>).stats = generateEquipmentStats(slot, rarity, level);
    return EquipmentModel.create(data);
}
```

Add both + `getCrateRarity` to the default export.

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/services/rpg/character.service.ts src/services/rpg/equipment.service.ts
git commit -m "feat(rpg): add craft, crate open, material deduction, and crate CRUD service functions"
```

---

## Task 3: Adventure command — craft, crate, shop subcommands

**Files:**
- Modify: `src/commands/slash/adventure.ts`

This task adds 3 new subcommands and updates profile/inventory displays.

- [ ] **Step 1: Read the current adventure.ts**

Read `src/commands/slash/adventure.ts` fully to understand the existing subcommand structure.

- [ ] **Step 2: Add subcommand definitions**

Add 3 new `.addSubcommand()` calls to the SlashCommandBuilder (after the existing `unequip` subcommand):

```typescript
.addSubcommand((sub) =>
    sub
        .setName("craft")
        .setDescription("Craft equipment from materials")
        .setDescriptionLocalizations(descriptionLocales("cmd.adventure.craft.desc"))
)
.addSubcommand((sub) =>
    sub
        .setName("crate")
        .setDescription("Open crates from your inventory")
        .setDescriptionLocalizations(descriptionLocales("cmd.adventure.crate.desc"))
)
.addSubcommand((sub) =>
    sub
        .setName("shop")
        .setDescription("Buy equipment crates with Gold")
        .setDescriptionLocalizations(descriptionLocales("cmd.adventure.shop.desc"))
)
```

- [ ] **Step 3: Add case handlers in execute() switch**

```typescript
case "craft":
    await handleCraft(interaction, locale);
    return;
case "crate":
    await handleCrate(interaction, locale);
    return;
case "shop":
    await handleShop(interaction, locale);
    return;
```

- [ ] **Step 4: Implement `handleCraft`**

```typescript
async function handleCraft(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);

    // Step 1: Select slot
    const slotSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("craft_slot")
            .setPlaceholder(t(locale, "adventure.craft.select_slot"))
            .addOptions(
                EQUIPMENT_SLOTS.map((slot) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(t(locale, `rpg.slot.${slot}`))
                        .setValue(slot)
                )
            )
    );

    const craftEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.craft.title"))
        .setColor(0xf39c12);

    const message = await interaction.editReply({ embeds: [craftEmbed], components: [slotSelectRow] });

    // Await slot selection
    const slotInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_slot",
            time: 60_000,
        })
        .catch(() => null);

    if (!slotInteraction || !slotInteraction.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedSlot = slotInteraction.values[0] as EquipmentSlot;

    // Step 2: Select rarity — only show affordable recipes
    const affordableRecipes = CRAFT_RECIPES.filter((recipe) => {
        const hasGold = char.gold >= recipe.goldCost;
        const hasMats = recipe.materials.every(
            ({ key, qty }) => (char.materials.get(key) ?? 0) >= qty
        );
        return hasGold && hasMats;
    });

    if (affordableRecipes.length === 0) {
        const noRecipeEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.craft.no_recipes"))
            .setColor(0xed4245);
        await slotInteraction.update({ embeds: [noRecipeEmbed], components: [] });
        return;
    }

    const raritySelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("craft_rarity")
            .setPlaceholder(t(locale, "adventure.craft.select_rarity"))
            .addOptions(
                affordableRecipes.map((recipe) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${RARITY_CONFIG[recipe.rarity].emoji} ${t(locale, `rpg.rarity.${recipe.rarity}`)}`)
                        .setValue(recipe.rarity)
                        .setDescription(`${recipe.goldCost} Gold`)
                )
            )
    );

    await slotInteraction.update({ embeds: [craftEmbed], components: [raritySelectRow] });

    const rarityInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_rarity",
            time: 60_000,
        })
        .catch(() => null);

    if (!rarityInteraction || !rarityInteraction.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedRarity = rarityInteraction.values[0] as Rarity;
    const recipe = CRAFT_RECIPES.find((r) => r.rarity === selectedRarity)!;

    // Step 3: Confirm
    const matDisplay = recipe.materials
        .map(({ key, qty }) => {
            const mat = MATERIALS.find((m) => m.key === key);
            return `${mat?.emoji ?? ""} ${t(locale, `rpg.material.${key}`)} ×${qty}`;
        })
        .join(" + ");

    const confirmEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.craft.title"))
        .setDescription(
            t(locale, "adventure.craft.confirm", {
                rarity: `${RARITY_CONFIG[selectedRarity].emoji} ${t(locale, `rpg.rarity.${selectedRarity}`)}`,
                slot: t(locale, `rpg.slot.${selectedSlot}`),
                materials: matDisplay,
                gold: String(recipe.goldCost),
            })
        )
        .setColor(RARITY_CONFIG[selectedRarity].color);

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("craft_confirm").setLabel("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("craft_cancel").setLabel("❌").setStyle(ButtonStyle.Danger)
    );

    await rarityInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });

    const confirmInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 30_000,
        })
        .catch(() => null);

    if (!confirmInteraction || confirmInteraction.customId !== "craft_confirm") {
        const cancelEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.craft.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    // Execute craft
    try {
        await CharacterService.deductMaterials(interaction.user.id, recipe.materials);
        await CharacterService.deductGold(interaction.user.id, recipe.goldCost);
    } catch {
        const errEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.craft.no_materials"))
            .setColor(0xed4245);
        await confirmInteraction.update({ embeds: [errEmbed], components: [] });
        return;
    }

    const item = await EquipmentService.craftEquipment(
        interaction.user.id,
        selectedSlot,
        selectedRarity,
        char.class as ClassType,
        char.level
    );

    const successEmbed = new EmbedBuilder()
        .setDescription(
            t(locale, "adventure.craft.success", {
                rarity: `${RARITY_CONFIG[item.rarity].emoji}`,
                name: item.name,
                slot: t(locale, `rpg.slot.${item.slot}`),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
}
```

- [ ] **Step 5: Implement `handleCrate`**

```typescript
async function handleCrate(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
    const total = crates.bronze + crates.silver + crates.gold;

    if (total === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.crate.empty"))
            .setColor(0x95a5a6);
        return Reply.embedEdit(interaction, emptyEmbed) as unknown as void;
    }

    const crateEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.crate.title"))
        .setDescription(t(locale, "adventure.crate.counts", {
            bronze: String(crates.bronze),
            silver: String(crates.silver),
            gold: String(crates.gold),
        }))
        .setColor(0xf39c12);

    const options: StringSelectMenuOptionBuilder[] = [];
    for (const type of CRATE_TYPES) {
        if (crates[type] > 0) {
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${CRATES[type].emoji} ${t(locale, `rpg.crate.${type}`)} (×${crates[type]})`)
                    .setValue(type)
            );
        }
    }

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("crate_select")
            .setPlaceholder(t(locale, "adventure.crate.select"))
            .addOptions(options)
    );

    const message = await interaction.editReply({ embeds: [crateEmbed], components: [selectRow] });

    const selectInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "crate_select",
            time: 60_000,
        })
        .catch(() => null);

    if (!selectInteraction || !selectInteraction.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const crateType = selectInteraction.values[0] as CrateType;
    const success = await CharacterService.deductCrate(interaction.user.id, crateType);
    if (!success) {
        await selectInteraction.update({ embeds: [new EmbedBuilder().setDescription(t(locale, "adventure.crate.empty")).setColor(0xed4245)], components: [] });
        return;
    }

    const item = await EquipmentService.openCrate(interaction.user.id, crateType, char.class as ClassType, char.level);

    const resultEmbed = new EmbedBuilder()
        .setTitle(`${CRATES[crateType].emoji} ${t(locale, `rpg.crate.${crateType}`)}`)
        .setDescription(
            t(locale, "adventure.crate.result", {
                rarity: `${RARITY_CONFIG[item.rarity].emoji} ${t(locale, `rpg.rarity.${item.rarity}`)}`,
                name: item.name,
                slot: t(locale, `rpg.slot.${item.slot}`),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await selectInteraction.update({ embeds: [resultEmbed], components: [] });
}
```

- [ ] **Step 6: Implement `handleShop`**

```typescript
async function handleShop(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);

    const shopEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.shop.title"))
        .setDescription(
            t(locale, "adventure.shop.desc") + `\n\nYour Gold: **${char.gold}** 🪙\n\n` +
            CRATE_TYPES.map((type) => {
                const crate = CRATES[type];
                return `${crate.emoji} **${t(locale, `rpg.crate.${type}`)}** — ${crate.shopCost} Gold 🪙`;
            }).join("\n")
        )
        .setColor(0xf39c12);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...CRATE_TYPES.map((type) => {
            const crate = CRATES[type];
            return new ButtonBuilder()
                .setCustomId(`shop_buy_${type}`)
                .setLabel(`${crate.emoji} ${crate.shopCost} 🪙`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(char.gold < crate.shopCost);
        })
    );

    const message = await interaction.editReply({ embeds: [shopEmbed], components: [buttonRow] });

    const buyInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("shop_buy_"),
            time: 60_000,
        })
        .catch(() => null);

    if (!buyInteraction) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const crateType = buyInteraction.customId.replace("shop_buy_", "") as CrateType;
    const cost = CRATES[crateType].shopCost;

    try {
        await CharacterService.deductGold(interaction.user.id, cost);
    } catch {
        await buyInteraction.update({
            embeds: [new EmbedBuilder().setDescription(t(locale, "adventure.shop.no_gold")).setColor(0xed4245)],
            components: [],
        });
        return;
    }

    const item = await EquipmentService.openCrate(interaction.user.id, crateType, char.class as ClassType, char.level);

    const resultEmbed = new EmbedBuilder()
        .setTitle(`${CRATES[crateType].emoji} ${t(locale, "adventure.shop.bought", { crate: t(locale, `rpg.crate.${crateType}`) })}`)
        .setDescription(
            t(locale, "adventure.crate.result", {
                rarity: `${RARITY_CONFIG[item.rarity].emoji} ${t(locale, `rpg.rarity.${item.rarity}`)}`,
                name: item.name,
                slot: t(locale, `rpg.slot.${item.slot}`),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await buyInteraction.update({ embeds: [resultEmbed], components: [] });
}
```

- [ ] **Step 7: Add new imports**

Add to existing imports at top of `adventure.ts`:
```typescript
import { CRAFT_RECIPES, CRATES, CRATE_TYPES, MATERIALS, type CrateType, type Rarity } from "../../services/rpg/rpg.config";
```

Ensure `ButtonBuilder`, `ButtonStyle`, `StringSelectMenuBuilder`, `StringSelectMenuOptionBuilder` are in the discord.js import.

- [ ] **Step 8: Update `handleProfile` to show crates**

In the profile embed, add a crate count field after gold:
```typescript
const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
// Add field:
{ name: "Crates", value: t(locale, "adventure.crate.counts", { bronze: String(crates.bronze), silver: String(crates.silver), gold: String(crates.gold) }), inline: true },
```

- [ ] **Step 9: Update `handleInventory` to show materials**

At the top of the inventory embed (before equipment list), add a materials section:
```typescript
const materialsDisplay = MATERIALS
    .filter((m) => (char.materials.get(m.key) ?? 0) > 0)
    .map((m) => `${m.emoji} ${t(locale, `rpg.material.${m.key}`)} ×${char.materials.get(m.key)}`)
    .join(" | ");

if (materialsDisplay) {
    // Add as first field or prepend to description
}
```

- [ ] **Step 10: Verify build**

Run: `npm run build`

- [ ] **Step 11: Commit**

```bash
git add src/commands/slash/adventure.ts
git commit -m "feat(adventure): add craft, crate, and shop subcommands with profile/inventory updates"
```

---

## Task 4: Dungeon crate drops

**Files:**
- Modify: `src/services/economy/dungeon.service.ts`
- Modify: `src/buttons/dungeonAttack.button.ts`
- Modify: `src/buttons/dungeonContinue.button.ts`

- [ ] **Step 1: Read all 3 files**

Read dungeon.service.ts, dungeonAttack.button.ts, dungeonContinue.button.ts to understand current resolve functions and embed builders.

- [ ] **Step 2: Update `dungeon.service.ts` resolve functions**

Add import: `import { CRATE_DROP_RATES, CRATE_TYPES, type CrateType } from "../rpg/rpg.config";`

In `resolveCombatWin`:
After material drops, add crate drop logic:
```typescript
const crateDrops: { type: CrateType; qty: number }[] = [];
const dropRates = isBoss ? CRATE_DROP_RATES.boss : CRATE_DROP_RATES.monster;
for (const [type, chance] of Object.entries(dropRates)) {
    if (Math.random() < chance) {
        crateDrops.push({ type: type as CrateType, qty: 1 });
        await CharacterService.addCrate(userId, type as CrateType);
    }
}
```
Add `crateDrops` to `CombatResolveResult` type and return value.

In `resolveTreasure`:
Same pattern with `CRATE_DROP_RATES.treasure`.
Add `crateDrops` to `TreasureResult` type and return value.

- [ ] **Step 3: Update button handlers to display crate drops**

In `dungeonAttack.button.ts` (win description builder):
Import `CRATES` from rpg.config. After material drops display, add:
```typescript
if (resolve.crateDrops?.length) {
    for (const drop of resolve.crateDrops) {
        lines.push(t(locale, "dungeon.reward.crate", {
            emoji: CRATES[drop.type].emoji,
            name: t(locale, `rpg.crate.${drop.type}`),
            amount: String(drop.qty),
        }));
    }
}
```

In `dungeonContinue.button.ts` (treasure embed builder):
Same crate display logic for treasure rewards.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/services/economy/dungeon.service.ts src/buttons/dungeonAttack.button.ts src/buttons/dungeonContinue.button.ts
git commit -m "feat(dungeon): add crate drops from monster, treasure, and boss encounters"
```

---

## Task 5: Integration testing

**Files:** None (testing only)

- [ ] **Step 1: Verify clean build**

Run: `npm run build`

- [ ] **Step 2: Test craft flow**

1. `/adventure craft` → select Weapon → select Common → confirm → verify equipment created
2. Check `/adventure inventory` → new crafted item appears
3. Try craft without enough materials → verify error message
4. Try craft without enough Gold → verify error message

- [ ] **Step 3: Test crate flow**

1. Earn crates from dungeon (play until one drops, or manually seed DB)
2. `/adventure crate` → select Bronze → verify equipment revealed
3. `/adventure crate` with 0 crates → verify "no crates" message

- [ ] **Step 4: Test shop flow**

1. `/adventure shop` → verify 3 crate buttons with prices
2. Buy Bronze Crate (200 Gold) → verify Gold deducted + equipment shown
3. Try with insufficient Gold → verify button disabled or error

- [ ] **Step 5: Test dungeon crate drops**

1. Play dungeon, win monsters → occasionally see "🟫 Bronze Crate ×1" in rewards
2. Find treasure → occasionally see crate drop
3. Win boss → higher chance of Silver/Gold crate

- [ ] **Step 6: Test profile/inventory updates**

1. `/adventure profile` → verify crate counts shown
2. `/adventure inventory` → verify materials section shown

- [ ] **Step 7: Commit fixes if needed**

```bash
git add -A && git commit -m "fix(rpg): address Phase 1C integration issues"
```
