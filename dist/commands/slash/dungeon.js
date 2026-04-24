"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBAT_LOCK_TTL = exports.MERCHANT_TIMEOUT_MS = exports.COMBAT_TIMEOUT_MS = exports.MERCHANT_TTL = exports.COMBAT_TTL = exports.RUN_TTL = void 0;
exports.buildCombatRow = buildCombatRow;
exports.buildContinueLeaveText = buildContinueLeaveText;
exports.buildContinueLeaveRow = buildContinueLeaveRow;
exports.buildMerchantRow = buildMerchantRow;
exports.buildMerchantEmbed = buildMerchantEmbed;
exports.buildTreasureEmbed = buildTreasureEmbed;
exports.buildTrapEmbed = buildTrapEmbed;
exports.formatMaterialDrops = formatMaterialDrops;
exports.buildRpgCombatEmbed = buildRpgCombatEmbed;
exports.processEncounter = processEncounter;
exports.scheduleCombatTimeout = scheduleCombatTimeout;
exports.cancelCombatTimeout = cancelCombatTimeout;
exports.scheduleMerchantTimeout = scheduleMerchantTimeout;
exports.cancelMerchantTimeout = cancelMerchantTimeout;
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const dungeon_service_1 = __importDefault(require("../../services/economy/dungeon.service"));
const merchant_service_1 = __importDefault(require("../../services/economy/merchant.service"));
const character_service_1 = __importDefault(require("../../services/rpg/character.service"));
const combat_service_1 = __importDefault(require("../../services/rpg/combat.service"));
const rpg_config_1 = require("../../services/rpg/rpg.config");
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const upgradeButton_1 = require("../../util/premium/upgradeButton");
const premium_config_1 = require("../../services/premium/premium.config");
const format_1 = require("../../util/date/format");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const button_1 = require("../../util/config/button");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const teamDungeon_service_1 = __importDefault(require("../../services/rpg/teamDungeon.service"));
exports.RUN_TTL = 900;
exports.COMBAT_TTL = 60;
exports.MERCHANT_TTL = 60;
exports.COMBAT_TIMEOUT_MS = 60_000;
exports.MERCHANT_TIMEOUT_MS = 60_000;
exports.COMBAT_LOCK_TTL = 3; // seconds — shorter than Discord 3s ack so dead handlers auto-release
const combatTimers = new Map();
const merchantTimers = new Map();
// --- Embed builders (exported for button handlers) ---
function buildCombatRow(locale, classType, currentMp, advancedClass, ultimateUsed) {
    const [skill1, skill2] = combat_service_1.default.getSkillLabels(classType);
    const attackBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_ATTACK)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const skill1Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_SKILL1)
        .setLabel((0, t_1.t)(locale, `rpg.skill.${skill1.key}`))
        .setEmoji(skill1.emoji)
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(currentMp < rpg_config_1.SKILL1_MP_COST);
    const skill2Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_SKILL2)
        .setLabel((0, t_1.t)(locale, `rpg.skill.${skill2.key}`))
        .setEmoji(skill2.emoji)
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(currentMp < rpg_config_1.SKILL2_MP_COST);
    const defendBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_DEFEND)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    const runBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_RUN)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.run"))
        .setEmoji("🏃")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    if (advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[advancedClass];
        if (advConfig) {
            const ultimateLabel = (0, t_1.t)(locale, `rpg.skill.${advConfig.ultimate.key}`);
            const ultimateBtn = new discord_js_1.ButtonBuilder()
                .setCustomId(button_1.BUTTON_ID.DUNGEON_ULTIMATE)
                .setLabel(ultimateLabel)
                .setEmoji(advConfig.ultimate.emoji)
                .setStyle(discord_js_1.ButtonStyle.Danger)
                .setDisabled(!!ultimateUsed || currentMp < rpg_config_1.ULTIMATE_MP_COST);
            // 2 rows: Row 1 = Attack + Skill1 + Skill2 + Ultimate, Row 2 = Defend + Run
            const row1 = new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, ultimateBtn);
            const row2 = new discord_js_1.ActionRowBuilder().addComponents(defendBtn, runBtn);
            return [row1, row2];
        }
    }
    // Base class: single row with 5 buttons
    return [new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn, runBtn)];
}
function buildContinueLeaveText(locale, encountersLeft) {
    return (0, t_1.t)(locale, "dungeon.run.continue", { left: String(encountersLeft) });
}
function buildContinueLeaveRow(locale, encountersLeft) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_CONTINUE)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.continue"))
        .setEmoji("⬇️")
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setDisabled(encountersLeft <= 0), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_LEAVE)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.leave"))
        .setEmoji("🚪")
        .setStyle(discord_js_1.ButtonStyle.Secondary));
}
function buildMerchantRow(locale, merchantState, userGold) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_HEAL)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.heal"))
        .setEmoji("🧪")
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setDisabled(merchantState.currentHp >= merchantState.maxHp || userGold < merchantState.healCost), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_BUFF)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.buff"))
        .setEmoji("✨")
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(userGold < merchantState.buffCost), new discord_js_1.ButtonBuilder()
        .setCustomId(button_1.BUTTON_ID.DUNGEON_EQUIP_BUY)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.exchange"))
        .setEmoji("🎁")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(userGold < merchantState.equipCost));
}
function buildMerchantEmbed(locale, merchantState, userGold) {
    const buffLabel = (0, t_1.t)(locale, `dungeon.buff.${merchantState.buffType}`);
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🏪 ${(0, t_1.t)(locale, "dungeon.title")}`)
        .setDescription([
        (0, t_1.t)(locale, "dungeon.merchant.title", { floor: String(merchantState.floor) }),
        (0, t_1.t)(locale, "dungeon.merchant.greeting"),
        "",
        `🧪 ${(0, t_1.t)(locale, "dungeon.merchant.heal_option", { amount: String(merchantState.healAmount), cost: String(merchantState.healCost) })}`,
        `✨ ${(0, t_1.t)(locale, "dungeon.merchant.buff_option", { buffType: buffLabel, cost: String(merchantState.buffCost) })}`,
        `🎁 ${(0, t_1.t)(locale, "dungeon.merchant.equip_option", { cost: String(merchantState.equipCost) })}`,
        "",
        `HP: **${merchantState.currentHp}**/${merchantState.maxHp} | Gold: **${userGold}** 🪙`,
        (0, t_1.t)(locale, "dungeon.floor", {
            floor: String(merchantState.floor),
            checkpoint: String(merchantState.checkpoint),
        }),
    ].join("\n"))
        .setColor(0x9b59b6);
}
function buildTreasureEmbed(locale, opts) {
    const { floor, checkpoint, goldReward, expReward, starReward, equipDrop, materialDrops, newFloor, checkpointReached, leveled, oldLevel, newLevel, } = opts;
    const descLines = [
        (0, t_1.t)(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        (0, t_1.t)(locale, "dungeon.reward.gold", { amount: String(goldReward) }),
        (0, t_1.t)(locale, "dungeon.reward.exp", { amount: String(expReward) }),
        ...(equipDrop
            ? [
                (0, t_1.t)(locale, "dungeon.reward.equip_drop", {
                    rarity: rpg_config_1.RARITY_CONFIG[equipDrop.rarity].emoji,
                    name: equipDrop.name,
                }),
            ]
            : []),
        ...(materialDrops.length > 0 ? formatMaterialDrops(locale, materialDrops) : []),
        "",
        (0, t_1.t)(locale, "dungeon.floor", { floor: String(newFloor), checkpoint: String(checkpoint) }),
        ...(checkpointReached ? ["🔖 " + (0, t_1.t)(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) })] : []),
        ...(starReward ? ["\n⭐ " + (0, t_1.t)(locale, "star_drop.found")] : []),
        ...(leveled ? [(0, t_1.t)(locale, "dungeon.levelup", { old: String(oldLevel), new: String(newLevel) })] : []),
    ];
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🎁 ${(0, t_1.t)(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xf1c40f);
}
function buildTrapEmbed(locale, opts) {
    const { floor, checkpoint, hpLost, goldLost, collapsed, currentHp, maxHp } = opts;
    const descLines = [
        (0, t_1.t)(locale, "dungeon.encounter.trap", { floor: String(floor) }),
        (0, t_1.t)(locale, "dungeon.trap.damage", { hp: String(hpLost), gold: String(goldLost) }),
        ...(collapsed ? ["", (0, t_1.t)(locale, "dungeon.collapse", { checkpoint: String(checkpoint) })] : []),
        "",
        `HP: **${currentHp}**/${maxHp}`,
        (0, t_1.t)(locale, "dungeon.floor", { floor: String(collapsed ? checkpoint : floor), checkpoint: String(checkpoint) }),
    ];
    return new discord_js_1.EmbedBuilder()
        .setTitle(`🪤 ${(0, t_1.t)(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(collapsed ? 0xed4245 : 0xe67e22);
}
function formatMaterialDrops(locale, materialDrops) {
    return materialDrops.map((drop) => {
        const mat = rpg_config_1.MATERIALS.find((m) => m.key === drop.key);
        const emoji = mat?.emoji ?? "⬜";
        const name = (0, t_1.t)(locale, `rpg.material.${drop.key}`);
        return `${emoji} ${name} ×${drop.qty}`;
    });
}
function buildRpgCombatEmbed(locale, state, checkpoint) {
    const titlePrefix = state.isBoss ? "👑" : state.monsterEmoji;
    const monsterLabel = state.isBoss
        ? (0, t_1.t)(locale, "dungeon.combat.boss_appear", { monster: state.monsterName, floor: String(checkpoint) })
        : (0, t_1.t)(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(checkpoint) });
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`${titlePrefix} ${monsterLabel}`)
        .setDescription([
        (0, t_1.t)(locale, "dungeon.combat.hp", {
            userHp: String(state.user.hp),
            maxHp: String(state.user.maxHp),
            monster: state.monsterName,
            monsterHp: String(state.monster.hp),
            maxMonsterHp: String(state.monster.maxHp),
        }),
        (0, t_1.t)(locale, "dungeon.combat.mp", { mp: String(state.user.mp), maxMp: String(state.user.maxMp) }),
        "",
        (0, t_1.t)(locale, "dungeon.floor", { floor: String(checkpoint), checkpoint: String(checkpoint) }),
    ].join("\n"))
        .setColor(state.isBoss ? 0xe74c3c : 0xe67e22);
    if (state.monsterImage) {
        if (state.isBoss)
            embed.setImage(state.monsterImage);
        else
            embed.setThumbnail(state.monsterImage);
    }
    return embed;
}
// --- Encounter processing for a run ---
async function processEncounter(runState) {
    const locale = runState.locale;
    const { userId, floor, checkpoint, classType } = runState;
    const encounterType = dungeon_service_1.default.rollEncounterForRun(runState);
    // Tick buff (decrement encounters left)
    dungeon_service_1.default.tickBuff(runState);
    if (encounterType === "monster") {
        const isBoss = dungeon_service_1.default.isBossFloor(floor);
        const monster = dungeon_service_1.default.rollMonster(floor);
        // Load character stats for combat
        const char = await character_service_1.default.requireCharacter(userId);
        const stats = await character_service_1.default.getEffectiveStats(userId);
        const monsterStats = isBoss ? (0, rpg_config_1.getBossStats)(floor, char.level) : (0, rpg_config_1.getMonsterStats)(floor, char.level);
        const advancedClass = char.advancedClass ?? null;
        const combatState = combat_service_1.default.initCombat({
            userId,
            classType,
            advancedClass,
            userStats: stats,
            userHp: runState.hp,
            maxHp: runState.maxHp,
            userMp: runState.mp,
            maxMp: runState.maxMp,
            monster: { name: monster.name, emoji: monster.emoji, image: monster.image, stats: monsterStats },
            isBoss,
        });
        const combatKey = `dungeon_combat:${userId}`;
        await redis_1.default.setJson(combatKey, combatState, exports.COMBAT_TTL);
        const currentMp = runState.mp ?? runState.maxMp ?? 55;
        return {
            embed: buildRpgCombatEmbed(locale, combatState, checkpoint),
            rows: buildCombatRow(locale, classType, currentMp, advancedClass),
            runEnded: false,
        };
    }
    if (encounterType === "treasure") {
        const result = await dungeon_service_1.default.resolveTreasure(userId, floor, classType);
        runState.floor = result.newFloor;
        runState.checkpoint = result.checkpoint;
        runState.accumulatedGold += result.goldReward;
        runState.accumulatedExp += result.expReward;
        if (result.equipDrop)
            runState.drops.push(result.equipDrop.id);
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
        const trapResult = await dungeon_service_1.default.resolveTrap(userId, floor, runState.hp);
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
    const char = await character_service_1.default.requireCharacter(userId);
    const merchantState = merchant_service_1.default.buildMerchantState(userId, runState.locale, floor, checkpoint, runState.hp, runState.maxHp);
    const merchantKey = `dungeon_merchant:${userId}`;
    await redis_1.default.setJson(merchantKey, merchantState, exports.MERCHANT_TTL);
    return {
        embed: buildMerchantEmbed(locale, merchantState, char.gold),
        rows: [
            buildMerchantRow(locale, merchantState, char.gold),
            buildContinueLeaveRow(locale, runState.encountersLeft),
        ],
        runEnded: false,
    };
}
/**
 * Schedule combat/merchant auto-timeouts that update the Discord message.
 * Must be called after processEncounter when the encounter type is monster or npc.
 * Accepts any interaction with editReply (ChatInputCommandInteraction or ButtonInteraction).
 */
function scheduleCombatTimeout(interaction, userId, locale, encounterId) {
    const existing = combatTimers.get(userId);
    if (existing)
        clearTimeout(existing);
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;
    const handle = setTimeout(async () => {
        combatTimers.delete(userId);
        try {
            const active = await redis_1.default.getJson(combatKey);
            if (active?.encounterId !== encounterId)
                return;
            await redis_1.default.deleteKey(combatKey);
            const runState = await redis_1.default.getJson(runKey);
            const timeoutEmbed = new discord_js_1.EmbedBuilder()
                .setTitle(`🏃 ${(0, t_1.t)(locale, "dungeon.title")}`)
                .setDescription((0, t_1.t)(locale, "dungeon.combat.timeout"))
                .setColor(0x95a5a6);
            if (runState) {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
            }
            else {
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        }
        catch (error) {
            logger_mixed_1.logger.debug("dungeon combat timeout handler failed", error);
        }
    }, exports.COMBAT_TIMEOUT_MS);
    combatTimers.set(userId, handle);
}
function cancelCombatTimeout(userId) {
    const existing = combatTimers.get(userId);
    if (existing) {
        clearTimeout(existing);
        combatTimers.delete(userId);
    }
}
function scheduleMerchantTimeout(interaction, userId, locale, encounterId) {
    const existing = merchantTimers.get(userId);
    if (existing)
        clearTimeout(existing);
    const merchantKey = `dungeon_merchant:${userId}`;
    const runKey = `dungeon_run:${userId}`;
    const handle = setTimeout(async () => {
        merchantTimers.delete(userId);
        try {
            const active = await redis_1.default.getJson(merchantKey);
            if (!active || active.encounterId !== encounterId)
                return;
            await redis_1.default.deleteKey(merchantKey);
            const runState = await redis_1.default.getJson(runKey);
            const timeoutEmbed = new discord_js_1.EmbedBuilder()
                .setTitle(`🧙 ${(0, t_1.t)(locale, "dungeon.title")}`)
                .setDescription((0, t_1.t)(locale, "dungeon.merchant.timeout"))
                .setColor(0x95a5a6);
            if (runState) {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
            }
            else {
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        }
        catch (error) {
            logger_mixed_1.logger.debug("dungeon merchant timeout handler failed", error);
        }
    }, exports.MERCHANT_TIMEOUT_MS);
    merchantTimers.set(userId, handle);
}
function cancelMerchantTimeout(userId) {
    const existing = merchantTimers.get(userId);
    if (existing) {
        clearTimeout(existing);
        merchantTimers.delete(userId);
    }
}
// --- Team dungeon: build lobby embed ---
function buildLobbyEmbed(locale, party) {
    const lines = [];
    if (party.members.length === 1) {
        const leader = party.members[0];
        const cls = teamDungeon_service_1.default.getClassLabel(leader.classType, leader.advancedClass);
        lines.push((0, t_1.t)(locale, "dungeon.team.leader", {
            user: leader.userId,
            class: `${cls.name} ${cls.emoji}`,
            level: String(leader.level),
        }));
        lines.push(`\n${(0, t_1.t)(locale, "dungeon.team.members", { current: "1" })}`);
    }
    else {
        lines.push((0, t_1.t)(locale, "dungeon.team.members", { current: String(party.members.length) }));
        for (let i = 0; i < party.members.length; i++) {
            const m = party.members[i];
            const cls = teamDungeon_service_1.default.getClassLabel(m.classType, m.advancedClass);
            const suffix = m.userId === party.leaderId ? " (Leader)" : "";
            lines.push((0, t_1.t)(locale, "dungeon.team.member", {
                index: String(i + 1),
                user: m.userId,
                class: `${cls.name} ${cls.emoji}`,
                level: String(m.level),
            }) + suffix);
        }
    }
    return new discord_js_1.EmbedBuilder()
        .setTitle(`${(0, t_1.t)(locale, "dungeon.team.title")} — ${(0, t_1.t)(locale, "dungeon.team.lobby")}`)
        .setDescription(lines.join("\n"))
        .setColor(0x9b59b6);
}
function buildLobbyRow(locale, memberCount) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("team_dungeon_join")
        .setLabel((0, t_1.t)(locale, "dungeon.team.join"))
        .setEmoji("🎮")
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId("team_dungeon_start")
        .setLabel((0, t_1.t)(locale, "dungeon.team.start"))
        .setEmoji("▶️")
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(memberCount < 2));
}
// --- Team dungeon: build team combat embed ---
function buildTeamCombatEmbed(locale, party) {
    if (!party.monster) {
        return new discord_js_1.EmbedBuilder().setDescription("No monster").setColor(0x95a5a6);
    }
    const monster = party.monster;
    const titlePrefix = monster.isBoss ? "👑" : monster.emoji;
    const monsterLabel = monster.isBoss
        ? (0, t_1.t)(locale, "dungeon.combat.boss_appear", { monster: monster.name, floor: String(party.floor) })
        : (0, t_1.t)(locale, "dungeon.encounter.monster", { monster: monster.name, floor: String(party.floor) });
    const partyLines = party.members
        .map((m) => {
        const cls = teamDungeon_service_1.default.getClassLabel(m.classType, m.advancedClass);
        const status = m.alive ? `HP: **${m.hp}**/${m.maxHp} | MP: **${m.mp}**/${m.maxMp}` : "**DOWNED**";
        return `${cls.emoji} <@${m.userId}> (${cls.name}) — ${status}`;
    })
        .join("\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`${titlePrefix} ${monsterLabel}`)
        .setDescription([
        `${monster.emoji} ${monster.name} HP: **${monster.hp}**/${monster.maxHp}`,
        "",
        partyLines,
        "",
        (0, t_1.t)(locale, "dungeon.team.turn", { turn: String(party.turn), max: String(party.maxTurns) }),
    ].join("\n"))
        .setColor(monster.isBoss ? 0xe74c3c : 0xe67e22);
    if (monster.image) {
        if (monster.isBoss)
            embed.setImage(monster.image);
        else
            embed.setThumbnail(monster.image);
    }
    return embed;
}
function buildTeamCombatRow(locale, partyId, hasAdvanced) {
    const attackBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`td_attack:${partyId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const skill1Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`td_skill1:${partyId}`)
        .setLabel("Skill 1")
        .setEmoji("✨")
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const skill2Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`td_skill2:${partyId}`)
        .setLabel("Skill 2")
        .setEmoji("🔥")
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const defendBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`td_defend:${partyId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    if (hasAdvanced) {
        const ultimateBtn = new discord_js_1.ButtonBuilder()
            .setCustomId(`td_ultimate:${partyId}`)
            .setLabel("Ultimate")
            .setEmoji("💥")
            .setStyle(discord_js_1.ButtonStyle.Danger);
        return [
            new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, ultimateBtn),
            new discord_js_1.ActionRowBuilder().addComponents(defendBtn),
        ];
    }
    return [new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn)];
}
function formatMemberActionLine(ma, party) {
    const member = party.members.find((m) => m.userId === ma.userId);
    if (!member)
        return "";
    const cls = teamDungeon_service_1.default.getClassLabel(member.classType, member.advancedClass);
    const prefix = `${cls.emoji} <@${ma.userId}>`;
    if (ma.action === "defend")
        return `${prefix} defended (+${ma.healed} HP)`;
    if (ma.damage > 0)
        return `${prefix} dealt **${ma.damage}** damage`;
    if (ma.healed > 0)
        return `${prefix} healed **${ma.healed}** HP`;
    return `${prefix} used ${ma.action}`;
}
function formatPartyStatusLines(party) {
    return party.members.map((m) => {
        const cls = teamDungeon_service_1.default.getClassLabel(m.classType, m.advancedClass);
        const status = m.alive ? `HP: **${m.hp}**/${m.maxHp} | MP: **${m.mp}**/${m.maxMp}` : "**DOWNED**";
        return `${cls.emoji} <@${m.userId}> — ${status}`;
    });
}
function buildRevealLines(locale, party, result) {
    const lines = result.memberActions.map((ma) => formatMemberActionLine(ma, party)).filter(Boolean);
    if (result.revivedThisTurn) {
        lines.push((0, t_1.t)(locale, "dungeon.team.revived", {
            user: result.revivedThisTurn.userId,
            healer: result.revivedThisTurn.healerId,
        }));
    }
    if (result.monsterDamagePerTarget > 0 && !result.monsterDefeated) {
        lines.push((0, t_1.t)(locale, "dungeon.team.monster_attack", {
            monster: party.monster?.name ?? "Monster",
            damage: String(result.monsterDamagePerTarget),
        }));
    }
    lines.push(...result.downedThisTurn.map((id) => (0, t_1.t)(locale, "dungeon.team.downed", { user: id })));
    if (party.monster && !result.monsterDefeated) {
        lines.push("", `${party.monster.emoji} ${party.monster.name} HP: **${party.monster.hp}**/${party.monster.maxHp}`);
    }
    lines.push("", ...formatPartyStatusLines(party));
    return lines;
}
function revealColor(result) {
    if (result.monsterDefeated)
        return 0x2ecc71;
    if (result.teamWiped)
        return 0xed4245;
    return 0x3498db;
}
// --- Team dungeon: action collector for one turn ---
async function collectTeamActions(interaction, locale, partyId, party) {
    const combatEmbed = buildTeamCombatEmbed(locale, party);
    const hasAdvanced = party.members.some((m) => m.advancedClass !== null);
    const combatRows = buildTeamCombatRow(locale, partyId, hasAdvanced);
    const msg = await interaction.editReply({ embeds: [combatEmbed], components: combatRows });
    const submitted = new Set();
    const aliveIds = new Set(party.members.filter((m) => m.alive).map((m) => m.userId));
    try {
        const collector = msg.createMessageComponentCollector({ time: 30_000 });
        await new Promise((resolve) => {
            collector.on("collect", async (btnInteraction) => {
                const userId = btnInteraction.user.id;
                if (!aliveIds.has(userId) || submitted.has(userId)) {
                    await btnInteraction.reply({
                        content: (0, t_1.t)(locale, submitted.has(userId) ? "dungeon.team.already_in" : "dungeon.team.waiting"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    return;
                }
                const actionPart = btnInteraction.customId.split(":")[0].replace("td_", "");
                await teamDungeon_service_1.default.submitAction(partyId, userId, actionPart);
                submitted.add(userId);
                await btnInteraction.reply({
                    content: (0, t_1.t)(locale, "dungeon.team.joined"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                const freshParty = await teamDungeon_service_1.default.getParty(partyId);
                if (freshParty && (await teamDungeon_service_1.default.allAliveSubmitted(freshParty))) {
                    collector.stop("all_submitted");
                }
            });
            collector.on("end", () => resolve());
        });
    }
    catch {
        // Collector error — auto-defend for missing
    }
    return submitted;
}
// --- Team dungeon: auto-defend missing members ---
async function autoDefendMissing(partyId, members, submitted) {
    for (const m of members) {
        if (m.alive && !submitted.has(m.userId)) {
            await teamDungeon_service_1.default.submitAction(partyId, m.userId, "defend");
        }
    }
}
// --- Team dungeon: single combat turn ---
async function resolveTeamTurnAndShow(interaction, locale, partyId) {
    const resolveParty = await teamDungeon_service_1.default.getParty(partyId);
    if (!resolveParty)
        return null;
    const result = await teamDungeon_service_1.default.resolveTurn(resolveParty);
    await teamDungeon_service_1.default.saveParty(resolveParty);
    const revealEmbed = new discord_js_1.EmbedBuilder()
        .setTitle(`${(0, t_1.t)(locale, "dungeon.team.title")} — Turn ${resolveParty.turn - 1} Result`)
        .setDescription(buildRevealLines(locale, resolveParty, result).join("\n"))
        .setColor(revealColor(result));
    await interaction.editReply({ embeds: [revealEmbed], components: [] });
    return result;
}
// --- Team dungeon: combat turn loop ---
async function runTeamCombatLoop(interaction, locale, partyId) {
    for (let turnIdx = 0; turnIdx < 7; turnIdx++) {
        const party = await teamDungeon_service_1.default.getParty(partyId);
        if (!party?.monster)
            return { monsterDefeated: false, teamWiped: true };
        const submitted = await collectTeamActions(interaction, locale, partyId, party);
        await autoDefendMissing(partyId, party.members, submitted);
        const result = await resolveTeamTurnAndShow(interaction, locale, partyId);
        if (!result)
            return { monsterDefeated: false, teamWiped: true };
        if (result.monsterDefeated)
            return { monsterDefeated: true, teamWiped: false };
        if (result.teamWiped)
            return { monsterDefeated: false, teamWiped: true };
        const fresh = await teamDungeon_service_1.default.getParty(partyId);
        if (fresh && fresh.turn > fresh.maxTurns)
            return { monsterDefeated: false, teamWiped: false };
        await new Promise((r) => setTimeout(r, 2000));
    }
    return { monsterDefeated: false, teamWiped: false };
}
// --- Team dungeon: join error message resolver ---
function resolveJoinError(locale, reason) {
    const errorMap = {
        full: "dungeon.team.full",
        already_in: "dungeon.team.already_in",
        no_character: "dungeon.team.no_character",
        cooldown: "dungeon.team.cooldown",
        in_party: "dungeon.team.in_party",
    };
    const key = reason && errorMap[reason] ? errorMap[reason] : "common.error";
    return (0, t_1.t)(locale, key);
}
// --- Team dungeon: lobby phase ---
async function runTeamLobby(interaction, locale, party) {
    const msg = await interaction.editReply({
        embeds: [buildLobbyEmbed(locale, party)],
        components: [buildLobbyRow(locale, party.members.length)],
    });
    party.messageId = msg.id;
    await teamDungeon_service_1.default.saveParty(party);
    let started = false;
    try {
        const collector = msg.createMessageComponentCollector({ time: 120_000 });
        await new Promise((resolve) => {
            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.customId === "team_dungeon_join") {
                    const joinResult = await teamDungeon_service_1.default.joinParty(party.partyId, btnInteraction.user.id);
                    if (!joinResult.success) {
                        await btnInteraction.reply({
                            content: resolveJoinError(locale, joinResult.reason),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    const updatedParty = await teamDungeon_service_1.default.getParty(party.partyId);
                    if (updatedParty) {
                        await btnInteraction.update({
                            embeds: [buildLobbyEmbed(locale, updatedParty)],
                            components: [buildLobbyRow(locale, updatedParty.members.length)],
                        });
                    }
                    return;
                }
                if (btnInteraction.customId !== "team_dungeon_start")
                    return;
                const currentParty = await teamDungeon_service_1.default.getParty(party.partyId);
                if (btnInteraction.user.id !== party.leaderId || !currentParty || currentParty.members.length < 2) {
                    await btnInteraction.reply({
                        content: (0, t_1.t)(locale, "dungeon.team.need_more"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    return;
                }
                const startedParty = await teamDungeon_service_1.default.startRun(party.partyId);
                if (!startedParty) {
                    await btnInteraction.reply({ content: (0, t_1.t)(locale, "common.error"), flags: discord_js_1.MessageFlags.Ephemeral });
                    return;
                }
                started = true;
                const startEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle((0, t_1.t)(locale, "dungeon.team.title"))
                    .setDescription((0, t_1.t)(locale, "dungeon.team.started", { size: String(startedParty.members.length) }))
                    .setColor(0x2ecc71);
                await btnInteraction.update({ embeds: [startEmbed], components: [] });
                collector.stop("started");
            });
            collector.on("end", () => resolve());
        });
    }
    catch {
        // Collector error
    }
    return started;
}
// --- Team dungeon: encounter handlers ---
async function handleTeamMonsterEncounter(interaction, locale, party, guildId) {
    teamDungeon_service_1.default.initTeamMonster(party);
    await teamDungeon_service_1.default.saveParty(party);
    const { monsterDefeated, teamWiped } = await runTeamCombatLoop(interaction, locale, party.partyId);
    if (monsterDefeated) {
        const afterCombat = await teamDungeon_service_1.default.getParty(party.partyId);
        if (!afterCombat)
            return "wiped";
        const isBoss = afterCombat.monster?.isBoss ?? false;
        const rewards = await teamDungeon_service_1.default.distributeRewards(afterCombat, isBoss ? "boss" : "monster");
        const { checkpointReached } = await teamDungeon_service_1.default.advanceFloor(afterCombat);
        afterCombat.monster = null;
        await teamDungeon_service_1.default.saveParty(afterCombat);
        const rewardLines = [
            (0, t_1.t)(locale, "dungeon.team.reward_split", {
                gold: String(rewards.goldPerMember),
                exp: String(rewards.expPerMember),
            }),
            ...rewards.memberRewards.flatMap((mr) => {
                const lines = [];
                if (mr.equipDrop)
                    lines.push(`<@${mr.userId}>: ${rpg_config_1.RARITY_CONFIG[mr.equipDrop.rarity].emoji} **${mr.equipDrop.name}**`);
                if (mr.leveled)
                    lines.push((0, t_1.t)(locale, "dungeon.levelup", { old: String(mr.oldLevel), new: String(mr.newLevel) }));
                if (mr.starReward)
                    lines.push(`<@${mr.userId}>: ${(0, t_1.t)(locale, "star_drop.found")}`);
                return lines;
            }),
            ...(checkpointReached
                ? ["🔖 " + (0, t_1.t)(locale, "dungeon.checkpoint_reached", { floor: String(afterCombat.floor) })]
                : []),
        ];
        const monsterLabel = isBoss ? "Boss" : "Monster";
        const rewardEmbed = new discord_js_1.EmbedBuilder()
            .setTitle(`${(0, t_1.t)(locale, "dungeon.team.title")} — ${(0, t_1.t)(locale, "dungeon.combat.win", { monster: monsterLabel })}`)
            .setDescription(rewardLines.join("\n"))
            .setColor(0x2ecc71);
        if (afterCombat.encountersLeft > 0) {
            rewardEmbed.setFooter({ text: buildContinueLeaveText(locale, afterCombat.encountersLeft) });
        }
        await interaction.editReply({ embeds: [rewardEmbed], components: [] });
        for (const m of afterCombat.members) {
            quest_service_1.default.trackProgress(m.userId, guildId, "dungeon").catch(() => { });
        }
        return "defeated";
    }
    if (teamWiped) {
        const wipeEmbed = new discord_js_1.EmbedBuilder()
            .setTitle((0, t_1.t)(locale, "dungeon.team.title"))
            .setDescription((0, t_1.t)(locale, "dungeon.team.wipe"))
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [wipeEmbed], components: [] });
        return "wiped";
    }
    const fleeEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "dungeon.team.title"))
        .setDescription((0, t_1.t)(locale, "dungeon.combat.turns_up"))
        .setColor(0x95a5a6);
    await interaction.editReply({ embeds: [fleeEmbed], components: [] });
    return "fled";
}
function buildTeamTreasureLines(locale, rewards, floor, checkpointReached, newFloor) {
    return [
        (0, t_1.t)(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        (0, t_1.t)(locale, "dungeon.team.reward_split", {
            gold: String(rewards.goldPerMember),
            exp: String(rewards.expPerMember),
        }),
        ...rewards.memberRewards.flatMap((mr) => {
            const lines = [];
            if (mr.equipDrop)
                lines.push(`<@${mr.userId}>: ${rpg_config_1.RARITY_CONFIG[mr.equipDrop.rarity].emoji} **${mr.equipDrop.name}**`);
            if (mr.starReward)
                lines.push(`<@${mr.userId}>: ${(0, t_1.t)(locale, "star_drop.found")}`);
            return lines;
        }),
        ...(checkpointReached ? ["🔖 " + (0, t_1.t)(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) })] : []),
    ];
}
async function handleTeamTreasureEncounter(interaction, locale, party) {
    const floor = party.floor;
    const rewards = await teamDungeon_service_1.default.distributeTreasureRewards(party);
    const { checkpointReached } = await teamDungeon_service_1.default.advanceFloor(party);
    await teamDungeon_service_1.default.saveParty(party);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🎁 ${(0, t_1.t)(locale, "dungeon.team.title")}`)
        .setDescription(buildTeamTreasureLines(locale, rewards, floor, checkpointReached, party.floor).join("\n"))
        .setColor(0xf1c40f);
    await interaction.editReply({ embeds: [embed], components: [] });
}
async function handleTeamTrapEncounter(interaction, locale, party) {
    const trapResult = await teamDungeon_service_1.default.resolveTeamTrap(party);
    await teamDungeon_service_1.default.saveParty(party);
    const title = `🪤 ${(0, t_1.t)(locale, "dungeon.team.title")}`;
    if (trapResult.collapsed) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription(`${(0, t_1.t)(locale, "dungeon.encounter.trap", { floor: String(party.floor) })}\n${(0, t_1.t)(locale, "dungeon.team.wipe")}`)
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [embed], components: [] });
        return true;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(title)
        .setDescription(`${(0, t_1.t)(locale, "dungeon.encounter.trap", { floor: String(party.floor) })}\n${(0, t_1.t)(locale, "dungeon.trap.damage", { hp: String(trapResult.hpLost), gold: String(trapResult.goldLost) })}`)
        .setColor(0xe67e22);
    await interaction.editReply({ embeds: [embed], components: [] });
    return false;
}
async function handleTeamNpcEncounter(interaction, locale, partyId) {
    const npcParty = await teamDungeon_service_1.default.getParty(partyId);
    if (!npcParty)
        return;
    const rewards = await teamDungeon_service_1.default.distributeTreasureRewards(npcParty);
    await teamDungeon_service_1.default.advanceFloor(npcParty);
    await teamDungeon_service_1.default.saveParty(npcParty);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🏪 ${(0, t_1.t)(locale, "dungeon.team.title")}`)
        .setDescription(`${(0, t_1.t)(locale, "dungeon.encounter.npc")}\n${(0, t_1.t)(locale, "dungeon.team.reward_split", { gold: String(rewards.goldPerMember), exp: String(rewards.expPerMember) })}`)
        .setColor(0x9b59b6);
    await interaction.editReply({ embeds: [embed], components: [] });
}
// --- Team dungeon: encounter loop ---
async function processTeamEncounter(interaction, locale, party, guildId) {
    const encounterType = teamDungeon_service_1.default.rollEncounterForTeam(party.floor);
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
async function runTeamEncounterLoop(interaction, locale, partyId, guildId) {
    for (let enc = 0; enc < rpg_config_1.ENCOUNTERS_PER_RUN; enc++) {
        const currentParty = await teamDungeon_service_1.default.getParty(partyId);
        if (!currentParty || currentParty.members.every((m) => !m.alive))
            break;
        currentParty.encountersLeft = rpg_config_1.ENCOUNTERS_PER_RUN - enc - 1;
        const shouldBreak = await processTeamEncounter(interaction, locale, currentParty, guildId);
        if (shouldBreak || currentParty.encountersLeft <= 0)
            break;
        await new Promise((r) => setTimeout(r, 2500));
    }
}
// --- Team dungeon: main handler ---
async function handleTeam(interaction, locale) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const char = await character_service_1.default.getCharacter(userId);
    if (!char) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "dungeon.require_character")).setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    const cdKey = `dungeon_cd:${userId}`;
    const remaining = await redis_1.default.ttlKey(cdKey);
    if (remaining > 0) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription(`${(0, t_1.t)(locale, "dungeon.team.cooldown")} (${(0, format_1.formatCooldown)(remaining)})`)
            .setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    if (await teamDungeon_service_1.default.isInParty(userId)) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "dungeon.team.in_party")).setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    const party = await teamDungeon_service_1.default.createParty(userId, interaction.channelId, locale);
    const started = await runTeamLobby(interaction, locale, party);
    if (!started) {
        const timeoutEmbed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "dungeon.team.lobby_timeout"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        await teamDungeon_service_1.default.cleanupParty(party);
        return;
    }
    await new Promise((r) => setTimeout(r, 1500));
    await runTeamEncounterLoop(interaction, locale, party.partyId, interaction.guildId ?? "");
    const finalParty = await teamDungeon_service_1.default.getParty(party.partyId);
    if (finalParty) {
        const resultEmbed = new discord_js_1.EmbedBuilder()
            .setTitle((0, t_1.t)(locale, "dungeon.team.title"))
            .setDescription((0, t_1.t)(locale, "dungeon.team.result", { floor: String(finalParty.floor) }))
            .setColor(0x2ecc71);
        await interaction.editReply({ embeds: [resultEmbed], components: [] });
        try {
            await Promise.allSettled(finalParty.members.map(async (member) => {
                const memberTierConfig = await premium_service_1.default.getConfig(member.userId);
                await redis_1.default.setJson(`dungeon_cd:${member.userId}`, 1, memberTierConfig.dungeonCooldownMs / 1000);
            }));
        }
        finally {
            await teamDungeon_service_1.default.cleanupParty(finalParty);
        }
    }
}
// --- Solo dungeon handler ---
async function handleSolo(interaction, locale) {
    const userId = interaction.user.id;
    // Character gate
    const char = await character_service_1.default.getCharacter(userId);
    if (!char) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "dungeon.require_character")).setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    const tierConfig = await premium_service_1.default.getConfig(userId);
    // Check cooldown (global, not per-guild)
    const cdKey = `dungeon_cd:${userId}`;
    const remaining = await redis_1.default.ttlKey(cdKey);
    if (remaining > 0) {
        let description = (0, t_1.t)(locale, "dungeon.cooldown", { time: (0, format_1.formatCooldown)(remaining) });
        const isFreeTier = tierConfig.dungeonCooldownMs === premium_config_1.TIER_CONFIG.free.dungeonCooldownMs;
        if (isFreeTier) {
            const reduced = (0, format_1.formatCooldown)(premium_config_1.TIER_CONFIG.star.dungeonCooldownMs / 1000);
            description += `\n${(0, t_1.t)(locale, "premium.cooldown_hint", { reduced })}`;
        }
        const embed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(0xed4245);
        if (isFreeTier) {
            const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
            return void reply_1.default.embedEditComponents(interaction, embed, [row]);
        }
        return void reply_1.default.embedEdit(interaction, embed);
    }
    // Check existing run
    const runKey = `dungeon_run:${userId}`;
    const existingRun = await redis_1.default.getJson(runKey);
    if (existingRun) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "dungeon.run.in_progress")).setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    // Check existing combat state
    const combatKey = `dungeon_combat:${userId}`;
    const existingCombat = await redis_1.default.getJson(combatKey);
    if (existingCombat) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "dungeon.in_combat")).setColor(0xed4245);
        return void reply_1.default.embedEdit(interaction, embed);
    }
    // Start run
    const runState = await dungeon_service_1.default.startRun(userId, locale);
    runState.encountersLeft -= 1;
    // Process first encounter
    const { embed, rows, runEnded } = await processEncounter(runState);
    // Save run state
    const reply = await interaction.editReply({ embeds: [embed], components: runEnded ? [] : rows });
    runState.messageId = reply.id;
    if (runEnded) {
        await redis_1.default.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
        await quest_service_1.default.trackProgress(userId, interaction.guildId ?? "", "dungeon").catch(() => { });
    }
    else {
        await redis_1.default.setJson(runKey, runState, exports.RUN_TTL);
        // Schedule timeouts for combat/merchant encounters
        const combatState = await redis_1.default.getJson(`dungeon_combat:${userId}`);
        const merchantState = await redis_1.default.getJson(`dungeon_merchant:${userId}`);
        if (combatState) {
            scheduleCombatTimeout(interaction, userId, locale, combatState.encounterId);
        }
        else if (merchantState) {
            scheduleMerchantTimeout(interaction, userId, locale, merchantState.encounterId);
        }
    }
}
// --- Main command ---
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.dungeon.desc"))
        .addSubcommand((sub) => sub
        .setName("solo")
        .setDescription("Explore the dungeon solo")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.dungeon.desc")))
        .addSubcommand((sub) => sub
        .setName("team")
        .setDescription("Start a team dungeon run (2-4 players)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.dungeon.team.desc"))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        const subcommand = interaction.options.getSubcommand(true);
        try {
            if (subcommand === "team") {
                await handleTeam(interaction, locale);
            }
            else {
                await interaction.deferReply();
                await handleSolo(interaction, locale);
            }
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] }).catch(() => { });
            }
            else {
                await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral }).catch(() => { });
            }
        }
    },
};
