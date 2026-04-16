# RPG Adventure Command + i18n (Plan 1A-ii-a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/adventure` slash command with subcommands (create, profile, equip, inventory, unequip) and add all RPG-related i18n keys to the 15 locale files.

**Architecture:** Single command file `adventure.ts` using inline collectors for class selection. Uses `CharacterService` and `EquipmentService` from Plan 1A-i. Follows existing command patterns (Reply utility, resolveLocale, deferReply).

**Tech Stack:** Discord.js v14 (SlashCommandBuilder, StringSelectMenu, EmbedBuilder), Mongoose, i18next

**Prerequisite:** Plan 1A-i (models + config + services) must be complete.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/locales/en.json` | Modify | Add ~60 new RPG i18n keys |
| `src/locales/*.json` (14 other files) | Modify | Same keys with native translations |
| `src/commands/slash/adventure.ts` | **Create** | `/adventure create/profile/equip/inventory/unequip` command |

---

## Task 1: Add RPG i18n keys to all 15 locale files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: All other 13 locale files

- [ ] **Step 1: Add English keys to `src/locales/en.json`**

Add at the end of the file (before the closing `}`). These are the RPG system keys:

```json
"adventure.require_character": "You haven't created a character yet! Use `/adventure create` to begin your journey.",
"adventure.create.title": "Choose Your Class",
"adventure.create.desc": "Select a class to begin your adventure. This choice is permanent!",
"adventure.create.already_exists": "You already have a character!",
"adventure.create.confirm_title": "Confirm Class Selection",
"adventure.create.confirm_desc": "You chose **{{class}}** {{emoji}}. This cannot be changed. Are you sure?",
"adventure.create.success_title": "Welcome, Adventurer!",
"adventure.create.success_desc": "You are now a **{{class}}** {{emoji}}! Your journey begins.\nStarter gear: **{{weapon}}** + **{{armor}}**\nUse `/adventure profile` to view your character.",
"adventure.create.cancelled": "Class selection cancelled.",
"adventure.profile.title": "{{username}}'s Profile",
"adventure.profile.class": "Class",
"adventure.profile.level": "Level {{level}}",
"adventure.profile.exp": "EXP",
"adventure.profile.gold": "Gold",
"adventure.profile.stats": "Stats",
"adventure.profile.equipment": "Equipment",
"adventure.profile.empty_slot": "— empty —",
"adventure.equip.success": "Equipped **{{item}}** {{rarity}} to {{slot}}.",
"adventure.equip.replaced": "Equipped **{{item}}** {{rarity}}, replacing **{{old}}**.",
"adventure.equip.no_item": "Item not found in your inventory.",
"adventure.equip.wrong_class": "This item requires class: **{{classes}}**.",
"adventure.equip.level_required": "This item requires level **{{level}}**.",
"adventure.unequip.success": "Unequipped **{{item}}** from {{slot}}.",
"adventure.unequip.empty": "Nothing equipped in that slot.",
"adventure.inventory.title": "{{username}}'s Inventory",
"adventure.inventory.empty": "Your inventory is empty.",
"adventure.inventory.item": "{{rarity}} **{{name}}** (Lv.{{level}}) — {{slot}}",
"adventure.inventory.equipped": "[E] ",
"adventure.inventory.page": "Page {{current}}/{{total}}",
"rpg.class.swordsman": "Swordsman",
"rpg.class.tank": "Tank",
"rpg.class.mage": "Mage",
"rpg.class.archer": "Archer",
"rpg.class.assassin": "Assassin",
"rpg.class.healer": "Healer",
"rpg.class.swordsman.desc": "Balanced melee fighter with solid STR and DEF.",
"rpg.class.tank.desc": "High HP and defense. Absorbs damage for the team.",
"rpg.class.mage.desc": "Powerful burst magic damage. Fragile but devastating.",
"rpg.class.archer.desc": "Fast ranged attacker with high SPD.",
"rpg.class.assassin.desc": "High crit chance and speed. Strike from the shadows.",
"rpg.class.healer.desc": "Support class with healing and magic attacks.",
"rpg.stat.hp": "HP",
"rpg.stat.str": "STR",
"rpg.stat.def": "DEF",
"rpg.stat.mag": "MAG",
"rpg.stat.mag_def": "MAG DEF",
"rpg.stat.spd": "SPD",
"rpg.rarity.common": "Common",
"rpg.rarity.uncommon": "Uncommon",
"rpg.rarity.rare": "Rare",
"rpg.rarity.epic": "Epic",
"rpg.rarity.legendary": "Legendary",
"rpg.rarity.mythic": "Mythic",
"rpg.slot.weapon": "Weapon",
"rpg.slot.shield": "Shield",
"rpg.slot.helmet": "Helmet",
"rpg.slot.armor": "Armor",
"rpg.slot.boots": "Boots",
"rpg.slot.accessory": "Accessory",
"rpg.levelup": "Level Up! **{{old}}** → **{{new}}**",
"rpg.gold": "🪙 {{amount}}",
"cmd.adventure.desc": "RPG adventure — manage your character, equipment, and stats",
"cmd.adventure.create.desc": "Create your character and choose a class",
"cmd.adventure.profile.desc": "View your character profile and stats",
"cmd.adventure.equip.desc": "Equip an item from your inventory",
"cmd.adventure.inventory.desc": "View your equipment inventory",
"cmd.adventure.unequip.desc": "Unequip an item from a slot"
```

- [ ] **Step 2: Add Vietnamese keys to `src/locales/vi.json`**

Same keys with Vietnamese translations:

```json
"adventure.require_character": "Bạn chưa tạo nhân vật! Dùng `/adventure create` để bắt đầu hành trình.",
"adventure.create.title": "Chọn Lớp Nhân Vật",
"adventure.create.desc": "Chọn lớp nhân vật để bắt đầu phiêu lưu. Lựa chọn này là vĩnh viễn!",
"adventure.create.already_exists": "Bạn đã có nhân vật rồi!",
"adventure.create.confirm_title": "Xác Nhận Lớp Nhân Vật",
"adventure.create.confirm_desc": "Bạn đã chọn **{{class}}** {{emoji}}. Không thể thay đổi. Bạn chắc chắn chứ?",
"adventure.create.success_title": "Chào Mừng, Nhà Phiêu Lưu!",
"adventure.create.success_desc": "Bạn giờ là **{{class}}** {{emoji}}! Hành trình bắt đầu.\nTrang bị khởi đầu: **{{weapon}}** + **{{armor}}**\nDùng `/adventure profile` để xem nhân vật.",
"adventure.create.cancelled": "Đã hủy chọn lớp nhân vật.",
"adventure.profile.title": "Hồ Sơ {{username}}",
"adventure.profile.class": "Lớp",
"adventure.profile.level": "Cấp {{level}}",
"adventure.profile.exp": "EXP",
"adventure.profile.gold": "Vàng",
"adventure.profile.stats": "Chỉ Số",
"adventure.profile.equipment": "Trang Bị",
"adventure.profile.empty_slot": "— trống —",
"adventure.equip.success": "Đã trang bị **{{item}}** {{rarity}} vào {{slot}}.",
"adventure.equip.replaced": "Đã trang bị **{{item}}** {{rarity}}, thay thế **{{old}}**.",
"adventure.equip.no_item": "Không tìm thấy vật phẩm trong kho.",
"adventure.equip.wrong_class": "Vật phẩm này yêu cầu lớp: **{{classes}}**.",
"adventure.equip.level_required": "Vật phẩm này yêu cầu cấp **{{level}}**.",
"adventure.unequip.success": "Đã gỡ **{{item}}** khỏi {{slot}}.",
"adventure.unequip.empty": "Không có gì trang bị ở vị trí đó.",
"adventure.inventory.title": "Kho Đồ {{username}}",
"adventure.inventory.empty": "Kho đồ trống.",
"adventure.inventory.item": "{{rarity}} **{{name}}** (Lv.{{level}}) — {{slot}}",
"adventure.inventory.equipped": "[E] ",
"adventure.inventory.page": "Trang {{current}}/{{total}}",
"rpg.class.swordsman": "Kiếm Sĩ",
"rpg.class.tank": "Chiến Binh",
"rpg.class.mage": "Pháp Sư",
"rpg.class.archer": "Cung Thủ",
"rpg.class.assassin": "Sát Thủ",
"rpg.class.healer": "Thánh Chức",
"rpg.class.swordsman.desc": "Chiến binh cận chiến cân bằng với STR và DEF tốt.",
"rpg.class.tank.desc": "HP và phòng thủ cao. Hấp thụ sát thương cho đội.",
"rpg.class.mage.desc": "Sát thương phép burst mạnh mẽ. Mỏng nhưng hủy diệt.",
"rpg.class.archer.desc": "Xạ thủ nhanh với SPD cao.",
"rpg.class.assassin.desc": "Tỉ lệ chí mạng và tốc độ cao. Tấn công từ bóng tối.",
"rpg.class.healer.desc": "Lớp hỗ trợ với hồi máu và tấn công phép.",
"rpg.stat.hp": "HP",
"rpg.stat.str": "STR",
"rpg.stat.def": "DEF",
"rpg.stat.mag": "MAG",
"rpg.stat.mag_def": "MAG DEF",
"rpg.stat.spd": "SPD",
"rpg.rarity.common": "Thường",
"rpg.rarity.uncommon": "Không thường",
"rpg.rarity.rare": "Hiếm",
"rpg.rarity.epic": "Sử thi",
"rpg.rarity.legendary": "Huyền thoại",
"rpg.rarity.mythic": "Thần thoại",
"rpg.slot.weapon": "Vũ khí",
"rpg.slot.shield": "Khiên",
"rpg.slot.helmet": "Mũ",
"rpg.slot.armor": "Giáp",
"rpg.slot.boots": "Giày",
"rpg.slot.accessory": "Phụ kiện",
"rpg.levelup": "Lên cấp! **{{old}}** → **{{new}}**",
"rpg.gold": "🪙 {{amount}}",
"cmd.adventure.desc": "Phiêu lưu RPG — quản lý nhân vật, trang bị và chỉ số",
"cmd.adventure.create.desc": "Tạo nhân vật và chọn lớp",
"cmd.adventure.profile.desc": "Xem hồ sơ nhân vật và chỉ số",
"cmd.adventure.equip.desc": "Trang bị vật phẩm từ kho",
"cmd.adventure.inventory.desc": "Xem kho trang bị",
"cmd.adventure.unequip.desc": "Gỡ trang bị khỏi vị trí"
```

- [ ] **Step 3: Add keys to all other 13 locale files**

Each file gets the same ~60 keys translated to native language. The stat abbreviations (HP, STR, DEF, MAG, SPD) and item format strings stay in English across all locales. Class names and descriptions get native translations. The implementer should provide natural translations for each language — not English placeholders.

**Key groups to translate for each locale:**
- `adventure.*` — UI strings for the adventure command
- `rpg.class.*` — Class names + descriptions
- `rpg.rarity.*` — Rarity names
- `rpg.slot.*` — Equipment slot names
- `rpg.levelup`, `rpg.gold` — Level up and gold display
- `cmd.adventure.*` — Command descriptions

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add RPG adventure and class system translation keys to all 15 locales"
```

---

## Task 2: `/adventure create` subcommand

**Files:**
- Create: `src/commands/slash/adventure.ts`

This task creates the adventure command file with the `create` subcommand. Other subcommands will be added in subsequent tasks.

- [ ] **Step 1: Create the adventure command with `create` subcommand**

```typescript
// src/commands/slash/adventure.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import CharacterService from "../../services/rpg/character.service";
import EquipmentService from "../../services/rpg/equipment.service";
import { CLASS_CONFIG, CLASS_TYPES, EQUIPMENT_SLOTS, RARITY_CONFIG, type ClassType, type EquipmentSlot } from "../../services/rpg/rpg.config";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

function formatStats(locale: SupportedLocale, stats: Record<string, number>): string {
    return [
        `${t(locale, "rpg.stat.hp")}: **${stats.hp}**`,
        `${t(locale, "rpg.stat.str")}: **${stats.str}** | ${t(locale, "rpg.stat.def")}: **${stats.def}**`,
        `${t(locale, "rpg.stat.mag")}: **${stats.mag}** | ${t(locale, "rpg.stat.mag_def")}: **${stats.magDef}**`,
        `${t(locale, "rpg.stat.spd")}: **${stats.spd}**`,
    ].join("\n");
}

async function handleCreate(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Check if character already exists
    const existing = await CharacterService.getCharacter(interaction.user.id);
    if (existing) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.create.already_exists"))
            .setColor(0xed4245);
        return Reply.embedEdit(interaction, embed) as unknown as void;
    }

    // Build class selection embed
    const classDescriptions = CLASS_TYPES.map((cls) => {
        const config = CLASS_CONFIG[cls];
        const name = t(locale, `rpg.class.${cls}`);
        const desc = t(locale, `rpg.class.${cls}.desc`);
        return `${config.emoji} **${name}** — ${desc}`;
    }).join("\n\n");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.create.title"))
        .setDescription(`${t(locale, "adventure.create.desc")}\n\n${classDescriptions}`)
        .setColor(0xf39c12);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("adventure_class_select")
            .setPlaceholder(t(locale, "adventure.create.title"))
            .addOptions(
                CLASS_TYPES.map((cls) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(t(locale, `rpg.class.${cls}`))
                        .setValue(cls)
                        .setDescription(t(locale, `rpg.class.${cls}.desc`).slice(0, 100))
                        .setEmoji(CLASS_CONFIG[cls].emoji)
                )
            )
    );

    const message = await interaction.editReply({ embeds: [embed], components: [selectRow] });

    // Await class selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "adventure_class_select",
            time: 60_000,
        })
        .catch(() => null);

    if (!selectInteraction || !selectInteraction.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedClass = selectInteraction.values[0] as ClassType;
    const config = CLASS_CONFIG[selectedClass];
    const className = t(locale, `rpg.class.${selectedClass}`);

    // Show confirmation
    const confirmEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.create.confirm_title"))
        .setDescription(t(locale, "adventure.create.confirm_desc", { class: className, emoji: config.emoji }))
        .addFields({
            name: t(locale, "adventure.profile.stats"),
            value: formatStats(locale, config.baseStats),
        })
        .setColor(0xf39c12);

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("adventure_confirm").setLabel("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("adventure_cancel").setLabel("❌").setStyle(ButtonStyle.Danger)
    );

    await selectInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });

    // Await confirmation
    const confirmInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 30_000,
        })
        .catch(() => null);

    if (!confirmInteraction || confirmInteraction.customId !== "adventure_confirm") {
        const cancelEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.create.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    // Create character
    const character = await CharacterService.createCharacter(interaction.user.id, selectedClass);
    const equippedItems = await EquipmentService.getEquippedItems(interaction.user.id);
    const weaponName = equippedItems.find((i) => i.slot === "weapon")?.name ?? "—";
    const armorName = equippedItems.find((i) => i.slot === "armor")?.name ?? "—";

    const successEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.create.success_title"))
        .setDescription(
            t(locale, "adventure.create.success_desc", {
                class: className,
                emoji: config.emoji,
                weapon: weaponName,
                armor: armorName,
            })
        )
        .setColor(0x57f287);

    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
}

export default {
    data: new SlashCommandBuilder()
        .setName("adventure")
        .setDescription("RPG adventure — manage your character, equipment, and stats")
        .setDescriptionLocalizations(descriptionLocales("cmd.adventure.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("create")
                .setDescription("Create your character and choose a class")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.create.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("profile")
                .setDescription("View your character profile and stats")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.profile.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("equip")
                .setDescription("Equip an item from your inventory")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.equip.desc"))
                .addStringOption((opt) =>
                    opt.setName("item").setDescription("Item name or ID to equip").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("inventory")
                .setDescription("View your equipment inventory")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.inventory.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("unequip")
                .setDescription("Unequip an item from a slot")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.unequip.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("slot")
                        .setDescription("Equipment slot to unequip")
                        .setRequired(true)
                        .addChoices(
                            { name: "Weapon", value: "weapon" },
                            { name: "Shield", value: "shield" },
                            { name: "Helmet", value: "helmet" },
                            { name: "Armor", value: "armor" },
                            { name: "Boots", value: "boots" },
                            { name: "Accessory", value: "accessory" }
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const subcommand = interaction.options.getSubcommand(true);

        try {
            switch (subcommand) {
                case "create":
                    await handleCreate(interaction, locale);
                    return;
                case "profile":
                    await handleProfile(interaction, locale);
                    return;
                case "equip":
                    await handleEquip(interaction, locale);
                    return;
                case "inventory":
                    await handleInventory(interaction, locale);
                    return;
                case "unequip":
                    await handleUnequip(interaction, locale);
                    return;
                default: {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    return Reply.embedEdit(interaction, embed);
                }
            }
        } catch (error) {
            if (error instanceof CharacterService.CharacterNotFoundError) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "adventure.require_character"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

Note: `handleProfile`, `handleEquip`, `handleInventory`, `handleUnequip` are referenced but not yet implemented — they will be added in Tasks 3-5. For the build to pass, add placeholder stubs at the end of the file (before `export default`):

```typescript
async function handleProfile(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Implemented in Task 3
    const embed = new EmbedBuilder().setDescription("Coming soon...").setColor(0x95a5a6);
    await Reply.embedEdit(interaction, embed);
}

async function handleEquip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Implemented in Task 4
    const embed = new EmbedBuilder().setDescription("Coming soon...").setColor(0x95a5a6);
    await Reply.embedEdit(interaction, embed);
}

async function handleInventory(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Implemented in Task 4
    const embed = new EmbedBuilder().setDescription("Coming soon...").setColor(0x95a5a6);
    await Reply.embedEdit(interaction, embed);
}

async function handleUnequip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    // Implemented in Task 4
    const embed = new EmbedBuilder().setDescription("Coming soon...").setColor(0x95a5a6);
    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/adventure.ts
git commit -m "feat(adventure): add /adventure create subcommand with class selection flow"
```

---

## Task 3: `/adventure profile` subcommand

**Files:**
- Modify: `src/commands/slash/adventure.ts`

Replace the `handleProfile` stub with the full implementation.

- [ ] **Step 1: Implement `handleProfile`**

Replace the stub:

```typescript
async function handleProfile(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const stats = await CharacterService.getEffectiveStats(interaction.user.id);
    const baseStats = CharacterService.getBaseStats(char.class as ClassType, char.level);
    const progress = CharacterService.getExpProgress(char.exp, char.level);
    const equippedItems = await EquipmentService.getEquippedItems(interaction.user.id);

    const config = CLASS_CONFIG[char.class as ClassType];
    const className = t(locale, `rpg.class.${char.class}`);

    // Build stat display with equipment bonuses
    const statLines = [
        `${t(locale, "rpg.stat.hp")}: **${stats.hp}** ${stats.hp > baseStats.hp ? `(+${stats.hp - baseStats.hp})` : ""}`,
        `${t(locale, "rpg.stat.str")}: **${stats.str}** ${stats.str > baseStats.str ? `(+${stats.str - baseStats.str})` : ""} | ${t(locale, "rpg.stat.def")}: **${stats.def}** ${stats.def > baseStats.def ? `(+${stats.def - baseStats.def})` : ""}`,
        `${t(locale, "rpg.stat.mag")}: **${stats.mag}** ${stats.mag > baseStats.mag ? `(+${stats.mag - baseStats.mag})` : ""} | ${t(locale, "rpg.stat.mag_def")}: **${stats.magDef}** ${stats.magDef > baseStats.magDef ? `(+${stats.magDef - baseStats.magDef})` : ""}`,
        `${t(locale, "rpg.stat.spd")}: **${stats.spd}** ${stats.spd > baseStats.spd ? `(+${stats.spd - baseStats.spd})` : ""}`,
    ].join("\n");

    // Build equipment display
    const slotNames: EquipmentSlot[] = ["weapon", "shield", "helmet", "armor", "boots", "accessory"];
    const equipLines = slotNames.map((slot) => {
        const item = equippedItems.find((i) => i.slot === slot);
        const slotLabel = t(locale, `rpg.slot.${slot}`);
        if (!item) return `**${slotLabel}**: ${t(locale, "adventure.profile.empty_slot")}`;
        const rarityEmoji = RARITY_CONFIG[item.rarity].emoji;
        return `**${slotLabel}**: ${rarityEmoji} ${item.name}`;
    }).join("\n");

    // EXP bar
    const expBar = progress.needed > 0
        ? `${progress.current} / ${progress.needed}`
        : "MAX";

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.profile.title", { username: interaction.user.displayName }))
        .setDescription(`${config.emoji} ${className} — ${t(locale, "adventure.profile.level", { level: String(char.level) })}`)
        .addFields(
            { name: t(locale, "adventure.profile.exp"), value: expBar, inline: true },
            { name: t(locale, "adventure.profile.gold"), value: t(locale, "rpg.gold", { amount: String(char.gold) }), inline: true },
            { name: t(locale, "adventure.profile.stats"), value: statLines },
            { name: t(locale, "adventure.profile.equipment"), value: equipLines }
        )
        .setColor(0x3498db)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/adventure.ts
git commit -m "feat(adventure): add /adventure profile subcommand with stats and equipment display"
```

---

## Task 4: `/adventure equip`, `inventory`, `unequip` subcommands

**Files:**
- Modify: `src/commands/slash/adventure.ts`

Replace all three stubs.

- [ ] **Step 1: Implement `handleEquip`**

Replace the stub:

```typescript
async function handleEquip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const itemQuery = interaction.options.getString("item", true);

    // Find item by name (case-insensitive partial match) or by ObjectId
    const inventory = await EquipmentService.getInventory(interaction.user.id);
    const item = inventory.find(
        (i) =>
            i._id.toString() === itemQuery ||
            i.name.toLowerCase().includes(itemQuery.toLowerCase())
    );

    if (!item) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.equip.no_item"))
            .setColor(0xed4245);
        return Reply.embedEdit(interaction, embed) as unknown as void;
    }

    try {
        const oldEquipped = (await EquipmentService.getEquippedItems(interaction.user.id))
            .find((i) => i.slot === item.slot);

        await EquipmentService.equipItem(
            interaction.user.id,
            item._id.toString(),
            char.class as ClassType,
            char.level
        );

        const rarityEmoji = RARITY_CONFIG[item.rarity].emoji;
        const slotLabel = t(locale, `rpg.slot.${item.slot}`);
        const description = oldEquipped
            ? t(locale, "adventure.equip.replaced", { item: item.name, rarity: rarityEmoji, old: oldEquipped.name })
            : t(locale, "adventure.equip.success", { item: item.name, rarity: rarityEmoji, slot: slotLabel });

        const embed = new EmbedBuilder().setDescription(description).setColor(0x57f287);
        await Reply.embedEdit(interaction, embed);
    } catch (error) {
        if (error instanceof EquipmentService.ClassRestrictionError) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "adventure.equip.wrong_class", { classes: item.classRestriction.join(", ") }))
                .setColor(0xed4245);
            return Reply.embedEdit(interaction, embed) as unknown as void;
        }
        if (error instanceof EquipmentService.LevelRequirementError) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "adventure.equip.level_required", { level: String(item.requiredLevel) }))
                .setColor(0xed4245);
            return Reply.embedEdit(interaction, embed) as unknown as void;
        }
        throw error;
    }
}
```

- [ ] **Step 2: Implement `handleInventory`**

Replace the stub:

```typescript
async function handleInventory(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    await CharacterService.requireCharacter(interaction.user.id);
    const inventory = await EquipmentService.getInventory(interaction.user.id);

    if (inventory.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.inventory.empty"))
            .setColor(0x95a5a6);
        return Reply.embedEdit(interaction, embed) as unknown as void;
    }

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(inventory.length / ITEMS_PER_PAGE);
    let page = 0;

    const buildPage = (p: number): EmbedBuilder => {
        const start = p * ITEMS_PER_PAGE;
        const items = inventory.slice(start, start + ITEMS_PER_PAGE);

        const lines = items.map((item) => {
            const rarityEmoji = RARITY_CONFIG[item.rarity].emoji;
            const equipped = item.equipped ? t(locale, "adventure.inventory.equipped") : "";
            const slotLabel = t(locale, `rpg.slot.${item.slot}`);
            return `${equipped}${rarityEmoji} **${item.name}** (Lv.${item.requiredLevel}) — ${slotLabel}`;
        });

        return new EmbedBuilder()
            .setTitle(t(locale, "adventure.inventory.title", { username: interaction.user.displayName }))
            .setDescription(lines.join("\n"))
            .setFooter({ text: t(locale, "adventure.inventory.page", { current: String(p + 1), total: String(totalPages) }) })
            .setColor(0x3498db);
    };

    const embed = buildPage(page);

    if (totalPages <= 1) {
        return Reply.embedEdit(interaction, embed) as unknown as void;
    }

    // Pagination buttons
    const buildNavRow = (p: number) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("inv_prev")
                .setLabel("◀")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p === 0),
            new ButtonBuilder()
                .setCustomId("inv_next")
                .setLabel("▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p >= totalPages - 1)
        );

    const message = await interaction.editReply({ embeds: [embed], components: [buildNavRow(page)] });

    const collector = message.createMessageComponentCollector({ idle: 60_000 });

    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.deferUpdate();
            return;
        }
        if (i.customId === "inv_prev" && page > 0) page--;
        else if (i.customId === "inv_next" && page < totalPages - 1) page++;

        await i.update({ embeds: [buildPage(page)], components: [buildNavRow(page)] });
    });

    collector.on("end", async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
    });
}
```

- [ ] **Step 3: Implement `handleUnequip`**

Replace the stub:

```typescript
async function handleUnequip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const slot = interaction.options.getString("slot", true) as EquipmentSlot;

    const equipped = (await EquipmentService.getEquippedItems(interaction.user.id))
        .find((i) => i.slot === slot);

    if (!equipped) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.unequip.empty"))
            .setColor(0xed4245);
        return Reply.embedEdit(interaction, embed) as unknown as void;
    }

    await EquipmentService.unequipSlot(interaction.user.id, slot);

    const slotLabel = t(locale, `rpg.slot.${slot}`);
    const embed = new EmbedBuilder()
        .setDescription(t(locale, "adventure.unequip.success", { item: equipped.name, slot: slotLabel }))
        .setColor(0x57f287);
    await Reply.embedEdit(interaction, embed);
}
```

- [ ] **Step 4: Remove the "Coming soon..." placeholder stubs** (they should now be replaced by the real implementations)

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/adventure.ts
git commit -m "feat(adventure): add equip, inventory, and unequip subcommands"
```

---

## Task 5: Deploy command and manual testing

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run start:dev`
Expected: Bot connects, `/adventure` command appears in Discord.

- [ ] **Step 2: Test `/adventure create`**

1. Run `/adventure create`
2. Verify 6 classes show in embed with stats
3. Select a class via dropdown
4. Verify confirmation embed with stats preview
5. Confirm → verify success message with starter gear names

- [ ] **Step 3: Test `/adventure profile`**

1. Run `/adventure profile`
2. Verify embed shows: class, level, EXP, gold, stats (with equipment bonuses), equipment slots

- [ ] **Step 4: Test `/adventure inventory`**

1. Run `/adventure inventory`
2. Verify 2 starter items listed (weapon + armor)
3. Both marked as [E] (equipped)

- [ ] **Step 5: Test `/adventure equip` and `/adventure unequip`**

1. Run `/adventure unequip slot:Weapon`
2. Verify success message
3. Run `/adventure profile` — weapon slot should show "— empty —"
4. Run `/adventure equip item:Iron` (partial name match)
5. Verify equip success message

- [ ] **Step 6: Test edge cases**

1. Run `/adventure create` again → should say "already exists"
2. Without character (new user): run `/adventure profile` → should say "create first"

- [ ] **Step 7: Commit any fixes**

```bash
git add src/commands/slash/adventure.ts
git commit -m "fix(adventure): address issues found during testing"
```

Only create this commit if fixes were needed.
