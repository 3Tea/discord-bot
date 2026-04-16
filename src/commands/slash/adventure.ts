// src/commands/slash/adventure.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
import CharacterService from "../../services/rpg/character.service";
import EquipmentService from "../../services/rpg/equipment.service";
import GuildMemberModel from "../../models/guildMember.model";
import {
    CLASS_CONFIG,
    CLASS_TYPES,
    CRAFT_RECIPES,
    CRATES,
    CRATE_TYPES,
    EQUIPMENT_SLOTS,
    MATERIALS,
    RARITY_CONFIG,
    ADVANCED_CLASS_CONFIG,
    ADVANCEMENT_REQUIREMENTS,
    BASE_TO_ADVANCED,
    type ClassType,
    type CrateType,
    type EquipmentSlot,
    type Rarity,
    type AdvancedClassType,
} from "../../services/rpg/rpg.config";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import GuildQuestService from "../../services/rpg/guildQuest.service";

// --- Helpers ---

interface StatValues {
    hp: number;
    str: number;
    def: number;
    mag: number;
    magDef: number;
    spd: number;
}

function formatStats(locale: SupportedLocale, stats: StatValues): string {
    return [
        `${t(locale, "rpg.stat.hp")}: **${stats.hp}**`,
        `${t(locale, "rpg.stat.str")}: **${stats.str}** | ${t(locale, "rpg.stat.def")}: **${stats.def}**`,
        `${t(locale, "rpg.stat.mag")}: **${stats.mag}** | ${t(locale, "rpg.stat.mag_def")}: **${stats.magDef}**`,
        `${t(locale, "rpg.stat.spd")}: **${stats.spd}**`,
    ].join("\n");
}

function formatStatWithBonus(label: string, effective: number, base: number): string {
    const bonus = effective - base;
    return bonus > 0 ? `${label}: **${effective}** (+${bonus})` : `${label}: **${effective}**`;
}

// --- /adventure create ---

async function handleCreate(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const existing = await CharacterService.getCharacter(interaction.user.id);
    if (existing) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.create.already_exists"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
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

    const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow as unknown as ActionRowBuilder<MessageActionRowComponentBuilder>],
    });

    // Await class selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "adventure_class_select",
            time: 60_000,
        })
        .catch(() => null);

    if (!selectInteraction?.isStringSelectMenu()) {
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

    // Await confirmation (30s)
    const confirmInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 30_000,
        })
        .catch(() => null);

    if (confirmInteraction?.customId !== "adventure_confirm") {
        const cancelEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.create.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    // Create character + starter gear
    await CharacterService.createCharacter(interaction.user.id, selectedClass);
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

// --- /adventure profile ---

async function handleProfile(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const stats = await CharacterService.getEffectiveStats(interaction.user.id);
    const baseStats = CharacterService.getBaseStats(char.class, char.level);
    const progress = CharacterService.getExpProgress(char.exp, char.level);
    const equippedItems = await EquipmentService.getEquippedItems(interaction.user.id);

    const config = CLASS_CONFIG[char.class];
    const className = t(locale, `rpg.class.${char.class}`);

    // Build stat display with equipment bonuses
    const hpLabel = t(locale, "rpg.stat.hp");
    const strLabel = t(locale, "rpg.stat.str");
    const defLabel = t(locale, "rpg.stat.def");
    const magLabel = t(locale, "rpg.stat.mag");
    const magDefLabel = t(locale, "rpg.stat.mag_def");
    const spdLabel = t(locale, "rpg.stat.spd");

    const statLines = [
        formatStatWithBonus(hpLabel, stats.hp, baseStats.hp),
        `${formatStatWithBonus(strLabel, stats.str, baseStats.str)} | ${formatStatWithBonus(defLabel, stats.def, baseStats.def)}`,
        `${formatStatWithBonus(magLabel, stats.mag, baseStats.mag)} | ${formatStatWithBonus(magDefLabel, stats.magDef, baseStats.magDef)}`,
        formatStatWithBonus(spdLabel, stats.spd, baseStats.spd),
    ].join("\n");

    // Build equipment display
    const slotNames: EquipmentSlot[] = ["weapon", "shield", "helmet", "armor", "boots", "accessory"];
    const equipLines = slotNames
        .map((slot) => {
            const item = equippedItems.find((i) => i.slot === slot);
            const slotLabel = t(locale, `rpg.slot.${slot}`);
            if (!item) return `**${slotLabel}**: ${t(locale, "adventure.profile.empty_slot")}`;
            const rarityEmoji = RARITY_CONFIG[item.rarity].emoji;
            return `**${slotLabel}**: ${rarityEmoji} ${item.name}`;
        })
        .join("\n");

    // EXP bar
    const expBar = progress.needed > 0 ? `${progress.current} / ${progress.needed}` : "MAX";

    // Crate counts
    const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
    const crateDisplay = t(locale, "adventure.crate.counts", {
        bronze: String(crates.bronze),
        silver: String(crates.silver),
        gold: String(crates.gold),
    });

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.profile.title", { username: interaction.user.displayName }))
        .setDescription(
            `${config.emoji} ${className} — ${t(locale, "adventure.profile.level", { level: String(char.level) })}`
        )
        .addFields(
            { name: t(locale, "adventure.profile.exp"), value: expBar, inline: true },
            {
                name: t(locale, "adventure.profile.gold"),
                value: t(locale, "rpg.gold", { amount: String(char.gold) }),
                inline: true,
            },
            { name: t(locale, "adventure.crate.title"), value: crateDisplay, inline: true },
            { name: t(locale, "adventure.profile.stats"), value: statLines },
            { name: t(locale, "adventure.profile.equipment"), value: equipLines }
        )
        .setColor(0x3498db)
        .setTimestamp();

    await Reply.embedEdit(interaction, embed);
}

// --- /adventure equip ---

async function handleEquip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const itemQuery = interaction.options.getString("item", true);

    // Find item by name (case-insensitive partial match) or by ObjectId
    const inventory = await EquipmentService.getInventory(interaction.user.id);
    const item = inventory.find(
        (i) => i._id.toString() === itemQuery || i.name.toLowerCase().includes(itemQuery.toLowerCase())
    );

    if (!item) {
        const embed = new EmbedBuilder().setDescription(t(locale, "adventure.equip.no_item")).setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    try {
        const oldEquipped = (await EquipmentService.getEquippedItems(interaction.user.id)).find(
            (i) => i.slot === item.slot
        );

        await EquipmentService.equipItem(interaction.user.id, item._id.toString(), char.class, char.level);

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
            await Reply.embedEdit(interaction, embed);
            return;
        }
        if (error instanceof EquipmentService.LevelRequirementError) {
            const embed = new EmbedBuilder()
                .setDescription(t(locale, "adventure.equip.level_required", { level: String(item.requiredLevel) }))
                .setColor(0xed4245);
            await Reply.embedEdit(interaction, embed);
            return;
        }
        throw error;
    }
}

// --- /adventure inventory ---

async function handleInventory(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const inventory = await EquipmentService.getInventory(interaction.user.id);

    // Build materials display
    const materialsDisplay = MATERIALS.filter((m) => (char.materials.get(m.key) ?? 0) > 0)
        .map((m) => m.emoji + " " + t(locale, "rpg.material." + m.key) + " x" + char.materials.get(m.key))
        .join(" | ");

    if (inventory.length === 0 && !materialsDisplay) {
        const embed = new EmbedBuilder().setDescription(t(locale, "adventure.inventory.empty")).setColor(0x95a5a6);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.max(1, Math.ceil(inventory.length / ITEMS_PER_PAGE));
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

        const sections: string[] = [];
        if (materialsDisplay && p === 0) {
            sections.push(materialsDisplay);
        }
        if (lines.length > 0) {
            sections.push(lines.join("\n"));
        }

        return new EmbedBuilder()
            .setTitle(t(locale, "adventure.inventory.title", { username: interaction.user.displayName }))
            .setDescription(sections.join("\n\n") || t(locale, "adventure.inventory.empty"))
            .setFooter({
                text: t(locale, "adventure.inventory.page", { current: String(p + 1), total: String(totalPages) }),
            })
            .setColor(0x3498db);
    };

    const embed = buildPage(page);

    if (totalPages <= 1) {
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Pagination buttons
    const buildNavRow = (p: number): ActionRowBuilder<ButtonBuilder> =>
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

// --- /adventure unequip ---

async function handleUnequip(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    await CharacterService.requireCharacter(interaction.user.id);
    const slot = interaction.options.getString("slot", true) as EquipmentSlot;

    const equipped = (await EquipmentService.getEquippedItems(interaction.user.id)).find((i) => i.slot === slot);

    if (!equipped) {
        const embed = new EmbedBuilder().setDescription(t(locale, "adventure.unequip.empty")).setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    await EquipmentService.unequipSlot(interaction.user.id, slot);

    const slotLabel = t(locale, `rpg.slot.${slot}`);
    const embed = new EmbedBuilder()
        .setDescription(t(locale, "adventure.unequip.success", { item: equipped.name, slot: slotLabel }))
        .setColor(0x57f287);
    await Reply.embedEdit(interaction, embed);
}

// --- /adventure craft ---

async function handleCraft(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);

    // Step 1: Select slot
    const slotSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("craft_slot")
            .setPlaceholder(t(locale, "adventure.craft.select_slot"))
            .addOptions(
                EQUIPMENT_SLOTS.map((slot) =>
                    new StringSelectMenuOptionBuilder().setLabel(t(locale, `rpg.slot.${slot}`)).setValue(slot)
                )
            )
    );

    const craftEmbed = new EmbedBuilder().setTitle(t(locale, "adventure.craft.title")).setColor(0xf39c12);

    const message = await interaction.editReply({ embeds: [craftEmbed], components: [slotSelectRow] });

    // Await slot selection
    const slotInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_slot",
            time: 60_000,
        })
        .catch(() => null);

    if (!slotInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedSlot = slotInteraction.values[0] as EquipmentSlot;

    // Step 2: Select rarity — only show affordable recipes
    const affordableRecipes = CRAFT_RECIPES.filter((recipe) => {
        const hasGold = char.gold >= recipe.goldCost;
        const hasMats = recipe.materials.every(({ key, qty }) => (char.materials.get(key) ?? 0) >= qty);
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
                affordableRecipes.map((recipe) => {
                    const rarityLabel =
                        RARITY_CONFIG[recipe.rarity].emoji + " " + t(locale, "rpg.rarity." + recipe.rarity);
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(rarityLabel)
                        .setValue(recipe.rarity)
                        .setDescription(recipe.goldCost + " Gold");
                })
            )
    );

    await slotInteraction.update({ embeds: [craftEmbed], components: [raritySelectRow] });

    const rarityInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === "craft_rarity",
            time: 60_000,
        })
        .catch(() => null);

    if (!rarityInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedRarity = rarityInteraction.values[0] as Rarity;
    const recipe = CRAFT_RECIPES.find((r) => r.rarity === selectedRarity)!;

    // Step 3: Confirm
    const matDisplay = recipe.materials
        .map(({ key, qty }) => {
            const mat = MATERIALS.find((m) => m.key === key);
            const matName = t(locale, "rpg.material." + key);
            return (mat?.emoji ?? "") + " " + matName + " x" + qty;
        })
        .join(" + ");

    const rarityDisplay = RARITY_CONFIG[selectedRarity].emoji + " " + t(locale, "rpg.rarity." + selectedRarity);
    const confirmEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.craft.title"))
        .setDescription(
            t(locale, "adventure.craft.confirm", {
                rarity: rarityDisplay,
                slot: t(locale, "rpg.slot." + selectedSlot),
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

    if (confirmInteraction?.customId !== "craft_confirm") {
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
        char.class,
        char.level
    );

    const successEmbed = new EmbedBuilder()
        .setDescription(
            t(locale, "adventure.craft.success", {
                rarity: RARITY_CONFIG[item.rarity].emoji,
                name: item.name,
                slot: t(locale, "rpg.slot." + item.slot),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
    CharacterService.incrementItemsCrafted(interaction.user.id, 1).catch(() => {});
    GuildQuestService.trackProgress(interaction.user.id, "craft_equipment", 1, interaction.guildId ?? undefined).catch(
        () => {}
    );
}

// --- /adventure crate ---

async function handleCrate(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);
    const crates = char.crates ?? { bronze: 0, silver: 0, gold: 0 };
    const total = crates.bronze + crates.silver + crates.gold;

    if (total === 0) {
        const emptyEmbed = new EmbedBuilder().setDescription(t(locale, "adventure.crate.empty")).setColor(0x95a5a6);
        await Reply.embedEdit(interaction, emptyEmbed);
        return;
    }

    const crateEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.crate.title"))
        .setDescription(
            t(locale, "adventure.crate.counts", {
                bronze: String(crates.bronze),
                silver: String(crates.silver),
                gold: String(crates.gold),
            })
        )
        .setColor(0xf39c12);

    const options: StringSelectMenuOptionBuilder[] = [];
    for (const type of CRATE_TYPES) {
        if (crates[type] > 0) {
            const label = CRATES[type].emoji + " " + t(locale, "rpg.crate." + type) + " (x" + crates[type] + ")";
            options.push(new StringSelectMenuOptionBuilder().setLabel(label).setValue(type));
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

    if (!selectInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const crateType = selectInteraction.values[0] as CrateType;
    const deducted = await CharacterService.deductCrate(interaction.user.id, crateType);
    if (!deducted) {
        const failEmbed = new EmbedBuilder().setDescription(t(locale, "adventure.crate.empty")).setColor(0xed4245);
        await selectInteraction.update({ embeds: [failEmbed], components: [] });
        return;
    }

    const item = await EquipmentService.openCrate(interaction.user.id, crateType, char.class, char.level);

    const crateTitle = CRATES[crateType].emoji + " " + t(locale, "rpg.crate." + crateType);
    const crateRarityDisplay = RARITY_CONFIG[item.rarity].emoji + " " + t(locale, "rpg.rarity." + item.rarity);
    const resultEmbed = new EmbedBuilder()
        .setTitle(crateTitle)
        .setDescription(
            t(locale, "adventure.crate.result", {
                rarity: crateRarityDisplay,
                name: item.name,
                slot: t(locale, "rpg.slot." + item.slot),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await selectInteraction.update({ embeds: [resultEmbed], components: [] });
    GuildQuestService.trackProgress(interaction.user.id, "open_crates", 1, interaction.guildId ?? undefined).catch(
        () => {}
    );
}

// --- /adventure shop ---

async function handleShop(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const char = await CharacterService.requireCharacter(interaction.user.id);

    const crateLines = CRATE_TYPES.map((type) => {
        const crate = CRATES[type];
        const crateName = t(locale, "rpg.crate." + type);
        return crate.emoji + " **" + crateName + "** — " + crate.shopCost + " Gold 🪙";
    }).join("\n");

    const shopEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.shop.title"))
        .setDescription(
            t(locale, "adventure.shop.desc") +
                "\n\n" +
                t(locale, "rpg.gold", { amount: String(char.gold) }) +
                "\n\n" +
                crateLines
        )
        .setColor(0xf39c12);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...CRATE_TYPES.map((type) => {
            const crate = CRATES[type];
            return new ButtonBuilder()
                .setCustomId("shop_buy_" + type)
                .setLabel(crate.emoji + " " + crate.shopCost + " 🪙")
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

    const item = await EquipmentService.openCrate(interaction.user.id, crateType, char.class, char.level);

    const shopCrateName = t(locale, "rpg.crate." + crateType);
    const shopTitle = CRATES[crateType].emoji + " " + t(locale, "adventure.shop.bought", { crate: shopCrateName });
    const shopRarityDisplay = RARITY_CONFIG[item.rarity].emoji + " " + t(locale, "rpg.rarity." + item.rarity);
    const resultEmbed = new EmbedBuilder()
        .setTitle(shopTitle)
        .setDescription(
            t(locale, "adventure.crate.result", {
                rarity: shopRarityDisplay,
                name: item.name,
                slot: t(locale, "rpg.slot." + item.slot),
            })
        )
        .setColor(RARITY_CONFIG[item.rarity].color);

    await buyInteraction.update({ embeds: [resultEmbed], components: [] });
    GuildQuestService.trackProgress(interaction.user.id, "open_crates", 1, interaction.guildId ?? undefined).catch(
        () => {}
    );
}

// --- /adventure advance ---

interface AdvancementQuestCheck {
    key: string;
    met: boolean;
}

function checkAdvancementQuest(
    baseClass: ClassType,
    char: { bossKills: number; dungeonDepth: number; goldEarned: number; monstersKilled: number; itemsCrafted: number },
    questsCompleted: number
): AdvancementQuestCheck {
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

function buildStatBonusLine(locale: SupportedLocale, statBonus: Partial<Record<string, number>>): string {
    return Object.entries(statBonus)
        .map(([stat, value]) => {
            const statKey = stat === "magDef" ? "rpg.stat.mag_def" : `rpg.stat.${stat}`;
            const sign = (value as number) > 0 ? "+" : "";
            return `${t(locale, statKey)} ${sign}${Math.round((value as number) * 100)}%`;
        })
        .join(", ");
}

async function handleAdvance(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const userId = interaction.user.id;
    const char = await CharacterService.requireCharacter(userId);

    // Check: already advanced
    if (char.advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[char.advancedClass as AdvancedClassType];
        const className = advConfig ? t(locale, `rpg.advanced.${advConfig.key}`) : char.advancedClass;
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.advance.already", { class: className }))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Check: level requirement
    if (char.level < ADVANCEMENT_REQUIREMENTS.level) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.advance.not_ready", { level: String(ADVANCEMENT_REQUIREMENTS.level) }))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Check: advancement quest
    const guildMember = await GuildMemberModel.findOne({ userId });
    const questsCompleted = guildMember?.questsCompleted ?? 0;
    const questCheck = checkAdvancementQuest(
        char.class as ClassType,
        {
            bossKills: char.bossKills,
            dungeonDepth: char.dungeonDepth,
            goldEarned: char.goldEarned,
            monstersKilled: char.monstersKilled,
            itemsCrafted: char.itemsCrafted,
        },
        questsCompleted
    );

    if (!questCheck.met) {
        const questDesc = t(locale, questCheck.key);
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.advance.quest_incomplete", { quest: questDesc }))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Build preview embed with 2 paths
    const baseClass = char.class as ClassType;
    const [path1Key, path2Key] = BASE_TO_ADVANCED[baseClass];
    const path1 = ADVANCED_CLASS_CONFIG[path1Key];
    const path2 = ADVANCED_CLASS_CONFIG[path2Key];

    const path1Name = t(locale, `rpg.advanced.${path1.key}`);
    const path2Name = t(locale, `rpg.advanced.${path2.key}`);
    const path1UltName = t(locale, `rpg.skill.${path1.ultimate.key}`);
    const path2UltName = t(locale, `rpg.skill.${path2.ultimate.key}`);
    const path1UltDesc = t(locale, `rpg.ultimate.${path1.ultimate.key}.desc`);
    const path2UltDesc = t(locale, `rpg.ultimate.${path2.ultimate.key}.desc`);

    const matDisplay = ADVANCEMENT_REQUIREMENTS.materials
        .map(({ key, qty }) => {
            const mat = MATERIALS.find((m) => m.key === key);
            return `${mat?.emoji ?? "⬜"} ${t(locale, `rpg.material.${key}`)} x${qty}`;
        })
        .join(" + ");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.advance.title"))
        .setDescription(
            [
                `**${t(locale, "adventure.advance.path", { num: "1" })}: ${path1.emoji} ${path1Name}**`,
                buildStatBonusLine(locale, path1.statBonus),
                `${t(locale, "adventure.advance.ultimate")}: ${path1.ultimate.emoji} ${path1UltName} — ${path1UltDesc}`,
                "",
                `**${t(locale, "adventure.advance.path", { num: "2" })}: ${path2.emoji} ${path2Name}**`,
                buildStatBonusLine(locale, path2.statBonus),
                `${t(locale, "adventure.advance.ultimate")}: ${path2.ultimate.emoji} ${path2UltName} — ${path2UltDesc}`,
                "",
                `**${t(locale, "adventure.advance.cost")}:** ${matDisplay} + **${ADVANCEMENT_REQUIREMENTS.goldCost}** Gold 🪙`,
            ].join("\n")
        )
        .setColor(0xf39c12);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("advance_select")
            .setPlaceholder(t(locale, "adventure.advance.select"))
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(path1Name)
                    .setValue(path1.key)
                    .setDescription(buildStatBonusLine(locale, path1.statBonus).slice(0, 100))
                    .setEmoji(path1.emoji),
                new StringSelectMenuOptionBuilder()
                    .setLabel(path2Name)
                    .setValue(path2.key)
                    .setDescription(buildStatBonusLine(locale, path2.statBonus).slice(0, 100))
                    .setEmoji(path2.emoji)
            )
    );

    const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow as unknown as ActionRowBuilder<MessageActionRowComponentBuilder>],
    });

    // Await path selection (60s)
    const selectInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === userId && i.customId === "advance_select",
            time: 60_000,
        })
        .catch(() => null);

    if (!selectInteraction?.isStringSelectMenu()) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
    }

    const selectedClass = selectInteraction.values[0] as AdvancedClassType;
    const selectedConfig = ADVANCED_CLASS_CONFIG[selectedClass];
    const selectedName = t(locale, `rpg.advanced.${selectedClass}`);

    // Show confirmation
    const confirmEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.advance.title"))
        .setDescription(t(locale, "adventure.advance.confirm", { class: `${selectedConfig.emoji} ${selectedName}` }))
        .setColor(0xf39c12);

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("advance_confirm").setLabel("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("advance_cancel").setLabel("❌").setStyle(ButtonStyle.Danger)
    );

    await selectInteraction.update({ embeds: [confirmEmbed], components: [confirmRow] });

    const confirmInteraction = await message
        .awaitMessageComponent({
            filter: (i) => i.user.id === userId,
            time: 30_000,
        })
        .catch(() => null);

    if (confirmInteraction?.customId !== "advance_confirm") {
        const cancelEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.advance.cancelled"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    // Deduct materials and gold
    try {
        await CharacterService.deductMaterials(userId, ADVANCEMENT_REQUIREMENTS.materials);
        await CharacterService.deductGold(userId, ADVANCEMENT_REQUIREMENTS.goldCost);
    } catch {
        const errEmbed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.advance.insufficient"))
            .setColor(0xed4245);
        await confirmInteraction.update({ embeds: [errEmbed], components: [] });
        return;
    }

    // Advance class
    await CharacterService.advanceClass(userId, selectedClass);

    const successEmbed = new EmbedBuilder()
        .setTitle(t(locale, "adventure.advance.success_title"))
        .setDescription(t(locale, "adventure.advance.success", { class: `${selectedConfig.emoji} ${selectedName}` }))
        .setColor(0x57f287);

    await confirmInteraction.update({ embeds: [successEmbed], components: [] });
}

// --- Command definition ---

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
        )
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
        .addSubcommand((sub) =>
            sub
                .setName("advance")
                .setDescription("Advance to a specialized class")
                .setDescriptionLocalizations(descriptionLocales("cmd.adventure.advance.desc"))
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
                default: {
                    const embed = new EmbedBuilder()
                        .setDescription(t(locale, "common.unknown_subcommand"))
                        .setColor(0xed4245);
                    await Reply.embedEdit(interaction, embed);
                }
            }
        } catch (error) {
            if (error instanceof CharacterService.CharacterNotFoundError) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "adventure.require_character"))
                    .setColor(0xed4245);
                await Reply.embedEdit(interaction, embed);
                return;
            }
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            await Reply.embedEdit(interaction, embed);
        }
    },
};
