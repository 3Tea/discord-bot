import { randomUUID } from "node:crypto";
import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import redis from "../connector/redis";
import CharacterService from "../services/rpg/character.service";
import DungeonService from "../services/economy/dungeon.service";
import type { CombatResolveResult, DungeonRunState } from "../services/economy/dungeon.service";
import CombatService from "../services/rpg/combat.service";
import type { RpgCombatState, CombatActionResult } from "../services/rpg/combat.service";
import { RARITY_CONFIG, CRATES, type Rarity } from "../services/rpg/rpg.config";
import PremiumService from "../services/premium/premium.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import {
    buildContinueLeaveRow,
    buildCombatRow,
    buildRpgCombatEmbed,
    formatMaterialDrops,
    scheduleCombatTimeout,
    cancelCombatTimeout,
    COMBAT_TTL,
    RUN_TTL,
    COMBAT_LOCK_TTL,
} from "../commands/slash/dungeon";
import GuildQuestService from "../services/rpg/guildQuest.service";
import GuildService from "../services/rpg/guild.service";

function buildDefendLine(locale: SupportedLocale, result: CombatActionResult): string[] {
    const lines = [
        t(locale, "dungeon.combat.defend", {
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }),
    ];
    if (result.healAmount) {
        lines.push(t(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    if (result.mpRegen > 0) {
        lines.push(t(locale, "dungeon.combat.mp_recover", { amount: String(result.mpRegen) }));
    }
    return lines;
}

function buildSkillLine(
    locale: SupportedLocale,
    action: "skill1" | "skill2",
    result: CombatActionResult,
    classType: RpgCombatState["classType"]
): string[] {
    const [s1, s2] = CombatService.getSkillLabels(classType);
    const skillLabel = action === "skill1" ? s1 : s2;
    const skillName = t(locale, `rpg.skill.${skillLabel.key}`);
    const mpCostSuffix =
        result.mpCost > 0 ? ` ${t(locale, "dungeon.combat.mp_cost", { cost: String(result.mpCost) })}` : "";
    const lines = [
        t(locale, "dungeon.combat.skill", {
            skill: skillName,
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }) + mpCostSuffix,
    ];
    if (result.healAmount) {
        lines.push(t(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    return lines;
}

function buildUltimateLine(locale: SupportedLocale, result: CombatActionResult, state: RpgCombatState): string[] {
    if (!state.advancedClass) return [];
    const labels = CombatService.getSkillLabels(state.classType, state.advancedClass);
    const ultimateLabel = labels[2];
    if (!ultimateLabel) return [];
    const skillName = t(locale, `rpg.skill.${ultimateLabel.key}`);
    const mpCostSuffix =
        result.mpCost > 0 ? ` ${t(locale, "dungeon.combat.mp_cost", { cost: String(result.mpCost) })}` : "";
    const lines = [
        t(locale, "dungeon.combat.skill", {
            skill: skillName,
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }) + mpCostSuffix,
    ];
    if (result.healAmount) {
        lines.push(t(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    if (result.selfDamage) {
        lines.push(t(locale, "dungeon.combat.self_damage", { amount: String(result.selfDamage) }));
    }
    if (result.instantKill) {
        lines.push(t(locale, "dungeon.combat.instant_kill"));
    }
    if (result.stoneWallReflect) {
        lines.push(t(locale, "dungeon.combat.reflect", { amount: String(result.stoneWallReflect) }));
    }
    if (result.divineShieldBlocked) {
        lines.push(t(locale, "dungeon.combat.divine_block"));
    }
    return lines;
}

function buildActionLine(
    locale: SupportedLocale,
    action: "attack" | "skill1" | "skill2" | "defend" | "ultimate",
    result: CombatActionResult,
    state: RpgCombatState
): string {
    const lines: string[] = [];

    if (result.critHit) {
        lines.push(t(locale, "dungeon.combat.crit"));
    }

    if (action === "defend") {
        lines.push(...buildDefendLine(locale, result));
    } else if (action === "ultimate") {
        lines.push(...buildUltimateLine(locale, result, state));
    } else if (action === "skill1" || action === "skill2") {
        lines.push(...buildSkillLine(locale, action, result, state.classType));
    } else {
        lines.push(
            t(locale, "dungeon.combat.attack", {
                userDmg: String(result.userDamage),
                monsterDmg: String(result.monsterDamage),
            })
        );
    }

    if (result.statusApplied) {
        lines.push(t(locale, "dungeon.combat.status_applied", { effect: result.statusApplied }));
    }
    if (result.poisonDamage && result.poisonDamage > 0) {
        lines.push(t(locale, "dungeon.combat.poison_tick", { dmg: String(result.poisonDamage) }));
    }

    return lines.join("\n");
}

function buildWinDesc(
    locale: SupportedLocale,
    actionLine: string,
    state: RpgCombatState,
    resolve: CombatResolveResult
): string {
    const lines = [
        actionLine,
        "",
        t(locale, "dungeon.combat.win", { monster: state.monsterName }),
        t(locale, "dungeon.reward.gold", { amount: String(resolve.goldReward) }),
        t(locale, "dungeon.reward.exp", { amount: String(resolve.expReward) }),
        ...(resolve.equipDrop
            ? [
                  t(locale, "dungeon.reward.equip_drop", {
                      rarity: RARITY_CONFIG[resolve.equipDrop.rarity as Rarity].emoji,
                      name: resolve.equipDrop.name,
                  }),
              ]
            : []),
        ...(resolve.materialDrops.length > 0 ? formatMaterialDrops(locale, resolve.materialDrops) : []),
        ...(resolve.crateDrops?.length
            ? resolve.crateDrops.map((drop) =>
                  t(locale, "dungeon.reward.crate", {
                      emoji: CRATES[drop.type].emoji,
                      name: t(locale, `rpg.crate.${drop.type}`),
                      amount: String(drop.qty),
                  })
              )
            : []),
        "",
        t(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }),
        ...(resolve.checkpointReached
            ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) })]
            : []),
        ...(resolve.starReward ? ["\n⭐ " + t(locale, "star_drop.found")] : []),
        ...(resolve.leveled
            ? [t(locale, "dungeon.levelup", { old: String(resolve.oldLevel), new: String(resolve.newLevel) })]
            : []),
    ];
    return lines.join("\n");
}

async function handleWin(
    interaction: ButtonInteraction,
    state: RpgCombatState,
    result: CombatActionResult,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string
): Promise<void> {
    const resolve = await DungeonService.resolveCombatWin(
        state.userId,
        runState?.floor ?? 1,
        state.isBoss,
        state.classType
    );

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${t(locale, "dungeon.title")}`)
        .setDescription(buildWinDesc(locale, actionLine, state, resolve))
        .setColor(0x2ecc71);

    if (!runState) {
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    runState.hp = result.userHp;
    runState.mp = result.currentMp;
    runState.floor = resolve.newFloor;
    runState.checkpoint = resolve.checkpoint;
    runState.accumulatedGold += resolve.goldReward;
    runState.accumulatedExp += resolve.expReward;
    if (resolve.equipDrop) runState.drops.push(resolve.equipDrop.id);
    await redis.setJson(runKey, runState, RUN_TTL);
    await interaction.editReply({
        embeds: [embed],
        components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
    });

    CharacterService.incrementMonstersKilled(state.userId, 1).catch(() => {});
    GuildQuestService.trackProgress(state.userId, "kill_monsters", 1, interaction.guildId ?? undefined).catch(() => {});
    if (state.isBoss) {
        GuildQuestService.trackProgress(state.userId, "defeat_boss", 1, interaction.guildId ?? undefined).catch(
            () => {}
        );
        GuildService.incrementBossKills(state.userId).catch(() => {});
    }
}

async function handleLoss(
    interaction: ButtonInteraction,
    state: RpgCombatState,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string
): Promise<void> {
    const loss = await DungeonService.resolveCombatLoss(state.userId);

    const embed = new EmbedBuilder()
        .setTitle(`💀 ${t(locale, "dungeon.title")}`)
        .setDescription(
            [
                actionLine,
                "",
                t(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
                t(locale, "dungeon.penalty", { amount: String(loss.goldLost) }),
            ].join("\n")
        )
        .setColor(0xed4245);

    // Always end run and set cooldown on death
    await redis.deleteKey(runKey);
    await redis.deleteKey(`dungeon_merchant:${state.userId}`);
    const tierConfig = await PremiumService.getConfig(state.userId);
    const cdKey = `dungeon_cd:${state.userId}`;
    await redis.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleTurnsUp(
    interaction: ButtonInteraction,
    result: CombatActionResult,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string
): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
        .setDescription([actionLine, "", t(locale, "dungeon.combat.turns_up")].join("\n"))
        .setColor(0x95a5a6);

    if (!runState) {
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    runState.hp = result.userHp;
    runState.mp = result.currentMp;
    await redis.setJson(runKey, runState, RUN_TTL);
    await interaction.editReply({
        embeds: [embed],
        components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
    });
}

export async function handleCombatAction(
    interaction: ButtonInteraction,
    action: "attack" | "skill1" | "skill2" | "defend" | "ultimate"
): Promise<void> {
    const userId = interaction.user.id;
    const lockKey = `dungeon_lock:${userId}`;
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;

    const locked = await redis.setKeyNX(lockKey, "1", COMBAT_LOCK_TTL);
    if (!locked) {
        await interaction.deferUpdate().catch(() => {});
        return;
    }

    try {
        const state = await redis.getJson<RpgCombatState>(combatKey);
        if (!state) {
            const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            await interaction.reply({
                content: t(fallbackLocale, "dungeon.combat.timeout"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (state.userId !== userId) {
            const foreignLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            await interaction.reply({
                content: t(foreignLocale, "common.no_permission"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferUpdate();

        const runState = await redis.getJson<DungeonRunState>(runKey);
        const locale = (runState?.locale ?? "en") as SupportedLocale;
        const result = CombatService.executeAction(state, action);

        // Insufficient MP — ephemeral reply, no state change
        if (result.insufficientMp) {
            await interaction.followUp({
                content: t(locale, "dungeon.combat.insufficient_mp"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const actionLine = buildActionLine(locale, action, result, state);

        // Save MP back to run state for all outcomes
        if (runState) {
            runState.mp = result.currentMp;
        }

        if (result.won) {
            cancelCombatTimeout(userId);
            await redis.deleteKey(combatKey);
            await handleWin(interaction, state, result, runState, runKey, locale, actionLine);
            return;
        }

        if (result.lost) {
            cancelCombatTimeout(userId);
            await redis.deleteKey(combatKey);
            await handleLoss(interaction, state, runState, runKey, locale, actionLine);
            return;
        }

        if (result.turnsUp) {
            cancelCombatTimeout(userId);
            await redis.deleteKey(combatKey);
            await handleTurnsUp(interaction, result, runState, runKey, locale, actionLine);
            return;
        }

        // Combat continues — rotate encounterId so stale idle timers no-op, then save
        state.encounterId = randomUUID();
        await redis.setJson(combatKey, state, COMBAT_TTL);
        if (runState) {
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        const embed = buildRpgCombatEmbed(locale, state, runState?.checkpoint ?? 1);
        const descLines = [
            actionLine,
            "",
            t(locale, "dungeon.combat.hp", {
                userHp: String(result.userHp),
                maxHp: String(state.user.maxHp),
                monster: state.monsterName,
                monsterHp: String(result.monsterHp),
                maxMonsterHp: String(state.monster.maxHp),
            }),
            t(locale, "dungeon.combat.mp", { mp: String(result.currentMp), maxMp: String(state.user.maxMp) }),
            t(locale, "dungeon.floor", {
                floor: String(runState?.floor ?? 1),
                checkpoint: String(runState?.checkpoint ?? 1),
            }),
        ];

        const continueEmbed = new EmbedBuilder()
            .setTitle(embed.data.title ?? `${state.monsterEmoji} ${state.monsterName}`)
            .setDescription(descLines.join("\n"))
            .setColor(state.isBoss ? 0xe74c3c : 0xe67e22);

        if (state.monsterImage) {
            if (state.isBoss) continueEmbed.setImage(state.monsterImage);
            else continueEmbed.setThumbnail(state.monsterImage);
        }

        const currentMp = runState?.mp ?? result.currentMp;
        const combatRows = buildCombatRow(locale, state.classType, currentMp, state.advancedClass, state.ultimateUsed);
        await interaction.editReply({
            embeds: [continueEmbed],
            components: combatRows,
        });

        // Reschedule idle timeout with the new encounterId — earlier timers now no-op
        scheduleCombatTimeout(interaction, state.userId, locale, state.encounterId);
    } finally {
        await redis.deleteKey(lockKey);
    }
}

export default {
    id: BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "attack");
    },
};
