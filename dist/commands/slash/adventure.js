"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreateFlow = runCreateFlow;
// src/commands/slash/adventure.ts
const discord_js_1 = require("discord.js");
const character_service_1 = __importDefault(require("../../services/rpg/character.service"));
const equipment_model_1 = __importDefault(require("../../models/equipment.model"));
const equipment_service_1 = __importDefault(require("../../services/rpg/equipment.service"));
const guildMember_model_1 = __importDefault(require("../../models/guildMember.model"));
const rpg_config_1 = require("../../services/rpg/rpg.config");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const guildQuest_service_1 = __importDefault(require("../../services/rpg/guildQuest.service"));
const auditDispatcher_service_1 = require("../../services/audit/auditDispatcher.service");
const redis_1 = __importDefault(require("../../connector/redis"));
const button_1 = require("../../util/config/button");
const index_1 = require("../../util/config/index");
function formatStats(locale, stats) {
    return [
        `${(0, t_1.t)(locale, "rpg.stat.hp")}: **${stats.hp}**`,
        `${(0, t_1.t)(locale, "rpg.stat.str")}: **${stats.str}** | ${(0, t_1.t)(locale, "rpg.stat.def")}: **${stats.def}**`,
        `${(0, t_1.t)(locale, "rpg.stat.mag")}: **${stats.mag}** | ${(0, t_1.t)(locale, "rpg.stat.mag_def")}: **${stats.magDef}**`,
        `${(0, t_1.t)(locale, "rpg.stat.spd")}: **${stats.spd}**`,
    ].join("\n");
}
function formatStatWithBonus(label, effective, base) {
    const bonus = effective - base;
    return bonus > 0 ? `${label}: **${effective}** (+${bonus})` : `${label}: **${effective}**`;
}
// --- /adventure create ---
async function handleCreate(interaction, locale) {
    const existing = await character_service_1.default.getCharacter(interaction.user.id);
    if (existing) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.create.already_exists"))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    await runCreateFlow(interaction, locale);
}
async function runCreateFlow(interaction, locale) {
    // Build class selection embed
    const classDescriptions = rpg_config_1.CLASS_TYPES.map((cls) => {
        const config = rpg_config_1.CLASS_CONFIG[cls];
        const name = (0, t_1.t)(locale, `rpg.class.${cls}`);
        const desc = (0, t_1.t)(locale, `rpg.class.${cls}.desc`);
        return `${config.emoji} **${name}** — ${desc}`;
    }).join("\n\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.create.title"))
        .setDescription(`${(0, t_1.t)(locale, "adventure.create.desc")}\n\n${classDescriptions}`)
        .setColor(0xf39c12);
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("adventure_class_select")
        .setPlaceholder((0, t_1.t)(locale, "adventure.create.title"))
        .addOptions(rpg_config_1.CLASS_TYPES.map((cls) => new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel((0, t_1.t)(locale, `rpg.class.${cls}`))
        .setValue(cls)
        .setDescription((0, t_1.t)(locale, `rpg.class.${cls}.desc`).slice(0, 100))
        .setEmoji(rpg_config_1.CLASS_CONFIG[cls].emoji))));
    const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow],
    });
    // Await class selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "adventure_class_select",
        time: 60_000,
    })
        .catch(() => null);
    if (!selectInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const selectedClass = selectInteraction.values[0];
    const config = rpg_config_1.CLASS_CONFIG[selectedClass];
    const className = (0, t_1.t)(locale, `rpg.class.${selectedClass}`);
    // Show confirmation
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.create.confirm_title"))
        .setDescription((0, t_1.t)(locale, "adventure.create.confirm_desc", { class: className, emoji: config.emoji }))
        .addFields({
        name: (0, t_1.t)(locale, "adventure.profile.stats"),
        value: formatStats(locale, config.baseStats),
    })
        .setColor(0xf39c12);
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("adventure_confirm").setLabel("✅").setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId("adventure_cancel").setLabel("❌").setStyle(discord_js_1.ButtonStyle.Danger));
    await selectInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });
    // Await confirmation (30s)
    const confirmInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
    })
        .catch(() => null);
    if (confirmInteraction?.customId !== "adventure_confirm") {
        const cancelEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.create.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => { });
        return;
    }
    // Create character + starter gear
    await character_service_1.default.createCharacter(interaction.user.id, selectedClass);
    const equippedItems = await equipment_service_1.default.getEquippedItems(interaction.user.id);
    const weaponName = equippedItems.find((i) => i.slot === "weapon")?.name ?? "—";
    const armorName = equippedItems.find((i) => i.slot === "armor")?.name ?? "—";
    const successEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.create.success_title"))
        .setDescription((0, t_1.t)(locale, "adventure.create.success_desc", {
        class: className,
        emoji: config.emoji,
        weapon: weaponName,
        armor: armorName,
    }))
        .setColor(0x57f287);
    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
}
// --- /adventure profile ---
async function handleProfile(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const stats = await character_service_1.default.getEffectiveStats(interaction.user.id);
    const baseStats = character_service_1.default.getBaseStats(char.class, char.level);
    const progress = character_service_1.default.getExpProgress(char.exp, char.level);
    const equippedItems = await equipment_service_1.default.getEquippedItems(interaction.user.id);
    const config = rpg_config_1.CLASS_CONFIG[char.class];
    const className = (0, t_1.t)(locale, `rpg.class.${char.class}`);
    // Build stat display with equipment bonuses
    const hpLabel = (0, t_1.t)(locale, "rpg.stat.hp");
    const strLabel = (0, t_1.t)(locale, "rpg.stat.str");
    const defLabel = (0, t_1.t)(locale, "rpg.stat.def");
    const magLabel = (0, t_1.t)(locale, "rpg.stat.mag");
    const magDefLabel = (0, t_1.t)(locale, "rpg.stat.mag_def");
    const spdLabel = (0, t_1.t)(locale, "rpg.stat.spd");
    const statLines = [
        formatStatWithBonus(hpLabel, stats.hp, baseStats.hp),
        `${formatStatWithBonus(strLabel, stats.str, baseStats.str)} | ${formatStatWithBonus(defLabel, stats.def, baseStats.def)}`,
        `${formatStatWithBonus(magLabel, stats.mag, baseStats.mag)} | ${formatStatWithBonus(magDefLabel, stats.magDef, baseStats.magDef)}`,
        formatStatWithBonus(spdLabel, stats.spd, baseStats.spd),
    ].join("\n");
    // Build equipment display
    const slotNames = ["weapon", "shield", "helmet", "armor", "boots", "accessory"];
    const equipLines = slotNames
        .map((slot) => {
        const item = equippedItems.find((i) => i.slot === slot);
        const slotLabel = (0, t_1.t)(locale, `rpg.slot.${slot}`);
        if (!item)
            return `**${slotLabel}**: ${(0, t_1.t)(locale, "adventure.profile.empty_slot")}`;
        const rarityEmoji = rpg_config_1.RARITY_CONFIG[item.rarity].emoji;
        return `**${slotLabel}**: ${rarityEmoji} ${item.name}`;
    })
        .join("\n");
    // EXP bar
    const expBar = progress.needed > 0 ? `${progress.current} / ${progress.needed}` : "MAX";
    // Crate counts
    const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
    const crateDisplay = (0, t_1.t)(locale, "adventure.crate.counts", {
        bronze: String(crates.bronze),
        silver: String(crates.silver),
        gold: String(crates.gold),
    });
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.profile.title", { username: interaction.user.displayName }))
        .setDescription(`${config.emoji} ${className} — ${(0, t_1.t)(locale, "adventure.profile.level", { level: String(char.level) })}`)
        .addFields({ name: (0, t_1.t)(locale, "adventure.profile.exp"), value: expBar, inline: true }, {
        name: (0, t_1.t)(locale, "adventure.profile.gold"),
        value: (0, t_1.t)(locale, "rpg.gold", { amount: String(char.gold) }),
        inline: true,
    }, { name: (0, t_1.t)(locale, "adventure.crate.title"), value: crateDisplay, inline: true }, { name: (0, t_1.t)(locale, "adventure.profile.stats"), value: statLines }, { name: (0, t_1.t)(locale, "adventure.profile.equipment"), value: equipLines })
        .setColor(0x3498db)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /adventure equip ---
async function handleEquip(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const itemQuery = interaction.options.getString("item", true);
    // Find item by name (case-insensitive partial match) or by ObjectId
    const inventory = await equipment_service_1.default.getInventory(interaction.user.id);
    const item = inventory.find((i) => i._id.toString() === itemQuery || i.name.toLowerCase().includes(itemQuery.toLowerCase()));
    if (!item) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.equip.no_item")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    try {
        const oldEquipped = (await equipment_service_1.default.getEquippedItems(interaction.user.id)).find((i) => i.slot === item.slot);
        await equipment_service_1.default.equipItem(interaction.user.id, item._id.toString(), char.class, char.level);
        const rarityEmoji = rpg_config_1.RARITY_CONFIG[item.rarity].emoji;
        const slotLabel = (0, t_1.t)(locale, `rpg.slot.${item.slot}`);
        const description = oldEquipped
            ? (0, t_1.t)(locale, "adventure.equip.replaced", { item: item.name, rarity: rarityEmoji, old: oldEquipped.name })
            : (0, t_1.t)(locale, "adventure.equip.success", { item: item.name, rarity: rarityEmoji, slot: slotLabel });
        const embed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(0x57f287);
        await reply_1.default.embedEdit(interaction, embed);
    }
    catch (error) {
        if (error instanceof equipment_service_1.default.ClassRestrictionError) {
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "adventure.equip.wrong_class", { classes: item.classRestriction.join(", ") }))
                .setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
            return;
        }
        if (error instanceof equipment_service_1.default.LevelRequirementError) {
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "adventure.equip.level_required", { level: String(item.requiredLevel) }))
                .setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
            return;
        }
        throw error;
    }
}
// --- /adventure inventory ---
async function handleInventory(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const inventory = await equipment_service_1.default.getInventory(interaction.user.id);
    // Build materials display
    const materialsDisplay = rpg_config_1.MATERIALS.filter((m) => (char.materials.get(m.key) ?? 0) > 0)
        .map((m) => m.emoji + " " + (0, t_1.t)(locale, "rpg.material." + m.key) + " x" + char.materials.get(m.key))
        .join(" | ");
    if (inventory.length === 0 && !materialsDisplay) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.inventory.empty")).setColor(0x95a5a6);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.max(1, Math.ceil(inventory.length / ITEMS_PER_PAGE));
    let page = 0;
    const buildPage = (p) => {
        const start = p * ITEMS_PER_PAGE;
        const items = inventory.slice(start, start + ITEMS_PER_PAGE);
        const lines = items.map((item) => {
            const rarityEmoji = rpg_config_1.RARITY_CONFIG[item.rarity].emoji;
            const equipped = item.equipped ? (0, t_1.t)(locale, "adventure.inventory.equipped") : "";
            const slotLabel = (0, t_1.t)(locale, `rpg.slot.${item.slot}`);
            return `${equipped}${rarityEmoji} **${item.name}** (Lv.${item.requiredLevel}) — ${slotLabel}`;
        });
        const sections = [];
        if (materialsDisplay && p === 0) {
            sections.push(materialsDisplay);
        }
        if (lines.length > 0) {
            sections.push(lines.join("\n"));
        }
        return new discord_js_1.EmbedBuilder()
            .setTitle((0, t_1.t)(locale, "adventure.inventory.title", { username: interaction.user.displayName }))
            .setDescription(sections.join("\n\n") || (0, t_1.t)(locale, "adventure.inventory.empty"))
            .setFooter({
            text: (0, t_1.t)(locale, "adventure.inventory.page", { current: String(p + 1), total: String(totalPages) }),
        })
            .setColor(0x3498db);
    };
    const embed = buildPage(page);
    if (totalPages <= 1) {
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Pagination buttons
    const buildNavRow = (p) => new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("inv_prev")
        .setLabel("◀")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(p === 0), new discord_js_1.ButtonBuilder()
        .setCustomId("inv_next")
        .setLabel("▶")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1));
    const message = await interaction.editReply({ embeds: [embed], components: [buildNavRow(page)] });
    const collector = message.createMessageComponentCollector({ idle: 60_000 });
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.deferUpdate();
            return;
        }
        if (i.customId === "inv_prev" && page > 0)
            page--;
        else if (i.customId === "inv_next" && page < totalPages - 1)
            page++;
        await i.update({ embeds: [buildPage(page)], components: [buildNavRow(page)] });
    });
    collector.on("end", async () => {
        await interaction.editReply({ components: [] }).catch(() => { });
    });
}
// --- /adventure unequip ---
async function handleUnequip(interaction, locale) {
    await character_service_1.default.requireCharacter(interaction.user.id);
    const slot = interaction.options.getString("slot", true);
    const equipped = (await equipment_service_1.default.getEquippedItems(interaction.user.id)).find((i) => i.slot === slot);
    if (!equipped) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.unequip.empty")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    await equipment_service_1.default.unequipSlot(interaction.user.id, slot);
    const slotLabel = (0, t_1.t)(locale, `rpg.slot.${slot}`);
    const embed = new discord_js_1.EmbedBuilder()
        .setDescription((0, t_1.t)(locale, "adventure.unequip.success", { item: equipped.name, slot: slotLabel }))
        .setColor(0x57f287);
    await reply_1.default.embedEdit(interaction, embed);
}
// --- /adventure craft ---
async function handleCraft(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    // Step 1: Select slot
    const slotSelectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("craft_slot")
        .setPlaceholder((0, t_1.t)(locale, "adventure.craft.select_slot"))
        .addOptions(rpg_config_1.EQUIPMENT_SLOTS.map((slot) => new discord_js_1.StringSelectMenuOptionBuilder().setLabel((0, t_1.t)(locale, `rpg.slot.${slot}`)).setValue(slot))));
    const craftEmbed = new discord_js_1.EmbedBuilder().setTitle((0, t_1.t)(locale, "adventure.craft.title")).setColor(0xf39c12);
    const message = await interaction.editReply({ embeds: [craftEmbed], components: [slotSelectRow] });
    // Await slot selection
    const slotInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_slot",
        time: 60_000,
    })
        .catch(() => null);
    if (!slotInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const selectedSlot = slotInteraction.values[0];
    // Step 2: Select rarity — only show affordable recipes
    const affordableRecipes = rpg_config_1.CRAFT_RECIPES.filter((recipe) => {
        const hasGold = char.gold >= recipe.goldCost;
        const hasMats = recipe.materials.every(({ key, qty }) => (char.materials.get(key) ?? 0) >= qty);
        return hasGold && hasMats;
    });
    if (affordableRecipes.length === 0) {
        const noRecipeEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.craft.no_recipes"))
            .setColor(0xed4245);
        await slotInteraction.update({ embeds: [noRecipeEmbed], components: [] });
        return;
    }
    const raritySelectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("craft_rarity")
        .setPlaceholder((0, t_1.t)(locale, "adventure.craft.select_rarity"))
        .addOptions(affordableRecipes.map((recipe) => {
        const rarityLabel = rpg_config_1.RARITY_CONFIG[recipe.rarity].emoji + " " + (0, t_1.t)(locale, "rpg.rarity." + recipe.rarity);
        return new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(rarityLabel)
            .setValue(recipe.rarity)
            .setDescription(recipe.goldCost + " Gold");
    })));
    await slotInteraction.update({ embeds: [craftEmbed], components: [raritySelectRow] });
    const rarityInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_rarity",
        time: 60_000,
    })
        .catch(() => null);
    if (!rarityInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const selectedRarity = rarityInteraction.values[0];
    const recipe = rpg_config_1.CRAFT_RECIPES.find((r) => r.rarity === selectedRarity);
    // Step 3: Confirm
    const matDisplay = recipe.materials
        .map(({ key, qty }) => {
        const mat = rpg_config_1.MATERIALS.find((m) => m.key === key);
        const matName = (0, t_1.t)(locale, "rpg.material." + key);
        return (mat?.emoji ?? "") + " " + matName + " x" + qty;
    })
        .join(" + ");
    const rarityDisplay = rpg_config_1.RARITY_CONFIG[selectedRarity].emoji + " " + (0, t_1.t)(locale, "rpg.rarity." + selectedRarity);
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.craft.title"))
        .setDescription((0, t_1.t)(locale, "adventure.craft.confirm", {
        rarity: rarityDisplay,
        slot: (0, t_1.t)(locale, "rpg.slot." + selectedSlot),
        materials: matDisplay,
        gold: String(recipe.goldCost),
    }))
        .setColor(rpg_config_1.RARITY_CONFIG[selectedRarity].color);
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("craft_confirm").setLabel("✅").setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId("craft_cancel").setLabel("❌").setStyle(discord_js_1.ButtonStyle.Danger));
    await rarityInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });
    const confirmInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
    })
        .catch(() => null);
    if (confirmInteraction?.customId !== "craft_confirm") {
        const cancelEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.craft.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => { });
        return;
    }
    // Execute craft
    try {
        await character_service_1.default.deductMaterials(interaction.user.id, recipe.materials);
        await character_service_1.default.deductGold(interaction.user.id, recipe.goldCost);
    }
    catch {
        const errEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.craft.no_materials"))
            .setColor(0xed4245);
        await confirmInteraction.update({ embeds: [errEmbed], components: [] });
        return;
    }
    const item = await equipment_service_1.default.craftEquipment(interaction.user.id, selectedSlot, selectedRarity, char.class, char.level);
    const successEmbed = new discord_js_1.EmbedBuilder()
        .setDescription((0, t_1.t)(locale, "adventure.craft.success", {
        rarity: rpg_config_1.RARITY_CONFIG[item.rarity].emoji,
        name: item.name,
        slot: (0, t_1.t)(locale, "rpg.slot." + item.slot),
    }))
        .setColor(rpg_config_1.RARITY_CONFIG[item.rarity].color);
    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
    character_service_1.default.incrementItemsCrafted(interaction.user.id, 1).catch(() => { });
    guildQuest_service_1.default.trackProgress(interaction.user.id, "craft_equipment", 1, interaction.guildId ?? undefined).catch(() => { });
}
// --- /adventure crate ---
async function handleCrate(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
    const total = crates.bronze + crates.silver + crates.gold;
    if (total === 0) {
        const emptyEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.crate.empty")).setColor(0x95a5a6);
        await reply_1.default.embedEdit(interaction, emptyEmbed);
        return;
    }
    const crateEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.crate.title"))
        .setDescription((0, t_1.t)(locale, "adventure.crate.counts", {
        bronze: String(crates.bronze),
        silver: String(crates.silver),
        gold: String(crates.gold),
    }))
        .setColor(0xf39c12);
    const options = [];
    for (const type of rpg_config_1.CRATE_TYPES) {
        if (crates[type] > 0) {
            const label = rpg_config_1.CRATES[type].emoji + " " + (0, t_1.t)(locale, "rpg.crate." + type) + " (x" + crates[type] + ")";
            options.push(new discord_js_1.StringSelectMenuOptionBuilder().setLabel(label).setValue(type));
        }
    }
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("crate_select")
        .setPlaceholder((0, t_1.t)(locale, "adventure.crate.select"))
        .addOptions(options));
    const message = await interaction.editReply({ embeds: [crateEmbed], components: [selectRow] });
    const selectInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "crate_select",
        time: 60_000,
    })
        .catch(() => null);
    if (!selectInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const crateType = selectInteraction.values[0];
    const deducted = await character_service_1.default.deductCrate(interaction.user.id, crateType);
    if (!deducted) {
        const failEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.crate.empty")).setColor(0xed4245);
        await selectInteraction.update({ embeds: [failEmbed], components: [] });
        return;
    }
    const item = await equipment_service_1.default.openCrate(interaction.user.id, crateType, char.class, char.level);
    const crateTitle = rpg_config_1.CRATES[crateType].emoji + " " + (0, t_1.t)(locale, "rpg.crate." + crateType);
    const crateRarityDisplay = rpg_config_1.RARITY_CONFIG[item.rarity].emoji + " " + (0, t_1.t)(locale, "rpg.rarity." + item.rarity);
    const resultEmbed = new discord_js_1.EmbedBuilder()
        .setTitle(crateTitle)
        .setDescription((0, t_1.t)(locale, "adventure.crate.result", {
        rarity: crateRarityDisplay,
        name: item.name,
        slot: (0, t_1.t)(locale, "rpg.slot." + item.slot),
    }))
        .setColor(rpg_config_1.RARITY_CONFIG[item.rarity].color);
    await selectInteraction.update({ embeds: [resultEmbed], components: [] });
    guildQuest_service_1.default.trackProgress(interaction.user.id, "open_crates", 1, interaction.guildId ?? undefined).catch(() => { });
}
// --- /adventure shop ---
async function handleShop(interaction, locale) {
    const char = await character_service_1.default.requireCharacter(interaction.user.id);
    const crateLines = rpg_config_1.CRATE_TYPES.map((type) => {
        const crate = rpg_config_1.CRATES[type];
        const crateName = (0, t_1.t)(locale, "rpg.crate." + type);
        return crate.emoji + " **" + crateName + "** — " + crate.shopCost + " Gold 🪙";
    }).join("\n");
    const shopEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.shop.title"))
        .setDescription((0, t_1.t)(locale, "adventure.shop.desc") +
        "\n\n" +
        (0, t_1.t)(locale, "rpg.gold", { amount: String(char.gold) }) +
        "\n\n" +
        crateLines)
        .setColor(0xf39c12);
    const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(...rpg_config_1.CRATE_TYPES.map((type) => {
        const crate = rpg_config_1.CRATES[type];
        return new discord_js_1.ButtonBuilder()
            .setCustomId("shop_buy_" + type)
            .setLabel(crate.emoji + " " + crate.shopCost + " 🪙")
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setDisabled(char.gold < crate.shopCost);
    }));
    const message = await interaction.editReply({ embeds: [shopEmbed], components: [buttonRow] });
    const buyInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("shop_buy_"),
        time: 60_000,
    })
        .catch(() => null);
    if (!buyInteraction) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const crateType = buyInteraction.customId.replace("shop_buy_", "");
    const cost = rpg_config_1.CRATES[crateType].shopCost;
    try {
        await character_service_1.default.deductGold(interaction.user.id, cost);
    }
    catch {
        await buyInteraction.update({
            embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.shop.no_gold")).setColor(0xed4245)],
            components: [],
        });
        return;
    }
    const item = await equipment_service_1.default.openCrate(interaction.user.id, crateType, char.class, char.level);
    const shopCrateName = (0, t_1.t)(locale, "rpg.crate." + crateType);
    const shopTitle = rpg_config_1.CRATES[crateType].emoji + " " + (0, t_1.t)(locale, "adventure.shop.bought", { crate: shopCrateName });
    const shopRarityDisplay = rpg_config_1.RARITY_CONFIG[item.rarity].emoji + " " + (0, t_1.t)(locale, "rpg.rarity." + item.rarity);
    const resultEmbed = new discord_js_1.EmbedBuilder()
        .setTitle(shopTitle)
        .setDescription((0, t_1.t)(locale, "adventure.crate.result", {
        rarity: shopRarityDisplay,
        name: item.name,
        slot: (0, t_1.t)(locale, "rpg.slot." + item.slot),
    }))
        .setColor(rpg_config_1.RARITY_CONFIG[item.rarity].color);
    await buyInteraction.update({ embeds: [resultEmbed], components: [] });
    guildQuest_service_1.default.trackProgress(interaction.user.id, "open_crates", 1, interaction.guildId ?? undefined).catch(() => { });
}
function checkAdvancementQuest(baseClass, char, questsCompleted) {
    switch (baseClass) {
        case "swordsman":
            return { key: "adventure.advance.quest.defeat_bosses", met: char.bossKills >= 15 };
        case "tank":
            return { key: "adventure.advance.quest.reach_floor", met: char.dungeonDepth >= 25 };
        case "mage":
            return { key: "adventure.advance.quest.earn_gold", met: char.goldEarned >= 20000 };
        case "archer":
            return { key: "adventure.advance.quest.kill_monsters", met: char.monstersKilled >= 200 };
        case "assassin":
            return { key: "adventure.advance.quest.complete_quests", met: questsCompleted >= 50 };
        case "healer":
            return { key: "adventure.advance.quest.craft_equipment", met: char.itemsCrafted >= 20 };
    }
}
function buildStatBonusLine(locale, statBonus) {
    return Object.entries(statBonus)
        .map(([stat, value]) => {
        const statKey = stat === "magDef" ? "rpg.stat.mag_def" : `rpg.stat.${stat}`;
        const sign = value > 0 ? "+" : "";
        return `${(0, t_1.t)(locale, statKey)} ${sign}${Math.round(value * 100)}%`;
    })
        .join(", ");
}
async function handleAdvance(interaction, locale) {
    const userId = interaction.user.id;
    const char = await character_service_1.default.requireCharacter(userId);
    // Check: already advanced
    if (char.advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[char.advancedClass];
        const className = advConfig ? (0, t_1.t)(locale, `rpg.advanced.${advConfig.key}`) : char.advancedClass;
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.advance.already", { class: className }))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check: level requirement
    if (char.level < rpg_config_1.ADVANCEMENT_REQUIREMENTS.level) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.advance.not_ready", { level: String(rpg_config_1.ADVANCEMENT_REQUIREMENTS.level) }))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check: advancement quest
    const guildMember = await guildMember_model_1.default.findOne({ userId });
    const questsCompleted = guildMember?.questsCompleted ?? 0;
    const questCheck = checkAdvancementQuest(char.class, {
        bossKills: char.bossKills,
        dungeonDepth: char.dungeonDepth,
        goldEarned: char.goldEarned,
        monstersKilled: char.monstersKilled,
        itemsCrafted: char.itemsCrafted,
    }, questsCompleted);
    if (!questCheck.met) {
        const questDesc = (0, t_1.t)(locale, questCheck.key);
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.advance.quest_incomplete", { quest: questDesc }))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Build preview embed with 2 paths
    const baseClass = char.class;
    const [path1Key, path2Key] = rpg_config_1.BASE_TO_ADVANCED[baseClass];
    const path1 = rpg_config_1.ADVANCED_CLASS_CONFIG[path1Key];
    const path2 = rpg_config_1.ADVANCED_CLASS_CONFIG[path2Key];
    const path1Name = (0, t_1.t)(locale, `rpg.advanced.${path1.key}`);
    const path2Name = (0, t_1.t)(locale, `rpg.advanced.${path2.key}`);
    const path1UltName = (0, t_1.t)(locale, `rpg.skill.${path1.ultimate.key}`);
    const path2UltName = (0, t_1.t)(locale, `rpg.skill.${path2.ultimate.key}`);
    const path1UltDesc = (0, t_1.t)(locale, `rpg.ultimate.${path1.ultimate.key}.desc`);
    const path2UltDesc = (0, t_1.t)(locale, `rpg.ultimate.${path2.ultimate.key}.desc`);
    const matDisplay = rpg_config_1.ADVANCEMENT_REQUIREMENTS.materials
        .map(({ key, qty }) => {
        const mat = rpg_config_1.MATERIALS.find((m) => m.key === key);
        return `${mat?.emoji ?? "⬜"} ${(0, t_1.t)(locale, `rpg.material.${key}`)} x${qty}`;
    })
        .join(" + ");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.advance.title"))
        .setDescription([
        `**${(0, t_1.t)(locale, "adventure.advance.path", { num: "1" })}: ${path1.emoji} ${path1Name}**`,
        buildStatBonusLine(locale, path1.statBonus),
        `${(0, t_1.t)(locale, "adventure.advance.ultimate")}: ${path1.ultimate.emoji} ${path1UltName} — ${path1UltDesc}`,
        "",
        `**${(0, t_1.t)(locale, "adventure.advance.path", { num: "2" })}: ${path2.emoji} ${path2Name}**`,
        buildStatBonusLine(locale, path2.statBonus),
        `${(0, t_1.t)(locale, "adventure.advance.ultimate")}: ${path2.ultimate.emoji} ${path2UltName} — ${path2UltDesc}`,
        "",
        `**${(0, t_1.t)(locale, "adventure.advance.cost")}:** ${matDisplay} + **${rpg_config_1.ADVANCEMENT_REQUIREMENTS.goldCost}** Gold 🪙`,
    ].join("\n"))
        .setColor(0xf39c12);
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("advance_select")
        .setPlaceholder((0, t_1.t)(locale, "adventure.advance.select"))
        .addOptions(new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel(path1Name)
        .setValue(path1.key)
        .setDescription(buildStatBonusLine(locale, path1.statBonus).slice(0, 100))
        .setEmoji(path1.emoji), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel(path2Name)
        .setValue(path2.key)
        .setDescription(buildStatBonusLine(locale, path2.statBonus).slice(0, 100))
        .setEmoji(path2.emoji)));
    const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow],
    });
    // Await path selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === userId && i.customId === "advance_select",
        time: 60_000,
    })
        .catch(() => null);
    if (!selectInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => { });
        return;
    }
    const selectedClass = selectInteraction.values[0];
    const selectedConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[selectedClass];
    const selectedName = (0, t_1.t)(locale, `rpg.advanced.${selectedClass}`);
    // Show confirmation
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.advance.title"))
        .setDescription((0, t_1.t)(locale, "adventure.advance.confirm", { class: `${selectedConfig.emoji} ${selectedName}` }))
        .setColor(0xf39c12);
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("advance_confirm").setLabel("✅").setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId("advance_cancel").setLabel("❌").setStyle(discord_js_1.ButtonStyle.Danger));
    await selectInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });
    const confirmInteraction = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === userId,
        time: 30_000,
    })
        .catch(() => null);
    if (confirmInteraction?.customId !== "advance_confirm") {
        const cancelEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.advance.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => { });
        return;
    }
    // Deduct materials and gold
    try {
        await character_service_1.default.deductMaterials(userId, rpg_config_1.ADVANCEMENT_REQUIREMENTS.materials);
        await character_service_1.default.deductGold(userId, rpg_config_1.ADVANCEMENT_REQUIREMENTS.goldCost);
    }
    catch {
        const errEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.advance.insufficient"))
            .setColor(0xed4245);
        await confirmInteraction.update({ embeds: [errEmbed], components: [] });
        return;
    }
    // Advance class
    await character_service_1.default.advanceClass(userId, selectedClass);
    const successEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.advance.success_title"))
        .setDescription((0, t_1.t)(locale, "adventure.advance.success", { class: `${selectedConfig.emoji} ${selectedName}` }))
        .setColor(0x57f287);
    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
}
// --- /adventure dev-reset ---
async function handleDevReset(interaction, locale) {
    // Gate: must be the developer, in the dev guild.
    if (interaction.guildId !== index_1.GUILD_ID || interaction.user.id !== index_1.DEV_USER_ID) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.dev_reset.not_authorized"))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    const userId = interaction.user.id;
    const confirmEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "adventure.dev_reset.confirm_title"))
        .setDescription((0, t_1.t)(locale, "adventure.dev_reset.confirm_desc"))
        .setColor(0xed4245);
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("dev_reset_confirm")
        .setLabel((0, t_1.t)(locale, "adventure.dev_reset.confirm_button"))
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId("dev_reset_cancel")
        .setLabel((0, t_1.t)(locale, "adventure.dev_reset.cancel_button"))
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    const message = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });
    const click = await message
        .awaitMessageComponent({
        filter: (i) => i.user.id === userId,
        time: 30_000,
    })
        .catch(() => null);
    if (click?.customId !== "dev_reset_confirm") {
        const cancelEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "adventure.dev_reset.cancelled"))
            .setColor(0x95a5a6);
        if (click) {
            await click.update({ embeds: [cancelEmbed], components: [] });
        }
        else {
            await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => { });
        }
        return;
    }
    await click.deferUpdate();
    const errors = [];
    let characterDeleted = 0;
    let equipmentDeleted = 0;
    let guildMembersDeleted = 0;
    let redisKeysDeleted = 0;
    let redisDown = false;
    try {
        await character_service_1.default.deleteCharacter(userId);
        characterDeleted = 1;
    }
    catch (err) {
        errors.push(`character: ${err instanceof Error ? err.message : "unknown"}`);
    }
    try {
        const res = await equipment_model_1.default.deleteMany({ ownerId: userId });
        equipmentDeleted = res.deletedCount ?? 0;
    }
    catch (err) {
        errors.push(`equipment: ${err instanceof Error ? err.message : "unknown"}`);
    }
    try {
        const res = await guildMember_model_1.default.deleteMany({ userId });
        guildMembersDeleted = res.deletedCount ?? 0;
    }
    catch (err) {
        errors.push(`guildMember: ${err instanceof Error ? err.message : "unknown"}`);
    }
    // Redis: user-scoped keys only. Match/action keys expire via TTL.
    const redisKeys = [`rpg_char:${userId}`, `pvp_cd:${userId}`, `pvp_active:${userId}`];
    for (const key of redisKeys) {
        try {
            await redis_1.default.deleteKey(key);
            redisKeysDeleted++;
        }
        catch {
            redisDown = true;
        }
    }
    // Build summary embed.
    let description;
    if (errors.length > 0) {
        description = (0, t_1.t)(locale, "adventure.dev_reset.partial", { errors: errors.join("\n") });
    }
    else {
        description = (0, t_1.t)(locale, "adventure.dev_reset.success", {
            character: String(characterDeleted),
            equipment: String(equipmentDeleted),
            guildMembers: String(guildMembersDeleted),
            redisKeys: String(redisKeysDeleted),
        });
        if (redisDown)
            description += `\n${(0, t_1.t)(locale, "adventure.dev_reset.cache_warning")}`;
    }
    const doneEmbed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(errors.length > 0 ? 0xf39c12 : 0x57f287);
    await interaction.editReply({ embeds: [doneEmbed], components: [] });
    // Audit log — fire-and-forget.
    const auditEmbed = new discord_js_1.EmbedBuilder()
        .setTitle("RPG dev-reset")
        .setDescription(`User: <@${userId}> (${userId})\n` +
        `Character: ${characterDeleted}, equipment: ${equipmentDeleted}, guildMembers: ${guildMembersDeleted}, redisKeys: ${redisKeysDeleted}\n` +
        (errors.length > 0 ? `Errors:\n${errors.join("\n")}` : "No errors."))
        .setColor(0xed4245)
        .setTimestamp();
    try {
        auditDispatcher_service_1.AuditDispatcherService.pushCritical(auditEmbed);
    }
    catch {
        /* noop — audit must never block dev reset */
    }
}
// --- Command definition ---
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("adventure")
        .setDescription("RPG adventure — manage your character, equipment, and stats")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.desc"))
        .addSubcommand((sub) => sub
        .setName("create")
        .setDescription("Create your character and choose a class")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.create.desc")))
        .addSubcommand((sub) => sub
        .setName("profile")
        .setDescription("View your character profile and stats")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.profile.desc")))
        .addSubcommand((sub) => sub
        .setName("equip")
        .setDescription("Equip an item from your inventory")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.equip.desc"))
        .addStringOption((opt) => opt.setName("item").setDescription("Item name or ID to equip").setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("inventory")
        .setDescription("View your equipment inventory")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.inventory.desc")))
        .addSubcommand((sub) => sub
        .setName("unequip")
        .setDescription("Unequip an item from a slot")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.unequip.desc"))
        .addStringOption((opt) => opt
        .setName("slot")
        .setDescription("Equipment slot to unequip")
        .setRequired(true)
        .addChoices({ name: "Weapon", value: "weapon" }, { name: "Shield", value: "shield" }, { name: "Helmet", value: "helmet" }, { name: "Armor", value: "armor" }, { name: "Boots", value: "boots" }, { name: "Accessory", value: "accessory" })))
        .addSubcommand((sub) => sub
        .setName("craft")
        .setDescription("Craft equipment from materials")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.craft.desc")))
        .addSubcommand((sub) => sub
        .setName("crate")
        .setDescription("Open crates from your inventory")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.crate.desc")))
        .addSubcommand((sub) => sub
        .setName("shop")
        .setDescription("Buy equipment crates with Gold")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.shop.desc")))
        .addSubcommand((sub) => sub
        .setName("advance")
        .setDescription("Advance to a specialized class")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.advance.desc")))
        .addSubcommand((sub) => sub
        .setName("dev-reset")
        .setDescription("Developer only: wipe your RPG state for testing")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.adventure.dev_reset.desc"))),
    async execute(interaction) {
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
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
                case "craft":
                    await handleCraft(interaction, locale);
                    return;
                case "crate":
                    await handleCrate(interaction, locale);
                    return;
                case "shop":
                    await handleShop(interaction, locale);
                    return;
                case "advance":
                    await handleAdvance(interaction, locale);
                    return;
                case "dev-reset":
                    await handleDevReset(interaction, locale);
                    return;
                default: {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await reply_1.default.embedEdit(interaction, embed);
                }
            }
        }
        catch (error) {
            if (error instanceof character_service_1.default.CharacterNotFoundError) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "adventure.require_character"))
                    .setColor(0xed4245);
                const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId(`${button_1.BUTTON_ID.ADVENTURE_CREATE}:${interaction.user.id}`)
                    .setLabel((0, t_1.t)(locale, "adventure.no_character.button"))
                    .setStyle(discord_js_1.ButtonStyle.Success));
                await reply_1.default.embedEditComponents(interaction, embed, [row]);
                return;
            }
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            await reply_1.default.embedEdit(interaction, embed);
        }
    },
};
