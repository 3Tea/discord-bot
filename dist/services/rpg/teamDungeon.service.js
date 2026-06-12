"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/rpg/teamDungeon.service.ts
const node_crypto_1 = require("node:crypto");
const redis_1 = __importDefault(require("../../connector/redis"));
const character_service_1 = __importDefault(require("./character.service"));
const combat_service_1 = __importDefault(require("./combat.service"));
const equipment_service_1 = __importDefault(require("./equipment.service"));
const dungeon_service_1 = __importDefault(require("../economy/dungeon.service"));
const rpg_config_1 = require("./rpg.config");
const starDrop_1 = require("../../util/economy/starDrop");
const random_1 = require("../../util/math/random");
const prime_1 = require("../../util/math/prime");
// --- Constants ---
const TEAM_DUNGEON_TTL = 1800;
const TEAM_DUNGEON_COOLDOWN_TTL = 600;
// --- Helpers ---
function partyKey(partyId) {
    return `team_dungeon:${partyId}`;
}
function activePartyKey(userId) {
    return `team_dungeon_active:${userId}`;
}
function cooldownKey(userId) {
    return `dungeon_cd:${userId}`;
}
function teamActionKey(partyId, userId) {
    return `team_action:${partyId}:${userId}`;
}
function scaleMonsterStats(baseStats, partySize) {
    const scale = 1 + 0.5 * (partySize - 1);
    return {
        hp: Math.floor(baseStats.hp * scale),
        str: Math.floor(baseStats.str * scale),
        def: Math.floor(baseStats.def * scale),
        mag: Math.floor(baseStats.mag * scale),
        magDef: Math.floor(baseStats.magDef * scale),
        spd: Math.floor(baseStats.spd * scale),
    };
}
async function loadMemberFromCharacter(userId) {
    const char = await character_service_1.default.requireCharacter(userId);
    const stats = await character_service_1.default.getEffectiveStats(userId);
    const maxMp = character_service_1.default.getMaxMp(char.level);
    return {
        userId,
        classType: char.class,
        advancedClass: char.advancedClass ?? null,
        level: char.level,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: maxMp,
        maxMp,
        stats,
        alive: true,
        ultimateUsed: false,
    };
}
function getClassLabel(classType, advancedClass) {
    if (advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[advancedClass];
        return { name: advancedClass, emoji: advConfig.emoji };
    }
    const config = rpg_config_1.CLASS_CONFIG[classType];
    return { name: classType, emoji: config.emoji };
}
function getMpCost(action, advancedClass) {
    if (action === "skill1")
        return rpg_config_1.SKILL1_MP_COST;
    if (action === "skill2")
        return rpg_config_1.SKILL2_MP_COST;
    if (action === "ultimate" && advancedClass)
        return rpg_config_1.ADVANCED_CLASS_CONFIG[advancedClass].ultimate.mpCost;
    return 0;
}
// --- Party Management ---
async function createParty(leaderId, channelId, locale) {
    const leader = await loadMemberFromCharacter(leaderId);
    const partyId = (0, node_crypto_1.randomBytes)(8).toString("hex");
    const leaderChar = await character_service_1.default.requireCharacter(leaderId);
    const state = {
        partyId,
        leaderId,
        members: [leader],
        floor: leaderChar.dungeonDepth,
        checkpoint: leaderChar.dungeonCheckpoint,
        encountersLeft: rpg_config_1.ENCOUNTERS_PER_RUN,
        turn: 0,
        maxTurns: 5,
        actions: {},
        monster: null,
        messageId: "",
        channelId,
        locale,
        started: false,
    };
    await redis_1.default.setJson(partyKey(partyId), state, TEAM_DUNGEON_TTL);
    await redis_1.default.setJson(activePartyKey(leaderId), partyId, TEAM_DUNGEON_TTL);
    return state;
}
async function joinParty(partyId, userId) {
    const state = await getParty(partyId);
    if (!state)
        return { success: false, reason: "not_found" };
    if (state.started)
        return { success: false, reason: "already_started" };
    if (state.members.length >= 4)
        return { success: false, reason: "full" };
    if (state.members.some((m) => m.userId === userId))
        return { success: false, reason: "already_in" };
    // Check character exists
    const char = await character_service_1.default.getCharacter(userId);
    if (!char)
        return { success: false, reason: "no_character" };
    // Check cooldown
    const cd = await redis_1.default.ttlKey(cooldownKey(userId));
    if (cd > 0)
        return { success: false, reason: "cooldown" };
    // Check not in another party
    const existingParty = await redis_1.default.getJson(activePartyKey(userId));
    if (existingParty)
        return { success: false, reason: "in_party" };
    const member = await loadMemberFromCharacter(userId);
    state.members.push(member);
    await redis_1.default.setJson(partyKey(partyId), state, TEAM_DUNGEON_TTL);
    await redis_1.default.setJson(activePartyKey(userId), partyId, TEAM_DUNGEON_TTL);
    return { success: true };
}
async function getParty(partyId) {
    return redis_1.default.getJson(partyKey(partyId));
}
async function saveParty(state) {
    await redis_1.default.setJson(partyKey(state.partyId), state, TEAM_DUNGEON_TTL);
}
async function startRun(partyId) {
    const state = await getParty(partyId);
    if (!state || state.members.length < 2)
        return null;
    state.started = true;
    state.encountersLeft = rpg_config_1.ENCOUNTERS_PER_RUN;
    await saveParty(state);
    return state;
}
// --- Encounter ---
function rollEncounterForTeam(floor) {
    return dungeon_service_1.default.rollEncounterType(false);
}
function initTeamMonster(state) {
    const floor = state.floor;
    const isBoss = dungeon_service_1.default.isBossFloor(floor);
    const monster = dungeon_service_1.default.rollMonster(floor);
    const leaderLevel = state.members[0].level;
    const baseStats = isBoss ? (0, rpg_config_1.getBossStats)(floor, leaderLevel) : (0, rpg_config_1.getMonsterStats)(floor, leaderLevel);
    const scaledStats = scaleMonsterStats(baseStats, state.members.length);
    state.monster = {
        name: monster.name,
        emoji: monster.emoji,
        image: monster.image,
        hp: scaledStats.hp,
        maxHp: scaledStats.hp,
        stats: scaledStats,
        isBoss,
    };
    state.turn = 1;
    state.maxTurns = isBoss ? 7 : 5;
    state.actions = {};
}
// --- Combat: Action Submission ---
async function submitAction(partyId, userId, action) {
    const state = await getParty(partyId);
    if (!state)
        return false;
    const member = state.members.find((m) => m.userId === userId);
    if (!member || !member.alive)
        return false;
    // Validate MP
    const mpCost = getMpCost(action, member.advancedClass);
    if (action === "ultimate" && (member.ultimateUsed || member.mp < mpCost || !member.advancedClass)) {
        action = "defend";
    }
    else if ((action === "skill1" || action === "skill2") && member.mp < mpCost) {
        action = "attack";
    }
    // Store action in per-member key to avoid read-modify-write races on party state.
    await redis_1.default.setJson(teamActionKey(partyId, userId), action, TEAM_DUNGEON_TTL);
    return true;
}
async function allAliveSubmitted(state) {
    const aliveMembers = state.members.filter((m) => m.alive);
    const submittedActions = await Promise.all(aliveMembers.map((member) => redis_1.default.getJson(teamActionKey(state.partyId, member.userId))));
    return submittedActions.every((action) => action !== null);
}
async function getTurnActions(state) {
    const actions = {};
    const aliveMembers = state.members.filter((m) => m.alive);
    const values = await Promise.all(aliveMembers.map((member) => redis_1.default.getJson(teamActionKey(state.partyId, member.userId))));
    for (let i = 0; i < aliveMembers.length; i++) {
        const member = aliveMembers[i];
        actions[member.userId] = values[i] ?? "defend";
    }
    return actions;
}
async function clearTurnActions(state) {
    await Promise.all(state.members.map((member) => redis_1.default.deleteKey(teamActionKey(state.partyId, member.userId))));
}
// --- Combat: Turn Resolution ---
function resolveMemberAction(member, action, monster) {
    if (action === "defend") {
        const healed = Math.floor(member.maxHp * 0.05);
        member.hp = Math.min(member.maxHp, member.hp + healed);
        return { damage: 0, healed };
    }
    // Deduct MP
    const mpCost = getMpCost(action, member.advancedClass);
    if (mpCost > 0)
        member.mp -= mpCost;
    if (action === "ultimate")
        member.ultimateUsed = true;
    // Resolve skill
    let skill = null;
    if (action === "skill1")
        skill = rpg_config_1.CLASS_SKILLS[member.classType][0];
    if (action === "skill2")
        skill = rpg_config_1.CLASS_SKILLS[member.classType][1];
    if (action === "ultimate" && member.advancedClass) {
        skill = rpg_config_1.ADVANCED_CLASS_CONFIG[member.advancedClass].ultimate;
    }
    // Handle heal skills
    if (skill?.damageType === "heal") {
        let healed = 0;
        if (skill.healPercent) {
            healed = Math.floor(member.maxHp * skill.healPercent);
            member.hp = Math.min(member.maxHp, member.hp + healed);
        }
        let statusApplied;
        if (skill.statusEffect && skill.statusTarget === "self") {
            statusApplied = skill.statusEffect.type;
        }
        return { damage: 0, healed, statusApplied };
    }
    // Handle buff skills
    if (skill?.damageType === "buff") {
        // Priest resurrection in team = revive a downed ally (handled separately)
        return { damage: 0, healed: 0 };
    }
    // Damage calculation
    const classConfig = rpg_config_1.CLASS_CONFIG[member.classType];
    const multiplier = skill?.multiplier ?? 1;
    const ignoreDefPercent = skill?.ignoreDefPercent ?? 0;
    let damage;
    if (skill?.damageType === "magical" || (!skill && classConfig.primaryDamage === "mag")) {
        damage = combat_service_1.default.calcMagicalDamage(member.stats.mag, monster.stats.magDef, multiplier, ignoreDefPercent);
    }
    else {
        damage = combat_service_1.default.calcPhysicalDamage(member.stats.str, monster.stats.def, multiplier, ignoreDefPercent);
    }
    // Crit
    let crit = false;
    if (skill?.critChance && Math.random() < skill.critChance) {
        damage = Math.floor(damage * (skill.critMultiplier ?? 2));
        crit = true;
    }
    // Multi-hit
    if (skill?.hits && skill.hits > 1) {
        damage = damage * skill.hits;
    }
    // Apply status effect to monster
    let statusApplied;
    if (skill?.statusEffect && skill.statusTarget === "monster") {
        statusApplied = skill.statusEffect.type;
    }
    return { damage, healed: 0, statusApplied };
}
async function resolveTurn(state) {
    if (!state.monster) {
        return {
            memberActions: [],
            monsterDamagePerTarget: 0,
            monsterDefeated: false,
            teamWiped: false,
            downedThisTurn: [],
            revivedThisTurn: null,
        };
    }
    const turnActions = await getTurnActions(state);
    state.actions = turnActions;
    const monster = state.monster;
    const aliveMembers = state.members.filter((m) => m.alive);
    // Sort by SPD descending
    const sortedMembers = [...aliveMembers].sort((a, b) => b.stats.spd - a.stats.spd);
    const memberActions = [];
    let revivedThisTurn = null;
    // Process each member's action
    for (const member of sortedMembers) {
        const action = state.actions[member.userId] ?? "defend";
        // Special: Priest resurrection ultimate in team = revive downed ally
        if (action === "ultimate" && member.advancedClass === "priest") {
            const downed = state.members.filter((m) => !m.alive);
            if (downed.length > 0) {
                const target = downed[(0, random_1.randomInRange)(0, downed.length - 1)];
                target.alive = true;
                target.hp = Math.floor(target.maxHp * 0.5);
                member.mp -= rpg_config_1.ULTIMATE_MP_COST;
                member.ultimateUsed = true;
                revivedThisTurn = { userId: target.userId, healerId: member.userId };
                memberActions.push({ userId: member.userId, action: "ultimate", damage: 0, healed: 0 });
                continue;
            }
            // No downed allies — fall back to defend
        }
        const result = resolveMemberAction(member, action, monster);
        monster.hp = Math.max(0, monster.hp - result.damage);
        memberActions.push({
            userId: member.userId,
            action,
            damage: result.damage,
            healed: result.healed,
            statusApplied: result.statusApplied,
        });
    }
    // Check if monster defeated before it attacks
    if (monster.hp <= 0) {
        applyMpRegen(state);
        state.actions = {};
        await clearTurnActions(state);
        return {
            memberActions,
            monsterDamagePerTarget: 0,
            monsterDefeated: true,
            teamWiped: false,
            downedThisTurn: [],
            revivedThisTurn,
        };
    }
    // Monster attacks all alive players
    const currentAlive = state.members.filter((m) => m.alive);
    const avgDef = Math.floor(currentAlive.reduce((sum, m) => sum + m.stats.def, 0) / currentAlive.length);
    const totalMonsterDmg = Math.max(1, Math.floor(monster.stats.str * 1.5 - avgDef * 0.5));
    const perTargetDmg = Math.max(1, Math.floor(totalMonsterDmg / currentAlive.length));
    const downedThisTurn = [];
    for (const member of currentAlive) {
        const action = state.actions[member.userId] ?? "defend";
        let dmgTaken = perTargetDmg;
        // Defending members take half
        if (action === "defend") {
            dmgTaken = Math.max(1, Math.floor(dmgTaken * 0.5));
        }
        // Apply member's DEF
        dmgTaken = Math.max(1, dmgTaken - Math.floor(member.stats.def * 0.3));
        member.hp = Math.max(0, member.hp - dmgTaken);
        if (member.hp <= 0) {
            member.alive = false;
            downedThisTurn.push(member.userId);
        }
    }
    // MP regen
    applyMpRegen(state);
    // Check team wipe
    const teamWiped = state.members.every((m) => !m.alive);
    state.turn++;
    state.actions = {};
    await clearTurnActions(state);
    return {
        memberActions,
        monsterDamagePerTarget: perTargetDmg,
        monsterDefeated: false,
        teamWiped,
        downedThisTurn,
        revivedThisTurn,
    };
}
function applyMpRegen(state) {
    for (const member of state.members) {
        if (!member.alive)
            continue;
        const action = state.actions[member.userId] ?? "defend";
        const regen = rpg_config_1.MP_REGEN_PER_TURN + (action === "defend" ? rpg_config_1.MP_REGEN_ON_DEFEND : 0);
        member.mp = Math.min(member.maxMp, member.mp + regen);
    }
}
// --- Rewards ---
async function distributeRewards(state, source) {
    const floor = state.floor;
    const partySize = state.members.length;
    const isBoss = source === "boss";
    const rewards = rpg_config_1.DUNGEON_REWARDS.monster;
    const multiplier = isBoss ? rpg_config_1.DUNGEON_REWARDS.boss.rewardMultiplier : 1;
    // Gold/EXP scale with party: total = solo * (1 + 0.3 * (partySize - 1))
    const soloGold = Math.floor((rewards.goldBase + floor * rewards.goldPerFloor) * multiplier);
    const soloExp = Math.floor((rewards.expBase + floor * rewards.expPerFloor) * multiplier);
    const totalGold = Math.floor(soloGold * (1 + 0.3 * (partySize - 1)));
    const totalExp = Math.floor(soloExp * (1 + 0.3 * (partySize - 1)));
    const goldPerMember = Math.floor(totalGold / partySize);
    const expPerMember = Math.floor(totalExp / partySize);
    const memberRewards = [];
    // Individual rewards per member
    const equipChance = (isBoss ? rpg_config_1.DUNGEON_REWARDS.boss.equipChance : rewards.equipChance) / 2;
    for (const member of state.members) {
        // Gold + EXP
        await character_service_1.default.addGold(member.userId, goldPerMember);
        const levelResult = await character_service_1.default.addExp(member.userId, expPerMember);
        // Independent material rolls
        const materialDrops = equipment_service_1.default.rollMaterialDrops(floor, source);
        if (materialDrops.length > 0) {
            await character_service_1.default.addMaterials(member.userId, materialDrops);
        }
        // Independent equipment roll (halved chance)
        let equipDrop = null;
        if (Math.random() < equipChance) {
            const item = await equipment_service_1.default.createEquipmentDrop(member.userId, floor, member.classType, source);
            equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot };
        }
        // Independent crate rolls (halved chance)
        const crateDrops = [];
        const dropRates = isBoss ? rpg_config_1.CRATE_DROP_RATES.boss : rpg_config_1.CRATE_DROP_RATES.monster;
        for (const [type, chance] of Object.entries(dropRates)) {
            if (Math.random() < chance / 2) {
                crateDrops.push({ type: type, qty: 1 });
                await character_service_1.default.addCrate(member.userId, type);
            }
        }
        // Star drop
        const starReward = await (0, starDrop_1.tryStarDrop)(member.userId, 0.03, "dungeon");
        memberRewards.push({
            userId: member.userId,
            materialDrops,
            equipDrop,
            crateDrops,
            starReward,
            leveled: levelResult.leveled,
            oldLevel: levelResult.oldLevel,
            newLevel: levelResult.newLevel,
        });
    }
    return { goldPerMember, expPerMember, memberRewards };
}
async function distributeTreasureRewards(state) {
    const floor = state.floor;
    const partySize = state.members.length;
    const rewards = rpg_config_1.DUNGEON_REWARDS.treasure;
    const soloGold = rewards.goldBase + floor * rewards.goldPerFloor;
    const soloExp = rewards.expBase + floor * rewards.expPerFloor;
    const totalGold = Math.floor(soloGold * (1 + 0.3 * (partySize - 1)));
    const totalExp = Math.floor(soloExp * (1 + 0.3 * (partySize - 1)));
    const goldPerMember = Math.floor(totalGold / partySize);
    const expPerMember = Math.floor(totalExp / partySize);
    const memberRewards = [];
    for (const member of state.members) {
        await character_service_1.default.addGold(member.userId, goldPerMember);
        await character_service_1.default.addExp(member.userId, expPerMember);
        const materialDrops = equipment_service_1.default.rollMaterialDrops(floor, "treasure");
        if (materialDrops.length > 0) {
            await character_service_1.default.addMaterials(member.userId, materialDrops);
        }
        let equipDrop = null;
        if (Math.random() < rewards.equipChance / 2) {
            const item = await equipment_service_1.default.createEquipmentDrop(member.userId, floor, member.classType, "treasure");
            equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot };
        }
        const starReward = await (0, starDrop_1.tryStarDrop)(member.userId, 0.03, "dungeon");
        memberRewards.push({ userId: member.userId, materialDrops, equipDrop, starReward });
    }
    return { goldPerMember, expPerMember, memberRewards };
}
async function resolveTeamTrap(state) {
    const floor = state.floor;
    const hpLost = (0, random_1.randomInRange)(10, 20);
    const goldLoss = rpg_config_1.DUNGEON_REWARDS.trap.goldLossBase + floor * rpg_config_1.DUNGEON_REWARDS.trap.goldLossPerFloor;
    const goldPerMember = Math.floor(goldLoss / state.members.length);
    for (const member of state.members) {
        if (!member.alive)
            continue;
        member.hp = Math.max(0, member.hp - hpLost);
        if (member.hp <= 0)
            member.alive = false;
        if (goldPerMember > 0) {
            await character_service_1.default.deductGold(member.userId, goldPerMember).catch(() => { });
        }
    }
    const collapsed = state.members.every((m) => !m.alive);
    return { hpLost, goldLost: goldPerMember, collapsed };
}
// --- Floor Progression ---
async function advanceFloor(state) {
    const newFloor = state.floor + 1;
    const checkpointReached = (0, prime_1.isPrime)(newFloor);
    const newCheckpoint = checkpointReached ? newFloor : state.checkpoint;
    state.floor = newFloor;
    state.checkpoint = newCheckpoint;
    // Update all members' dungeon progress
    for (const member of state.members) {
        await character_service_1.default.updateDungeonProgress(member.userId, newFloor, newCheckpoint);
    }
    return { checkpointReached };
}
// --- Cleanup ---
async function cleanupParty(state) {
    await redis_1.default.deleteKey(partyKey(state.partyId));
    await Promise.all([
        ...state.members.map((member) => redis_1.default.deleteKey(activePartyKey(member.userId))),
        ...state.members.map((member) => redis_1.default.deleteKey(teamActionKey(state.partyId, member.userId))),
    ]);
}
async function isInParty(userId) {
    const activeId = await redis_1.default.getJson(activePartyKey(userId));
    return activeId !== null;
}
// --- Export ---
const TeamDungeonService = {
    createParty,
    joinParty,
    getParty,
    saveParty,
    startRun,
    rollEncounterForTeam,
    initTeamMonster,
    submitAction,
    allAliveSubmitted,
    resolveTurn,
    distributeRewards,
    distributeTreasureRewards,
    resolveTeamTrap,
    advanceFloor,
    cleanupParty,
    isInParty,
    getClassLabel,
    scaleMonsterStats,
    TEAM_DUNGEON_TTL,
    TEAM_DUNGEON_COOLDOWN_TTL,
};
exports.default = TeamDungeonService;
