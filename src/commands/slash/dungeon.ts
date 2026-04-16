import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
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
import {
    getMonsterStats,
    getBossStats,
    RARITY_CONFIG,
    MATERIALS,
    SKILL1_MP_COST,
    SKILL2_MP_COST,
    ULTIMATE_MP_COST,
    ADVANCED_CLASS_CONFIG,
    ENCOUNTERS_PER_RUN,
    type ClassType,
    type Rarity,
    type AdvancedClassType,
} from "../../services/rpg/rpg.config";
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
import TeamDungeonService from "../../services/rpg/teamDungeon.service";
import type { TeamPartyState } from "../../services/rpg/teamDungeon.service";

export const RUN_TTL = 900;
export const COMBAT_TTL = 60;
export const MERCHANT_TTL = 60;
export const COMBAT_TIMEOUT_MS = 30_000;

// --- Embed builders (exported for button handlers) ---

export function buildCombatRow(
    locale: SupportedLocale,
    classType: ClassType,
    currentMp: number,
    advancedClass?: AdvancedClassType | null,
    ultimateUsed?: boolean
): ActionRowBuilder<ButtonBuilder>[] {
    const [skill1, skill2] = CombatService.getSkillLabels(classType);

    const attackBtn = new ButtonBuilder()
        .setCustomId(BUTTON_ID.DUNGEON_ATTACK)
        .setLabel(t(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(ButtonStyle.Danger);
    const skill1Btn = new ButtonBuilder()
        .setCustomId(BUTTON_ID.DUNGEON_SKILL1)
        .setLabel(t(locale, `rpg.skill.${skill1.key}`))
        .setEmoji(skill1.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentMp < SKILL1_MP_COST);
    const skill2Btn = new ButtonBuilder()
        .setCustomId(BUTTON_ID.DUNGEON_SKILL2)
        .setLabel(t(locale, `rpg.skill.${skill2.key}`))
        .setEmoji(skill2.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentMp < SKILL2_MP_COST);
    const defendBtn = new ButtonBuilder()
        .setCustomId(BUTTON_ID.DUNGEON_DEFEND)
        .setLabel(t(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary);
    const runBtn = new ButtonBuilder()
        .setCustomId(BUTTON_ID.DUNGEON_RUN)
        .setLabel(t(locale, "dungeon.btn.run"))
        .setEmoji("🏃")
        .setStyle(ButtonStyle.Secondary);

    if (advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[advancedClass];
        if (advConfig) {
            const ultimateLabel = t(locale, `rpg.skill.${advConfig.ultimate.key}`);
            const ultimateBtn = new ButtonBuilder()
                .setCustomId(BUTTON_ID.DUNGEON_ULTIMATE)
                .setLabel(ultimateLabel)
                .setEmoji(advConfig.ultimate.emoji)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!!ultimateUsed || currentMp < ULTIMATE_MP_COST);

            // 2 rows: Row 1 = Attack + Skill1 + Skill2 + Ultimate, Row 2 = Defend + Run
            const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                attackBtn,
                skill1Btn,
                skill2Btn,
                ultimateBtn
            );
            const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(defendBtn, runBtn);
            return [row1, row2];
        }
    }

    // Base class: single row with 5 buttons
    return [new ActionRowBuilder<ButtonBuilder>().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn, runBtn)];
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
    const {
        floor,
        checkpoint,
        goldReward,
        expReward,
        starReward,
        equipDrop,
        materialDrops,
        newFloor,
        checkpointReached,
        leveled,
        oldLevel,
        newLevel,
    } = opts;
    const descLines = [
        t(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        t(locale, "dungeon.reward.gold", { amount: String(goldReward) }),
        t(locale, "dungeon.reward.exp", { amount: String(expReward) }),
        ...(equipDrop
            ? [
                  t(locale, "dungeon.reward.equip_drop", {
                      rarity: RARITY_CONFIG[equipDrop.rarity as Rarity].emoji,
                      name: equipDrop.name,
                  }),
              ]
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

export function buildRpgCombatEmbed(locale: SupportedLocale, state: RpgCombatState, checkpoint: number): EmbedBuilder {
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
    rows: ActionRowBuilder<ButtonBuilder>[];
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
        const monsterStats = isBoss ? getBossStats(floor, char.level) : getMonsterStats(floor, char.level);

        const advancedClass = (char.advancedClass as AdvancedClassType) ?? null;
        const combatState = CombatService.initCombat({
            userId,
            classType,
            advancedClass,
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
        const currentMp = runState.mp ?? runState.maxMp ?? 55;

        return {
            embed: buildRpgCombatEmbed(locale, combatState, checkpoint),
            rows: buildCombatRow(locale, classType, currentMp, advancedClass),
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
            rows: [buildContinueLeaveRow(locale, runState.encountersLeft)],
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
            return { embed, rows: [], runEnded: true };
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
            rows: [buildContinueLeaveRow(locale, runState.encountersLeft)],
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
        rows: [buildMerchantRow(locale, merchantState, char.gold)],
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

// --- Team dungeon: build lobby embed ---

function buildLobbyEmbed(locale: SupportedLocale, party: TeamPartyState): EmbedBuilder {
    const lines: string[] = [];

    if (party.members.length === 1) {
        const leader = party.members[0];
        const cls = TeamDungeonService.getClassLabel(leader.classType, leader.advancedClass);
        lines.push(
            t(locale, "dungeon.team.leader", {
                user: leader.userId,
                class: `${cls.name} ${cls.emoji}`,
                level: String(leader.level),
            })
        );
        lines.push(`\n${t(locale, "dungeon.team.members", { current: "1" })}`);
    } else {
        lines.push(t(locale, "dungeon.team.members", { current: String(party.members.length) }));
        for (let i = 0; i < party.members.length; i++) {
            const m = party.members[i];
            const cls = TeamDungeonService.getClassLabel(m.classType, m.advancedClass);
            const suffix = m.userId === party.leaderId ? " (Leader)" : "";
            lines.push(
                t(locale, "dungeon.team.member", {
                    index: String(i + 1),
                    user: m.userId,
                    class: `${cls.name} ${cls.emoji}`,
                    level: String(m.level),
                }) + suffix
            );
        }
    }

    return new EmbedBuilder()
        .setTitle(`${t(locale, "dungeon.team.title")} — ${t(locale, "dungeon.team.lobby")}`)
        .setDescription(lines.join("\n"))
        .setColor(0x9b59b6);
}

function buildLobbyRow(locale: SupportedLocale, memberCount: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("team_dungeon_join")
            .setLabel(t(locale, "dungeon.team.join"))
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("team_dungeon_start")
            .setLabel(t(locale, "dungeon.team.start"))
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(memberCount < 2)
    );
}

// --- Team dungeon: build team combat embed ---

function buildTeamCombatEmbed(locale: SupportedLocale, party: TeamPartyState): EmbedBuilder {
    if (!party.monster) {
        return new EmbedBuilder().setDescription("No monster").setColor(0x95a5a6);
    }

    const monster = party.monster;
    const titlePrefix = monster.isBoss ? "👑" : monster.emoji;
    const monsterLabel = monster.isBoss
        ? t(locale, "dungeon.combat.boss_appear", { monster: monster.name, floor: String(party.floor) })
        : t(locale, "dungeon.encounter.monster", { monster: monster.name, floor: String(party.floor) });

    const partyLines = party.members
        .map((m) => {
            const cls = TeamDungeonService.getClassLabel(m.classType, m.advancedClass);
            const status = m.alive ? `HP: **${m.hp}**/${m.maxHp} | MP: **${m.mp}**/${m.maxMp}` : "**DOWNED**";
            return `${cls.emoji} <@${m.userId}> (${cls.name}) — ${status}`;
        })
        .join("\n");

    return new EmbedBuilder()
        .setTitle(`${titlePrefix} ${monsterLabel}`)
        .setDescription(
            [
                `${monster.emoji} ${monster.name} HP: **${monster.hp}**/${monster.maxHp}`,
                "",
                partyLines,
                "",
                t(locale, "dungeon.team.turn", { turn: String(party.turn), max: String(party.maxTurns) }),
            ].join("\n")
        )
        .setColor(monster.isBoss ? 0xe74c3c : 0xe67e22);
}

function buildTeamCombatRow(
    locale: SupportedLocale,
    partyId: string,
    hasAdvanced: boolean
): ActionRowBuilder<ButtonBuilder>[] {
    const attackBtn = new ButtonBuilder()
        .setCustomId(`td_attack:${partyId}`)
        .setLabel(t(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(ButtonStyle.Danger);
    const skill1Btn = new ButtonBuilder()
        .setCustomId(`td_skill1:${partyId}`)
        .setLabel("Skill 1")
        .setEmoji("✨")
        .setStyle(ButtonStyle.Primary);
    const skill2Btn = new ButtonBuilder()
        .setCustomId(`td_skill2:${partyId}`)
        .setLabel("Skill 2")
        .setEmoji("🔥")
        .setStyle(ButtonStyle.Primary);
    const defendBtn = new ButtonBuilder()
        .setCustomId(`td_defend:${partyId}`)
        .setLabel(t(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary);

    if (hasAdvanced) {
        const ultimateBtn = new ButtonBuilder()
            .setCustomId(`td_ultimate:${partyId}`)
            .setLabel("Ultimate")
            .setEmoji("💥")
            .setStyle(ButtonStyle.Danger);

        return [
            new ActionRowBuilder<ButtonBuilder>().addComponents(attackBtn, skill1Btn, skill2Btn, ultimateBtn),
            new ActionRowBuilder<ButtonBuilder>().addComponents(defendBtn),
        ];
    }

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn)];
}

// --- Team dungeon: reveal embed builder ---

type TeamTurnResultType = import("../../services/rpg/teamDungeon.service").TeamTurnResult;
type MemberActionType = TeamTurnResultType["memberActions"][number];

function formatMemberActionLine(ma: MemberActionType, party: TeamPartyState): string {
    const member = party.members.find((m) => m.userId === ma.userId);
    if (!member) return "";
    const cls = TeamDungeonService.getClassLabel(member.classType, member.advancedClass);
    const prefix = `${cls.emoji} <@${ma.userId}>`;
    if (ma.action === "defend") return `${prefix} defended (+${ma.healed} HP)`;
    if (ma.damage > 0) return `${prefix} dealt **${ma.damage}** damage`;
    if (ma.healed > 0) return `${prefix} healed **${ma.healed}** HP`;
    return `${prefix} used ${ma.action}`;
}

function formatPartyStatusLines(party: TeamPartyState): string[] {
    return party.members.map((m) => {
        const cls = TeamDungeonService.getClassLabel(m.classType, m.advancedClass);
        const status = m.alive ? `HP: **${m.hp}**/${m.maxHp} | MP: **${m.mp}**/${m.maxMp}` : "**DOWNED**";
        return `${cls.emoji} <@${m.userId}> — ${status}`;
    });
}

function buildRevealLines(locale: SupportedLocale, party: TeamPartyState, result: TeamTurnResultType): string[] {
    const lines = result.memberActions.map((ma) => formatMemberActionLine(ma, party)).filter(Boolean);

    if (result.revivedThisTurn) {
        lines.push(
            t(locale, "dungeon.team.revived", {
                user: result.revivedThisTurn.userId,
                healer: result.revivedThisTurn.healerId,
            })
        );
    }

    if (result.monsterDamagePerTarget > 0 && !result.monsterDefeated) {
        lines.push(
            t(locale, "dungeon.team.monster_attack", {
                monster: party.monster?.name ?? "Monster",
                damage: String(result.monsterDamagePerTarget),
            })
        );
    }

    lines.push(...result.downedThisTurn.map((id) => t(locale, "dungeon.team.downed", { user: id })));

    if (party.monster && !result.monsterDefeated) {
        lines.push(
            "",
            `${party.monster.emoji} ${party.monster.name} HP: **${party.monster.hp}**/${party.monster.maxHp}`
        );
    }

    lines.push("", ...formatPartyStatusLines(party));
    return lines;
}

function revealColor(result: import("../../services/rpg/teamDungeon.service").TeamTurnResult): number {
    if (result.monsterDefeated) return 0x2ecc71;
    if (result.teamWiped) return 0xed4245;
    return 0x3498db;
}

// --- Team dungeon: action collector for one turn ---

async function collectTeamActions(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    partyId: string,
    party: TeamPartyState
): Promise<Set<string>> {
    const combatEmbed = buildTeamCombatEmbed(locale, party);
    const hasAdvanced = party.members.some((m) => m.advancedClass !== null);
    const combatRows = buildTeamCombatRow(locale, partyId, hasAdvanced);

    const msg = await interaction.editReply({ embeds: [combatEmbed], components: combatRows });

    const submitted = new Set<string>();
    const aliveIds = new Set(party.members.filter((m) => m.alive).map((m) => m.userId));

    try {
        const collector = msg.createMessageComponentCollector({ time: 30_000 });

        await new Promise<void>((resolve) => {
            collector.on("collect", async (btnInteraction) => {
                const userId = btnInteraction.user.id;

                if (!aliveIds.has(userId) || submitted.has(userId)) {
                    await btnInteraction.reply({
                        content: t(locale, submitted.has(userId) ? "dungeon.team.already_in" : "dungeon.team.waiting"),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const actionPart = btnInteraction.customId.split(":")[0].replace("td_", "");
                await TeamDungeonService.submitAction(partyId, userId, actionPart);
                submitted.add(userId);

                await btnInteraction.reply({
                    content: t(locale, "dungeon.team.joined"),
                    flags: MessageFlags.Ephemeral,
                });

                const freshParty = await TeamDungeonService.getParty(partyId);
                if (freshParty && (await TeamDungeonService.allAliveSubmitted(freshParty))) {
                    collector.stop("all_submitted");
                }
            });

            collector.on("end", () => resolve());
        });
    } catch {
        // Collector error — auto-defend for missing
    }

    return submitted;
}

// --- Team dungeon: auto-defend missing members ---

async function autoDefendMissing(
    partyId: string,
    members: TeamPartyState["members"],
    submitted: Set<string>
): Promise<void> {
    for (const m of members) {
        if (m.alive && !submitted.has(m.userId)) {
            await TeamDungeonService.submitAction(partyId, m.userId, "defend");
        }
    }
}

// --- Team dungeon: single combat turn ---

async function resolveTeamTurnAndShow(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    partyId: string
): Promise<TeamTurnResultType | null> {
    const resolveParty = await TeamDungeonService.getParty(partyId);
    if (!resolveParty) return null;

    const result = await TeamDungeonService.resolveTurn(resolveParty);
    await TeamDungeonService.saveParty(resolveParty);

    const revealEmbed = new EmbedBuilder()
        .setTitle(`${t(locale, "dungeon.team.title")} — Turn ${resolveParty.turn - 1} Result`)
        .setDescription(buildRevealLines(locale, resolveParty, result).join("\n"))
        .setColor(revealColor(result));
    await interaction.editReply({ embeds: [revealEmbed], components: [] });

    return result;
}

// --- Team dungeon: combat turn loop ---

async function runTeamCombatLoop(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    partyId: string
): Promise<{ monsterDefeated: boolean; teamWiped: boolean }> {
    for (let turnIdx = 0; turnIdx < 7; turnIdx++) {
        const party = await TeamDungeonService.getParty(partyId);
        if (!party?.monster) return { monsterDefeated: false, teamWiped: true };

        const submitted = await collectTeamActions(interaction, locale, partyId, party);
        await autoDefendMissing(partyId, party.members, submitted);

        const result = await resolveTeamTurnAndShow(interaction, locale, partyId);
        if (!result) return { monsterDefeated: false, teamWiped: true };

        if (result.monsterDefeated) return { monsterDefeated: true, teamWiped: false };
        if (result.teamWiped) return { monsterDefeated: false, teamWiped: true };

        const fresh = await TeamDungeonService.getParty(partyId);
        if (fresh && fresh.turn > fresh.maxTurns) return { monsterDefeated: false, teamWiped: false };

        await new Promise((r) => setTimeout(r, 2000));
    }

    return { monsterDefeated: false, teamWiped: false };
}

// --- Team dungeon: join error message resolver ---

function resolveJoinError(locale: SupportedLocale, reason?: string): string {
    const errorMap: Record<string, string> = {
        full: "dungeon.team.full",
        already_in: "dungeon.team.already_in",
        no_character: "dungeon.team.no_character",
        cooldown: "dungeon.team.cooldown",
        in_party: "dungeon.team.in_party",
    };
    const key = reason && errorMap[reason] ? errorMap[reason] : "common.error";
    return t(locale, key);
}

// --- Team dungeon: lobby phase ---

async function runTeamLobby(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    party: TeamPartyState
): Promise<boolean> {
    const msg = await interaction.editReply({
        embeds: [buildLobbyEmbed(locale, party)],
        components: [buildLobbyRow(locale, party.members.length)],
    });
    party.messageId = msg.id;
    await TeamDungeonService.saveParty(party);

    let started = false;

    try {
        const collector = msg.createMessageComponentCollector({ time: 120_000 });

        await new Promise<void>((resolve) => {
            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.customId === "team_dungeon_join") {
                    const joinResult = await TeamDungeonService.joinParty(party.partyId, btnInteraction.user.id);

                    if (!joinResult.success) {
                        await btnInteraction.reply({
                            content: resolveJoinError(locale, joinResult.reason),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    const updatedParty = await TeamDungeonService.getParty(party.partyId);
                    if (updatedParty) {
                        await btnInteraction.update({
                            embeds: [buildLobbyEmbed(locale, updatedParty)],
                            components: [buildLobbyRow(locale, updatedParty.members.length)],
                        });
                    }
                    return;
                }

                if (btnInteraction.customId !== "team_dungeon_start") return;

                const currentParty = await TeamDungeonService.getParty(party.partyId);
                if (btnInteraction.user.id !== party.leaderId || !currentParty || currentParty.members.length < 2) {
                    await btnInteraction.reply({
                        content: t(locale, "dungeon.team.need_more"),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const startedParty = await TeamDungeonService.startRun(party.partyId);
                if (!startedParty) {
                    await btnInteraction.reply({ content: t(locale, "common.error"), flags: MessageFlags.Ephemeral });
                    return;
                }

                started = true;
                const startEmbed = new EmbedBuilder()
                    .setTitle(t(locale, "dungeon.team.title"))
                    .setDescription(t(locale, "dungeon.team.started", { size: String(startedParty.members.length) }))
                    .setColor(0x2ecc71);
                await btnInteraction.update({ embeds: [startEmbed], components: [] });
                collector.stop("started");
            });

            collector.on("end", () => resolve());
        });
    } catch {
        // Collector error
    }

    return started;
}

// --- Team dungeon: encounter handlers ---

async function handleTeamMonsterEncounter(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    party: TeamPartyState,
    guildId: string
): Promise<"defeated" | "wiped" | "fled"> {
    TeamDungeonService.initTeamMonster(party);
    await TeamDungeonService.saveParty(party);

    const { monsterDefeated, teamWiped } = await runTeamCombatLoop(interaction, locale, party.partyId);

    if (monsterDefeated) {
        const afterCombat = await TeamDungeonService.getParty(party.partyId);
        if (!afterCombat) return "wiped";

        const isBoss = afterCombat.monster?.isBoss ?? false;
        const rewards = await TeamDungeonService.distributeRewards(afterCombat, isBoss ? "boss" : "monster");
        const { checkpointReached } = await TeamDungeonService.advanceFloor(afterCombat);
        afterCombat.monster = null;
        await TeamDungeonService.saveParty(afterCombat);

        const rewardLines = [
            t(locale, "dungeon.team.reward_split", {
                gold: String(rewards.goldPerMember),
                exp: String(rewards.expPerMember),
            }),
            ...rewards.memberRewards.flatMap((mr) => {
                const lines: string[] = [];
                if (mr.equipDrop)
                    lines.push(
                        `<@${mr.userId}>: ${RARITY_CONFIG[mr.equipDrop.rarity as Rarity].emoji} **${mr.equipDrop.name}**`
                    );
                if (mr.leveled)
                    lines.push(t(locale, "dungeon.levelup", { old: String(mr.oldLevel), new: String(mr.newLevel) }));
                if (mr.starReward) lines.push(`<@${mr.userId}>: ${t(locale, "star_drop.found")}`);
                return lines;
            }),
            ...(checkpointReached
                ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(afterCombat.floor) })]
                : []),
        ];

        const monsterLabel = isBoss ? "Boss" : "Monster";
        const rewardEmbed = new EmbedBuilder()
            .setTitle(
                `${t(locale, "dungeon.team.title")} — ${t(locale, "dungeon.combat.win", { monster: monsterLabel })}`
            )
            .setDescription(rewardLines.join("\n"))
            .setColor(0x2ecc71);

        if (afterCombat.encountersLeft > 0) {
            rewardEmbed.setFooter({ text: buildContinueLeaveText(locale, afterCombat.encountersLeft) });
        }
        await interaction.editReply({ embeds: [rewardEmbed], components: [] });

        for (const m of afterCombat.members) {
            QuestService.trackProgress(m.userId, guildId, "dungeon").catch(() => {});
        }
        return "defeated";
    }

    if (teamWiped) {
        const wipeEmbed = new EmbedBuilder()
            .setTitle(t(locale, "dungeon.team.title"))
            .setDescription(t(locale, "dungeon.team.wipe"))
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [wipeEmbed], components: [] });
        return "wiped";
    }

    const fleeEmbed = new EmbedBuilder()
        .setTitle(t(locale, "dungeon.team.title"))
        .setDescription(t(locale, "dungeon.combat.turns_up"))
        .setColor(0x95a5a6);
    await interaction.editReply({ embeds: [fleeEmbed], components: [] });
    return "fled";
}

function buildTeamTreasureLines(
    locale: SupportedLocale,
    rewards: import("../../services/rpg/teamDungeon.service").TeamTreasureResult,
    floor: number,
    checkpointReached: boolean,
    newFloor: number
): string[] {
    return [
        t(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        t(locale, "dungeon.team.reward_split", {
            gold: String(rewards.goldPerMember),
            exp: String(rewards.expPerMember),
        }),
        ...rewards.memberRewards.flatMap((mr) => {
            const lines: string[] = [];
            if (mr.equipDrop)
                lines.push(
                    `<@${mr.userId}>: ${RARITY_CONFIG[mr.equipDrop.rarity as Rarity].emoji} **${mr.equipDrop.name}**`
                );
            if (mr.starReward) lines.push(`<@${mr.userId}>: ${t(locale, "star_drop.found")}`);
            return lines;
        }),
        ...(checkpointReached ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) })] : []),
    ];
}

async function handleTeamTreasureEncounter(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    party: TeamPartyState
): Promise<void> {
    const floor = party.floor;
    const rewards = await TeamDungeonService.distributeTreasureRewards(party);
    const { checkpointReached } = await TeamDungeonService.advanceFloor(party);
    await TeamDungeonService.saveParty(party);

    const embed = new EmbedBuilder()
        .setTitle(`🎁 ${t(locale, "dungeon.team.title")}`)
        .setDescription(buildTeamTreasureLines(locale, rewards, floor, checkpointReached, party.floor).join("\n"))
        .setColor(0xf1c40f);
    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleTeamTrapEncounter(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    party: TeamPartyState
): Promise<boolean> {
    const trapResult = await TeamDungeonService.resolveTeamTrap(party);
    await TeamDungeonService.saveParty(party);

    const title = `🪤 ${t(locale, "dungeon.team.title")}`;

    if (trapResult.collapsed) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(
                `${t(locale, "dungeon.encounter.trap", { floor: String(party.floor) })}\n${t(locale, "dungeon.team.wipe")}`
            )
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [embed], components: [] });
        return true;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(
            `${t(locale, "dungeon.encounter.trap", { floor: String(party.floor) })}\n${t(locale, "dungeon.trap.damage", { hp: String(trapResult.hpLost), coin: String(trapResult.goldLost) })}`
        )
        .setColor(0xe67e22);
    await interaction.editReply({ embeds: [embed], components: [] });
    return false;
}

async function handleTeamNpcEncounter(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    partyId: string
): Promise<void> {
    const npcParty = await TeamDungeonService.getParty(partyId);
    if (!npcParty) return;

    const rewards = await TeamDungeonService.distributeTreasureRewards(npcParty);
    await TeamDungeonService.advanceFloor(npcParty);
    await TeamDungeonService.saveParty(npcParty);

    const embed = new EmbedBuilder()
        .setTitle(`🏪 ${t(locale, "dungeon.team.title")}`)
        .setDescription(
            `${t(locale, "dungeon.encounter.npc")}\n${t(locale, "dungeon.team.reward_split", { gold: String(rewards.goldPerMember), exp: String(rewards.expPerMember) })}`
        )
        .setColor(0x9b59b6);
    await interaction.editReply({ embeds: [embed], components: [] });
}

// --- Team dungeon: encounter loop ---

async function processTeamEncounter(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    party: TeamPartyState,
    guildId: string
): Promise<boolean> {
    const encounterType = TeamDungeonService.rollEncounterForTeam(party.floor);

    if (encounterType === "monster") {
        const outcome = await handleTeamMonsterEncounter(interaction, locale, party, guildId);
        return outcome === "wiped";
    }
    if (encounterType === "treasure") {
        await handleTeamTreasureEncounter(interaction, locale, party);
        return false;
    }
    if (encounterType === "trap") {
        return handleTeamTrapEncounter(interaction, locale, party);
    }
    await handleTeamNpcEncounter(interaction, locale, party.partyId);
    return false;
}

async function runTeamEncounterLoop(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    partyId: string,
    guildId: string
): Promise<void> {
    for (let enc = 0; enc < ENCOUNTERS_PER_RUN; enc++) {
        const currentParty = await TeamDungeonService.getParty(partyId);
        if (!currentParty || currentParty.members.every((m) => !m.alive)) break;

        currentParty.encountersLeft = ENCOUNTERS_PER_RUN - enc - 1;
        const shouldBreak = await processTeamEncounter(interaction, locale, currentParty, guildId);
        if (shouldBreak || currentParty.encountersLeft <= 0) break;

        await new Promise((r) => setTimeout(r, 2500));
    }
}

// --- Team dungeon: main handler ---

async function handleTeam(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    await interaction.deferReply();
    const userId = interaction.user.id;

    const char = await CharacterService.getCharacter(userId);
    if (!char) {
        const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.require_character")).setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
    }

    const cdKey = `dungeon_cd:${userId}`;
    const remaining = await redis.ttlKey(cdKey);
    if (remaining > 0) {
        const embed = new EmbedBuilder()
            .setDescription(`${t(locale, "dungeon.team.cooldown")} (${formatCooldown(remaining)})`)
            .setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
    }

    if (await TeamDungeonService.isInParty(userId)) {
        const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.team.in_party")).setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
    }

    const party = await TeamDungeonService.createParty(userId, interaction.channelId, locale);
    const started = await runTeamLobby(interaction, locale, party);

    if (!started) {
        const timeoutEmbed = new EmbedBuilder()
            .setDescription(t(locale, "dungeon.team.lobby_timeout"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        await TeamDungeonService.cleanupParty(party);
        return;
    }

    await new Promise((r) => setTimeout(r, 1500));

    await runTeamEncounterLoop(interaction, locale, party.partyId, interaction.guildId ?? "");

    const finalParty = await TeamDungeonService.getParty(party.partyId);
    if (finalParty) {
        const resultEmbed = new EmbedBuilder()
            .setTitle(t(locale, "dungeon.team.title"))
            .setDescription(t(locale, "dungeon.team.result", { floor: String(finalParty.floor) }))
            .setColor(0x2ecc71);
        await interaction.editReply({ embeds: [resultEmbed], components: [] });

        try {
            await Promise.allSettled(
                finalParty.members.map(async (member) => {
                    const memberTierConfig = await PremiumService.getConfig(member.userId);
                    await redis.setJson(`dungeon_cd:${member.userId}`, 1, memberTierConfig.dungeonCooldownMs / 1000);
                })
            );
        } finally {
            await TeamDungeonService.cleanupParty(finalParty);
        }
    }
}

// --- Solo dungeon handler ---

async function handleSolo(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const userId = interaction.user.id;

    // Character gate
    const char = await CharacterService.getCharacter(userId);
    if (!char) {
        const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.require_character")).setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
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
            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                buildPremiumButton(locale)
            );
            return void Reply.embedEditComponents(interaction, embed, [row]);
        }
        return void Reply.embedEdit(interaction, embed);
    }

    // Check existing run
    const runKey = `dungeon_run:${userId}`;
    const existingRun = await redis.getJson(runKey);
    if (existingRun) {
        const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.run.in_progress")).setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
    }

    // Check existing combat state
    const combatKey = `dungeon_combat:${userId}`;
    const existingCombat = await redis.getJson(combatKey);
    if (existingCombat) {
        const embed = new EmbedBuilder().setDescription(t(locale, "dungeon.in_combat")).setColor(0xed4245);
        return void Reply.embedEdit(interaction, embed);
    }

    // Start run
    const runState = await DungeonService.startRun(userId, locale);
    runState.encountersLeft -= 1;

    // Process first encounter
    const { embed, rows, runEnded } = await processEncounter(runState);

    // Save run state
    const reply = await interaction.editReply({ embeds: [embed], components: runEnded ? [] : rows });
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
}

// --- Main command ---

export default {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("solo")
                .setDescription("Explore the dungeon solo")
                .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("team")
                .setDescription("Start a team dungeon run (2-4 players)")
                .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.team.desc"))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const subcommand = interaction.options.getSubcommand(true);

        try {
            if (subcommand === "team") {
                await handleTeam(interaction, locale);
            } else {
                await interaction.deferReply();
                await handleSolo(interaction, locale);
            }
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    },
};
