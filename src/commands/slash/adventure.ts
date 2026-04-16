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
import { CLASS_CONFIG, CLASS_TYPES, RARITY_CONFIG, type ClassType, type EquipmentSlot } from "../../services/rpg/rpg.config";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

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

// --- /adventure equip ---

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
        await Reply.embedEdit(interaction, embed);
        return;
    }

    try {
        const oldEquipped = (await EquipmentService.getEquippedItems(interaction.user.id))
            .find((i) => i.slot === item.slot);

        await EquipmentService.equipItem(
            interaction.user.id,
            item._id.toString(),
            char.class,
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
    await CharacterService.requireCharacter(interaction.user.id);
    const inventory = await EquipmentService.getInventory(interaction.user.id);

    if (inventory.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.inventory.empty"))
            .setColor(0x95a5a6);
        await Reply.embedEdit(interaction, embed);
        return;
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

    const equipped = (await EquipmentService.getEquippedItems(interaction.user.id))
        .find((i) => i.slot === slot);

    if (!equipped) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "adventure.unequip.empty"))
            .setColor(0xed4245);
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
