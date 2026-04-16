import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import DungeonService from "../../services/economy/dungeon.service";
import type { DungeonRunState } from "../../services/economy/dungeon.service";
import MerchantService from "../../services/economy/merchant.service";
import type { MerchantState } from "../../services/economy/merchant.service";
import CharacterService from "../../services/rpg/character.service";
import CombatService from "../../services/rpg/combat.service";
import type { RpgCombatState } from "../../services/rpg/combat.service";
import { getMonsterStats, getBossStats, RARITY_CONFIG, MATERIALS, SKILL1_MP_COST, SKILL2_MP_COST, type ClassType, type Rarity } from "../../services/rpg/rpg.config";
import PremiumService from "../../services/premium/premium.service";
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
import { formatCooldown } from "../../util/date/format";
import Reply from "../../util/decorator/reply";
import { BUTTON_ID } from "../../util/config/button";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import QuestService from "../../services/quest/quest.service";

export const RUN_TTL = 900;
export const COMBAT_TTL = 60;
export const MERCHANT_TTL = 60;
export const COMBAT_TIMEOUT_MS = 30_000;

// --- Embed builders (exported for button handlers) ---

export function buildCombatRow(locale: SupportedLocale, classType: ClassType, currentMp: number): ActionRowBuilder<ButtonBuilder> {
    const [skill1, skill2] = CombatService.getSkillLabels(classType);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_ATTACK)
            .setLabel(t(locale, "dungeon.btn.attack"))
            .setEmoji("⚔️")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL1)
            .setLabel(t(locale, `rpg.skill.${skill1.key}`))
            .setEmoji(skill1.emoji)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentMp < SKILL1_MP_COST),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_SKILL2)
            .setLabel(t(locale, `rpg.skill.${skill2.key}`))
            .setEmoji(skill2.emoji)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentMp < SKILL2_MP_COST),
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

export function buildContinueLeaveText(locale: SupportedLocale, encountersLeft: number): string {
    return t(locale, "dungeon.run.continue", { left: String(encountersLeft) });
}

export function buildContinueLeaveRow(
    locale: SupportedLocale,
    encountersLeft: number
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_CONTINUE)
            .setLabel(t(locale, "dungeon.btn.continue"))
            .setEmoji("⬇️")
            .setStyle(ButtonStyle.Success)
            .setDisabled(encountersLeft <= 0),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_LEAVE)
            .setLabel(t(locale, "dungeon.btn.leave"))
            .setEmoji("🚪")
            .setStyle(ButtonStyle.Secondary)
    );
}

export function buildMerchantRow(
    locale: SupportedLocale,
    merchantState: MerchantState,
    userGold: number
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_HEAL)
            .setLabel(t(locale, "dungeon.btn.heal"))
            .setEmoji("🧪")
            .setStyle(ButtonStyle.Success)
            .setDisabled(merchantState.currentHp >= merchantState.maxHp || userGold < merchantState.healCost),
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

export function buildMerchantEmbed(
    locale: SupportedLocale,
    merchantState: MerchantState,
    userGold: number
): EmbedBuilder {
    const buffLabel = t(locale, `dungeon.buff.${merchantState.buffType}`);
    return new EmbedBuilder()
        .setTitle(`🏪 ${t(locale, "dungeon.title")}`)
        .setDescription(
            [
                t(locale, "dungeon.merchant.title", { floor: String(merchantState.floor) }),
                t(locale, "dungeon.merchant.greeting"),
                "",
                `🧪 ${t(locale, "dungeon.merchant.heal_option", { amount: String(merchantState.healAmount), cost: String(merchantState.healCost) })}`,
                `✨ ${t(locale, "dungeon.merchant.buff_option", { buffType: buffLabel, cost: String(merchantState.buffCost) })}`,
                `🎁 ${t(locale, "dungeon.merchant.equip_option", { cost: String(merchantState.equipCost) })}`,
                "",
                `HP: **${merchantState.currentHp}**/${merchantState.maxHp} | Gold: **${userGold}** 🪙`,
                t(locale, "dungeon.floor", {
                    floor: String(merchantState.floor),
                    checkpoint: String(merchantState.checkpoint),
                }),
            ].join("\n")
        )
        .setColor(0x9b59b6);
}

export interface TreasureEmbedOptions {
    floor: number;
    checkpoint: number;
    goldReward: number;
    expReward: number;
    starReward: boolean;
    equipDrop: { name: string; rarity: string; slot: string } | null;
    materialDrops: { key: string; qty: number }[];
    newFloor: number;
    checkpointReached: boolean;
    leveled: boolean;
    oldLevel: number;
    newLevel: number;
}

export function buildTreasureEmbed(locale: SupportedLocale, opts: TreasureEmbedOptions): EmbedBuilder {
    const { floor, checkpoint, goldReward, expReward, starReward, equipDrop, materialDrops, newFloor, checkpointReached, leveled, oldLevel, newLevel } = opts;
    const descLines = [
        t(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        t(locale, "dungeon.reward.gold", { amount: String(goldReward) }),
        t(locale, "dungeon.reward.exp", { amount: String(expReward) }),
        ...(equipDrop
            ? [t(locale, "dungeon.reward.equip_drop", {
                rarity: RARITY_CONFIG[equipDrop.rarity as Rarity].emoji,
                name: equipDrop.name,
            })]
            : []),
        ...(materialDrops.length > 0 ? formatMaterialDrops(locale, materialDrops) : []),
        "",
        t(locale, "dungeon.floor", { floor: String(newFloor), checkpoint: String(checkpoint) }),
        ...(checkpointReached ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) })] : []),
        ...(starReward ? ["\n⭐ " + t(locale, "star_drop.found")] : []),
        ...(leveled ? [t(locale, "dungeon.levelup", { old: String(oldLevel), new: String(newLevel) })] : []),
    ];
    return new EmbedBuilder()
        .setTitle(`🎁 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xf1c40f);
}

export interface TrapEmbedOptions {
    floor: number;
    checkpoint: number;
    hpLost: number;
    goldLost: number;
    collapsed: boolean;
    currentHp: number;
    maxHp: number;
}

export function buildTrapEmbed(locale: SupportedLocale, opts: TrapEmbedOptions): EmbedBuilder {
    const { floor, checkpoint, hpLost, goldLost, collapsed, currentHp, maxHp } = opts;
    const descLines = [
        t(locale, "dungeon.encounter.trap", { floor: String(floor) }),
        t(locale, "dungeon.trap.damage", { hp: String(hpLost), coin: String(goldLost) }),
        ...(collapsed ? ["", t(locale, "dungeon.collapse", { checkpoint: String(checkpoint) })] : []),
        "",
        `HP: **${currentHp}**/${maxHp}`,
        t(locale, "dungeon.floor", { floor: String(collapsed ? checkpoint : floor), checkpoint: String(checkpoint) }),
    ];
    return new EmbedBuilder()
        .setTitle(`🪤 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(collapsed ? 0xed4245 : 0xe67e22);
}

export function formatMaterialDrops(locale: SupportedLocale, materialDrops: { key: string; qty: number }[]): string[] {
    return materialDrops.map((drop) => {
        const mat = MATERIALS.find((m) => m.key === drop.key);
        const emoji = mat?.emoji ?? "⬜";
        const name = t(locale, `rpg.material.${drop.key}`);
        return `${emoji} ${name} ×${drop.qty}`;
    });
}

export function buildRpgCombatEmbed(
    locale: SupportedLocale,
    state: RpgCombatState,
    checkpoint: number
): EmbedBuilder {
    const titlePrefix = state.isBoss ? "👑" : state.monsterEmoji;
    const monsterLabel = state.isBoss
        ? t(locale, "dungeon.combat.boss_appear", { monster: state.monsterName, floor: String(checkpoint) })
        : t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(checkpoint) });

    return new EmbedBuilder()
        .setTitle(`${titlePrefix} ${monsterLabel}`)
        .setDescription(
            [
                t(locale, "dungeon.combat.hp", {
                    userHp: String(state.user.hp),
                    maxHp: String(state.user.maxHp),
                    monster: state.monsterName,
                    monsterHp: String(state.monster.hp),
                    maxMonsterHp: String(state.monster.maxHp),
                }),
                t(locale, "dungeon.combat.mp", { mp: String(state.user.mp), maxMp: String(state.user.maxMp) }),
                "",
                t(locale, "dungeon.floor", { floor: String(checkpoint), checkpoint: String(checkpoint) }),
            ].join("\n")
        )
        .setColor(state.isBoss ? 0xe74c3c : 0xe67e22);
}

// --- Encounter processing for a run ---

export async function processEncounter(runState: DungeonRunState): Promise<{
    embed: EmbedBuilder;
    row: ActionRowBuilder<ButtonBuilder>;
    runEnded: boolean;
}> {
    const locale = runState.locale as SupportedLocale;
    const { userId, floor, checkpoint, classType } = runState;
    const encounterType = DungeonService.rollEncounterForRun(runState);

    // Tick buff (decrement encounters left)
    DungeonService.tickBuff(runState);

    if (encounterType === "monster") {
        const isBoss = DungeonService.isBossFloor(floor);
        const monster = DungeonService.rollMonster(floor);

        // Load character stats for combat
        const char = await CharacterService.requireCharacter(userId);
        const stats = await CharacterService.getEffectiveStats(userId);
        const monsterStats = isBoss
            ? getBossStats(floor, char.level)
            : getMonsterStats(floor, char.level);

        const combatState = CombatService.initCombat({
            userId,
            classType,
            userStats: stats,
            userHp: runState.hp,
            maxHp: runState.maxHp,
            userMp: runState.mp,
            maxMp: runState.maxMp,
            monster: { name: monster.name, emoji: monster.emoji, stats: monsterStats },
            isBoss,
        });

        const combatKey = `dungeon_combat:${userId}`;
        await redis.setJson(combatKey, combatState, COMBAT_TTL);

        return {
            embed: buildRpgCombatEmbed(locale, combatState, checkpoint),
            row: buildCombatRow(locale, classType, runState.mp ?? runState.maxMp ?? 55),
            runEnded: false,
        };
    }

    if (encounterType === "treasure") {
        const result = await DungeonService.resolveTreasure(userId, floor, classType);

        runState.floor = result.newFloor;
        runState.checkpoint = result.checkpoint;
        runState.accumulatedGold += result.goldReward;
        runState.accumulatedExp += result.expReward;
        if (result.equipDrop) runState.drops.push(result.equipDrop.id);

        const embed = buildTreasureEmbed(locale, {
            floor,
            checkpoint: result.checkpoint,
            goldReward: result.goldReward,
            expReward: result.expReward,
            starReward: result.starReward,
            equipDrop: result.equipDrop,
            materialDrops: result.materialDrops,
            newFloor: result.newFloor,
            checkpointReached: result.checkpointReached,
            leveled: result.leveled,
            oldLevel: result.oldLevel,
            newLevel: result.newLevel,
        });
        embed.setFooter({ text: buildContinueLeaveText(locale, runState.encountersLeft) });

        return {
            embed,
            row: buildContinueLeaveRow(locale, runState.encountersLeft),
            runEnded: false,
        };
    }

    if (encounterType === "trap") {
        const trapResult = await DungeonService.resolveTrap(userId, floor, runState.hp);

        runState.hp = Math.max(0, runState.hp - trapResult.hpLost);

        if (trapResult.collapsed && trapResult.collapseResult) {
            runState.floor = trapResult.collapseResult.checkpoint;

            const embed = buildTrapEmbed(locale, {
                floor,
                checkpoint: trapResult.collapseResult.checkpoint,
                hpLost: trapResult.hpLost,
                goldLost: trapResult.goldLost + trapResult.collapseResult.goldLost,
                collapsed: true,
                currentHp: 0,
                maxHp: runState.maxHp,
            });
            return { embed, row: new ActionRowBuilder<ButtonBuilder>(), runEnded: true };
        }

        const embed = buildTrapEmbed(locale, {
            floor,
            checkpoint,
            hpLost: trapResult.hpLost,
            goldLost: trapResult.goldLost,
            collapsed: false,
            currentHp: runState.hp,
            maxHp: runState.maxHp,
        });
        embed.setFooter({ text: buildContinueLeaveText(locale, runState.encountersLeft) });
        return {
            embed,
            row: buildContinueLeaveRow(locale, runState.encountersLeft),
            runEnded: false,
        };
    }

    // NPC Merchant encounter
    const char = await CharacterService.requireCharacter(userId);
    const merchantState = MerchantService.buildMerchantState(
        userId,
        runState.locale,
        floor,
        checkpoint,
        runState.hp,
        runState.maxHp
    );
    const merchantKey = `dungeon_merchant:${userId}`;
    await redis.setJson(merchantKey, merchantState, MERCHANT_TTL);

    return {
        embed: buildMerchantEmbed(locale, merchantState, char.gold),
        row: buildMerchantRow(locale, merchantState, char.gold),
        runEnded: false,
    };
}

/**
 * Schedule combat/merchant auto-timeouts that update the Discord message.
 * Must be called after processEncounter when the encounter type is monster or npc.
 * Accepts any interaction with editReply (ChatInputCommandInteraction or ButtonInteraction).
 */
export function scheduleCombatTimeout(
    interaction: { editReply: ChatInputCommandInteraction["editReply"] },
    userId: string,
    locale: SupportedLocale,
    encounterId: string
): void {
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;

    setTimeout(async () => {
        try {
            const active = await redis.getJson<RpgCombatState>(combatKey);
            if (!active || active.userId !== userId) return;
            await redis.deleteKey(combatKey);

            const runState = await redis.getJson<DungeonRunState>(runKey);
            const timeoutEmbed = new EmbedBuilder()
                .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
                .setDescription(t(locale, "dungeon.combat.timeout"))
                .setColor(0x95a5a6);

            if (runState) {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
            } else {
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        } catch {
            // Interaction may have expired — silently ignore
        }
    }, COMBAT_TIMEOUT_MS);
}

export function scheduleMerchantTimeout(
    interaction: { editReply: ChatInputCommandInteraction["editReply"] },
    userId: string,
    locale: SupportedLocale,
    encounterId: string
): void {
    const merchantKey = `dungeon_merchant:${userId}`;
    const runKey = `dungeon_run:${userId}`;

    setTimeout(async () => {
        try {
            const active = await redis.getJson<MerchantState>(merchantKey);
            if (!active || active.encounterId !== encounterId) return;
            await redis.deleteKey(merchantKey);

            const runState = await redis.getJson<DungeonRunState>(runKey);
            const timeoutEmbed = new EmbedBuilder()
                .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
                .setDescription(t(locale, "dungeon.merchant.timeout"))
                .setColor(0x95a5a6);

            if (runState) {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
            } else {
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        } catch {
            // Interaction may have expired — silently ignore
        }
    }, MERCHANT_TTL * 1000);
}

// --- Main command ---

export default {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const userId = interaction.user.id;

        try {
            // Character gate
            const char = await CharacterService.getCharacter(userId);
            if (!char) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.require_character"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            const tierConfig = await PremiumService.getConfig(userId);

            // Check cooldown (global, not per-guild)
            const cdKey = `dungeon_cd:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                let description = t(locale, "dungeon.cooldown", { time: formatCooldown(remaining) });
                const isFreeTier = tierConfig.dungeonCooldownMs === TIER_CONFIG.free.dungeonCooldownMs;
                if (isFreeTier) {
                    const reduced = formatCooldown(TIER_CONFIG.star.dungeonCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }

            // Check existing run
            const runKey = `dungeon_run:${userId}`;
            const existingRun = await redis.getJson(runKey);
            if (existingRun) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.run.in_progress"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check existing combat state
            const combatKey = `dungeon_combat:${userId}`;
            const existingCombat = await redis.getJson(combatKey);
            if (existingCombat) {
                const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.in_combat")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Start run
            const runState = await DungeonService.startRun(userId, locale);
            runState.encountersLeft -= 1;

            // Process first encounter
            const { embed, row, runEnded } = await processEncounter(runState);

            // Save run state
            const reply = await interaction.editReply({ embeds: [embed], components: runEnded ? [] : [row] });
            runState.messageId = reply.id;

            if (runEnded) {
                await redis.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
                await QuestService.trackProgress(userId, interaction.guildId ?? "", "dungeon").catch(() => {});
            } else {
                await redis.setJson(runKey, runState, RUN_TTL);
                // Schedule timeouts for combat/merchant encounters
                const combatState = await redis.getJson<RpgCombatState>(`dungeon_combat:${userId}`);
                const merchantState = await redis.getJson<MerchantState>(`dungeon_merchant:${userId}`);
                if (combatState) {
                    scheduleCombatTimeout(interaction, userId, locale, combatState.userId);
                } else if (merchantState) {
                    scheduleMerchantTimeout(interaction, userId, locale, merchantState.encounterId);
                }
            }
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
