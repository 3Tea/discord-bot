"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCombatAction = handleCombatAction;
const node_crypto_1 = require("node:crypto");
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const dungeon_service_1 = __importDefault(require("../services/economy/dungeon.service"));
const combat_service_1 = __importDefault(require("../services/rpg/combat.service"));
const rpg_config_1 = require("../services/rpg/rpg.config");
const premium_service_1 = __importDefault(require("../services/premium/premium.service"));
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const dungeon_1 = require("../commands/slash/dungeon");
const guildQuest_service_1 = __importDefault(require("../services/rpg/guildQuest.service"));
const guild_service_1 = __importDefault(require("../services/rpg/guild.service"));
function buildDefendLine(locale, result) {
    const lines = [
        (0, t_1.t)(locale, "dungeon.combat.defend", {
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }),
    ];
    if (result.healAmount) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    if (result.mpRegen > 0) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.mp_recover", { amount: String(result.mpRegen) }));
    }
    return lines;
}
function buildSkillLine(locale, action, result, classType) {
    const [s1, s2] = combat_service_1.default.getSkillLabels(classType);
    const skillLabel = action === "skill1" ? s1 : s2;
    const skillName = (0, t_1.t)(locale, `rpg.skill.${skillLabel.key}`);
    const mpCostSuffix = result.mpCost > 0 ? ` ${(0, t_1.t)(locale, "dungeon.combat.mp_cost", { cost: String(result.mpCost) })}` : "";
    const lines = [
        (0, t_1.t)(locale, "dungeon.combat.skill", {
            skill: skillName,
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }) + mpCostSuffix,
    ];
    if (result.healAmount) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    return lines;
}
function buildUltimateLine(locale, result, state) {
    if (!state.advancedClass)
        return [];
    const labels = combat_service_1.default.getSkillLabels(state.classType, state.advancedClass);
    const ultimateLabel = labels[2];
    if (!ultimateLabel)
        return [];
    const skillName = (0, t_1.t)(locale, `rpg.skill.${ultimateLabel.key}`);
    const mpCostSuffix = result.mpCost > 0 ? ` ${(0, t_1.t)(locale, "dungeon.combat.mp_cost", { cost: String(result.mpCost) })}` : "";
    const lines = [
        (0, t_1.t)(locale, "dungeon.combat.skill", {
            skill: skillName,
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }) + mpCostSuffix,
    ];
    if (result.healAmount) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.heal_skill", { amount: String(result.healAmount) }));
    }
    if (result.selfDamage) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.self_damage", { amount: String(result.selfDamage) }));
    }
    if (result.instantKill) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.instant_kill"));
    }
    if (result.stoneWallReflect) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.reflect", { amount: String(result.stoneWallReflect) }));
    }
    if (result.divineShieldBlocked) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.divine_block"));
    }
    return lines;
}
function buildActionLine(locale, action, result, state) {
    const lines = [];
    if (result.critHit) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.crit"));
    }
    if (action === "defend") {
        lines.push(...buildDefendLine(locale, result));
    }
    else if (action === "ultimate") {
        lines.push(...buildUltimateLine(locale, result, state));
    }
    else if (action === "skill1" || action === "skill2") {
        lines.push(...buildSkillLine(locale, action, result, state.classType));
    }
    else {
        lines.push((0, t_1.t)(locale, "dungeon.combat.attack", {
            userDmg: String(result.userDamage),
            monsterDmg: String(result.monsterDamage),
        }));
    }
    if (result.statusApplied) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.status_applied", { effect: result.statusApplied }));
    }
    if (result.poisonDamage && result.poisonDamage > 0) {
        lines.push((0, t_1.t)(locale, "dungeon.combat.poison_tick", { dmg: String(result.poisonDamage) }));
    }
    return lines.join("\n");
}
function buildWinDesc(locale, actionLine, state, resolve) {
    const lines = [
        actionLine,
        "",
        (0, t_1.t)(locale, "dungeon.combat.win", { monster: state.monsterName }),
        (0, t_1.t)(locale, "dungeon.reward.gold", { amount: String(resolve.goldReward) }),
        (0, t_1.t)(locale, "dungeon.reward.exp", { amount: String(resolve.expReward) }),
        ...(resolve.equipDrop
            ? [
                (0, t_1.t)(locale, "dungeon.reward.equip_drop", {
                    rarity: rpg_config_1.RARITY_CONFIG[resolve.equipDrop.rarity].emoji,
                    name: resolve.equipDrop.name,
                }),
            ]
            : []),
        ...(resolve.materialDrops.length > 0 ? (0, dungeon_1.formatMaterialDrops)(locale, resolve.materialDrops) : []),
        ...(resolve.crateDrops?.length
            ? resolve.crateDrops.map((drop) => (0, t_1.t)(locale, "dungeon.reward.crate", {
                emoji: rpg_config_1.CRATES[drop.type].emoji,
                name: (0, t_1.t)(locale, `rpg.crate.${drop.type}`),
                amount: String(drop.qty),
            }))
            : []),
        "",
        (0, t_1.t)(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }),
        ...(resolve.checkpointReached
            ? ["🔖 " + (0, t_1.t)(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) })]
            : []),
        ...(resolve.starReward ? ["\n⭐ " + (0, t_1.t)(locale, "star_drop.found")] : []),
        ...(resolve.leveled
            ? [(0, t_1.t)(locale, "dungeon.levelup", { old: String(resolve.oldLevel), new: String(resolve.newLevel) })]
            : []),
    ];
    return lines.join("\n");
}
async function handleWin(interaction, state, result, runState, runKey, locale, actionLine) {
    const resolve = await dungeon_service_1.default.resolveCombatWin(state.userId, runState?.floor ?? 1, state.isBoss, state.classType);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`⚔️ ${(0, t_1.t)(locale, "dungeon.title")}`)
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
    if (resolve.equipDrop)
        runState.drops.push(resolve.equipDrop.id);
    await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
    await interaction.editReply({
        embeds: [embed],
        components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
    });
    character_service_1.default.incrementMonstersKilled(state.userId, 1).catch(() => { });
    guildQuest_service_1.default.trackProgress(state.userId, "kill_monsters", 1, interaction.guildId ?? undefined).catch(() => { });
    if (state.isBoss) {
        guildQuest_service_1.default.trackProgress(state.userId, "defeat_boss", 1, interaction.guildId ?? undefined).catch(() => { });
        guild_service_1.default.incrementBossKills(state.userId).catch(() => { });
    }
}
async function handleLoss(interaction, state, runState, runKey, locale, actionLine) {
    const loss = await dungeon_service_1.default.resolveCombatLoss(state.userId);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`💀 ${(0, t_1.t)(locale, "dungeon.title")}`)
        .setDescription([
        actionLine,
        "",
        (0, t_1.t)(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
        (0, t_1.t)(locale, "dungeon.penalty", { amount: String(loss.goldLost) }),
    ].join("\n"))
        .setColor(0xed4245);
    // Always end run and set cooldown on death
    await redis_1.default.deleteKey(runKey);
    await redis_1.default.deleteKey(`dungeon_merchant:${state.userId}`);
    const tierConfig = await premium_service_1.default.getConfig(state.userId);
    const cdKey = `dungeon_cd:${state.userId}`;
    await redis_1.default.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
    await interaction.editReply({ embeds: [embed], components: [] });
}
async function handleTurnsUp(interaction, result, runState, runKey, locale, actionLine) {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🏃 ${(0, t_1.t)(locale, "dungeon.title")}`)
        .setDescription([actionLine, "", (0, t_1.t)(locale, "dungeon.combat.turns_up")].join("\n"))
        .setColor(0x95a5a6);
    if (!runState) {
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }
    runState.hp = result.userHp;
    runState.mp = result.currentMp;
    await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
    await interaction.editReply({
        embeds: [embed],
        components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
    });
}
async function handleCombatAction(interaction, action) {
    const userId = interaction.user.id;
    const lockKey = `dungeon_lock:${userId}`;
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;
    const locked = await redis_1.default.setKeyNX(lockKey, "1", dungeon_1.COMBAT_LOCK_TTL);
    if (!locked) {
        await interaction.deferUpdate().catch(() => { });
        return;
    }
    try {
        const state = await redis_1.default.getJson(combatKey);
        if (!state) {
            const fallbackLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({
                content: (0, t_1.t)(fallbackLocale, "dungeon.combat.timeout"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (state.userId !== userId) {
            const foreignLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({
                content: (0, t_1.t)(foreignLocale, "common.no_permission"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.deferUpdate();
        const runState = await redis_1.default.getJson(runKey);
        const locale = (runState?.locale ?? "en");
        const result = combat_service_1.default.executeAction(state, action);
        // Insufficient MP — ephemeral reply, no state change
        if (result.insufficientMp) {
            await interaction.followUp({
                content: (0, t_1.t)(locale, "dungeon.combat.insufficient_mp"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const actionLine = buildActionLine(locale, action, result, state);
        // Save MP back to run state for all outcomes
        if (runState) {
            runState.mp = result.currentMp;
        }
        if (result.won) {
            (0, dungeon_1.cancelCombatTimeout)(userId);
            await redis_1.default.deleteKey(combatKey);
            await handleWin(interaction, state, result, runState, runKey, locale, actionLine);
            return;
        }
        if (result.lost) {
            (0, dungeon_1.cancelCombatTimeout)(userId);
            await redis_1.default.deleteKey(combatKey);
            await handleLoss(interaction, state, runState, runKey, locale, actionLine);
            return;
        }
        if (result.turnsUp) {
            (0, dungeon_1.cancelCombatTimeout)(userId);
            await redis_1.default.deleteKey(combatKey);
            await handleTurnsUp(interaction, result, runState, runKey, locale, actionLine);
            return;
        }
        // Combat continues — rotate encounterId so stale idle timers no-op, then save
        state.encounterId = (0, node_crypto_1.randomUUID)();
        await redis_1.default.setJson(combatKey, state, dungeon_1.COMBAT_TTL);
        if (runState) {
            await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
        }
        const embed = (0, dungeon_1.buildRpgCombatEmbed)(locale, state, runState?.checkpoint ?? 1);
        const descLines = [
            actionLine,
            "",
            (0, t_1.t)(locale, "dungeon.combat.hp", {
                userHp: String(result.userHp),
                maxHp: String(state.user.maxHp),
                monster: state.monsterName,
                monsterHp: String(result.monsterHp),
                maxMonsterHp: String(state.monster.maxHp),
            }),
            (0, t_1.t)(locale, "dungeon.combat.mp", { mp: String(result.currentMp), maxMp: String(state.user.maxMp) }),
            (0, t_1.t)(locale, "dungeon.floor", {
                floor: String(runState?.floor ?? 1),
                checkpoint: String(runState?.checkpoint ?? 1),
            }),
        ];
        const continueEmbed = new discord_js_1.EmbedBuilder()
            .setTitle(embed.data.title ?? `${state.monsterEmoji} ${state.monsterName}`)
            .setDescription(descLines.join("\n"))
            .setColor(state.isBoss ? 0xe74c3c : 0xe67e22);
        if (state.monsterImage) {
            if (state.isBoss)
                continueEmbed.setImage(state.monsterImage);
            else
                continueEmbed.setThumbnail(state.monsterImage);
        }
        const currentMp = runState?.mp ?? result.currentMp;
        const combatRows = (0, dungeon_1.buildCombatRow)(locale, state.classType, currentMp, state.advancedClass, state.ultimateUsed);
        await interaction.editReply({
            embeds: [continueEmbed],
            components: combatRows,
        });
        // Reschedule idle timeout with the new encounterId — earlier timers now no-op
        (0, dungeon_1.scheduleCombatTimeout)(interaction, state.userId, locale, state.encounterId);
    }
    finally {
        await redis_1.default.deleteKey(lockKey);
    }
}
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction) {
        await handleCombatAction(interaction, "attack");
    },
};
