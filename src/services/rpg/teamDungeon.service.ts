// src/services/rpg/teamDungeon.service.ts
import { randomBytes } from "node:crypto";
import redis from "../../connector/redis";
import CharacterService from "./character.service";
import CombatService from "./combat.service";
import EquipmentService from "./equipment.service";
import DungeonService from "../economy/dungeon.service";
import type { EncounterType } from "../economy/dungeon.service";
import {
    CLASS_CONFIG,
    CLASS_SKILLS,
    ADVANCED_CLASS_CONFIG,
    DUNGEON_REWARDS,
    ENCOUNTERS_PER_RUN,
    SKILL1_MP_COST,
    SKILL2_MP_COST,
    ULTIMATE_MP_COST,
    MP_REGEN_PER_TURN,
    MP_REGEN_ON_DEFEND,
    getMonsterStats,
    getBossStats,
    CRATE_DROP_RATES,
    type ClassType,
    type AdvancedClassType,
    type StatBlock,
    type MonsterStats,
    type CrateType,
} from "./rpg.config";
import { tryStarDrop } from "../../util/economy/starDrop";
import { randomInRange } from "../../util/math/random";
import { isPrime } from "../../util/math/prime";

// --- Constants ---

const TEAM_DUNGEON_TTL = 1800;
const TEAM_DUNGEON_COOLDOWN_TTL = 600;

// --- Types ---

export interface TeamMember {
    userId: string;
    classType: ClassType;
    advancedClass: AdvancedClassType | null;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    stats: StatBlock;
    alive: boolean;
    ultimateUsed: boolean;
}

export interface TeamMonsterState {
    name: string;
    emoji: string;
    hp: number;
    maxHp: number;
    stats: MonsterStats;
    isBoss: boolean;
}

export interface TeamPartyState {
    partyId: string;
    leaderId: string;
    members: TeamMember[];
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    turn: number;
    maxTurns: number;
    actions: Record<string, string>;
    monster: TeamMonsterState | null;
    messageId: string;
    channelId: string;
    locale: string;
    started: boolean;
}

export interface TeamTurnResult {
    memberActions: { userId: string; action: string; damage: number; healed: number; statusApplied?: string }[];
    monsterDamagePerTarget: number;
    monsterDefeated: boolean;
    teamWiped: boolean;
    downedThisTurn: string[];
    revivedThisTurn: { userId: string; healerId: string } | null;
}

export interface TeamRewardResult {
    goldPerMember: number;
    expPerMember: number;
    memberRewards: {
        userId: string;
        materialDrops: { key: string; qty: number }[];
        equipDrop: { name: string; rarity: string; slot: string } | null;
        crateDrops: { type: CrateType; qty: number }[];
        starReward: boolean;
        leveled: boolean;
        oldLevel: number;
        newLevel: number;
    }[];
}

export interface TeamTrapResult {
    hpLost: number;
    goldLost: number;
    collapsed: boolean;
}

export interface TeamTreasureResult {
    goldPerMember: number;
    expPerMember: number;
    memberRewards: {
        userId: string;
        materialDrops: { key: string; qty: number }[];
        equipDrop: { name: string; rarity: string; slot: string } | null;
        starReward: boolean;
    }[];
}

// --- Helpers ---

function partyKey(partyId: string): string {
    return `team_dungeon:${partyId}`;
}

function activePartyKey(userId: string): string {
    return `team_dungeon_active:${userId}`;
}

function cooldownKey(userId: string): string {
    return `dungeon_cd:${userId}`;
}

function scaleMonsterStats(baseStats: MonsterStats, partySize: number): MonsterStats {
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

async function loadMemberFromCharacter(userId: string): Promise<TeamMember> {
    const char = await CharacterService.requireCharacter(userId);
    const stats = await CharacterService.getEffectiveStats(userId);
    const maxMp = CharacterService.getMaxMp(char.level);

    return {
        userId,
        classType: char.class as ClassType,
        advancedClass: (char.advancedClass as AdvancedClassType) ?? null,
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

function getClassLabel(classType: ClassType, advancedClass: AdvancedClassType | null): { name: string; emoji: string } {
    if (advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[advancedClass];
        return { name: advancedClass, emoji: advConfig.emoji };
    }
    const config = CLASS_CONFIG[classType];
    return { name: classType, emoji: config.emoji };
}

function getMpCost(action: string, advancedClass: AdvancedClassType | null): number {
    if (action === "skill1") return SKILL1_MP_COST;
    if (action === "skill2") return SKILL2_MP_COST;
    if (action === "ultimate" && advancedClass) return ADVANCED_CLASS_CONFIG[advancedClass].ultimate.mpCost;
    return 0;
}

// --- Party Management ---

async function createParty(leaderId: string, channelId: string, locale: string): Promise<TeamPartyState> {
    const leader = await loadMemberFromCharacter(leaderId);
    const partyId = randomBytes(8).toString("hex");

    const leaderChar = await CharacterService.requireCharacter(leaderId);

    const state: TeamPartyState = {
        partyId,
        leaderId,
        members: [leader],
        floor: leaderChar.dungeonDepth,
        checkpoint: leaderChar.dungeonCheckpoint,
        encountersLeft: ENCOUNTERS_PER_RUN,
        turn: 0,
        maxTurns: 5,
        actions: {},
        monster: null,
        messageId: "",
        channelId,
        locale,
        started: false,
    };

    await redis.setJson(partyKey(partyId), state, TEAM_DUNGEON_TTL);
    await redis.setJson(activePartyKey(leaderId), partyId, TEAM_DUNGEON_TTL);

    return state;
}

async function joinParty(partyId: string, userId: string): Promise<{ success: boolean; reason?: string }> {
    const state = await getParty(partyId);
    if (!state) return { success: false, reason: "not_found" };
    if (state.started) return { success: false, reason: "already_started" };
    if (state.members.length >= 4) return { success: false, reason: "full" };
    if (state.members.some((m) => m.userId === userId)) return { success: false, reason: "already_in" };

    // Check character exists
    const char = await CharacterService.getCharacter(userId);
    if (!char) return { success: false, reason: "no_character" };

    // Check cooldown
    const cd = await redis.ttlKey(cooldownKey(userId));
    if (cd > 0) return { success: false, reason: "cooldown" };

    // Check not in another party
    const existingParty = await redis.getJson<string>(activePartyKey(userId));
    if (existingParty) return { success: false, reason: "in_party" };

    const member = await loadMemberFromCharacter(userId);
    state.members.push(member);

    await redis.setJson(partyKey(partyId), state, TEAM_DUNGEON_TTL);
    await redis.setJson(activePartyKey(userId), partyId, TEAM_DUNGEON_TTL);

    return { success: true };
}

async function getParty(partyId: string): Promise<TeamPartyState | null> {
    return redis.getJson<TeamPartyState>(partyKey(partyId));
}

async function saveParty(state: TeamPartyState): Promise<void> {
    await redis.setJson(partyKey(state.partyId), state, TEAM_DUNGEON_TTL);
}

async function startRun(partyId: string): Promise<TeamPartyState | null> {
    const state = await getParty(partyId);
    if (!state || state.members.length < 2) return null;

    state.started = true;
    state.encountersLeft = ENCOUNTERS_PER_RUN;
    await saveParty(state);
    return state;
}

// --- Encounter ---

function rollEncounterForTeam(floor: number): EncounterType {
    return DungeonService.rollEncounterType(false);
}

function initTeamMonster(state: TeamPartyState): void {
    const floor = state.floor;
    const isBoss = DungeonService.isBossFloor(floor);
    const monster = DungeonService.rollMonster(floor);
    const leaderLevel = state.members[0].level;
    const baseStats = isBoss ? getBossStats(floor, leaderLevel) : getMonsterStats(floor, leaderLevel);
    const scaledStats = scaleMonsterStats(baseStats, state.members.length);

    state.monster = {
        name: monster.name,
        emoji: monster.emoji,
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

async function submitAction(partyId: string, userId: string, action: string): Promise<boolean> {
    const state = await getParty(partyId);
    if (!state) return false;

    const member = state.members.find((m) => m.userId === userId);
    if (!member || !member.alive) return false;

    // Validate MP
    const mpCost = getMpCost(action, member.advancedClass);
    if (action === "ultimate" && (member.ultimateUsed || member.mp < mpCost || !member.advancedClass)) {
        action = "defend";
    } else if ((action === "skill1" || action === "skill2") && member.mp < mpCost) {
        action = "attack";
    }

    state.actions[userId] = action;
    await saveParty(state);
    return true;
}

function allAliveSubmitted(state: TeamPartyState): boolean {
    const aliveMembers = state.members.filter((m) => m.alive);
    return aliveMembers.every((m) => state.actions[m.userId] !== undefined);
}

// --- Combat: Turn Resolution ---

function resolveMemberAction(
    member: TeamMember,
    action: string,
    monster: TeamMonsterState
): { damage: number; healed: number; statusApplied?: string } {
    if (action === "defend") {
        const healed = Math.floor(member.maxHp * 0.05);
        member.hp = Math.min(member.maxHp, member.hp + healed);
        return { damage: 0, healed };
    }

    // Deduct MP
    const mpCost = getMpCost(action, member.advancedClass);
    if (mpCost > 0) member.mp -= mpCost;

    if (action === "ultimate") member.ultimateUsed = true;

    // Resolve skill
    let skill = null;
    if (action === "skill1") skill = CLASS_SKILLS[member.classType][0];
    if (action === "skill2") skill = CLASS_SKILLS[member.classType][1];
    if (action === "ultimate" && member.advancedClass) {
        skill = ADVANCED_CLASS_CONFIG[member.advancedClass].ultimate;
    }

    // Handle heal skills
    if (skill?.damageType === "heal") {
        let healed = 0;
        if (skill.healPercent) {
            healed = Math.floor(member.maxHp * skill.healPercent);
            member.hp = Math.min(member.maxHp, member.hp + healed);
        }
        let statusApplied: string | undefined;
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
    const classConfig = CLASS_CONFIG[member.classType];
    const multiplier = skill?.multiplier ?? 1;
    const ignoreDefPercent = skill?.ignoreDefPercent ?? 0;

    let damage: number;
    if (skill?.damageType === "magical" || (!skill && classConfig.primaryDamage === "mag")) {
        damage = CombatService.calcMagicalDamage(member.stats.mag, monster.stats.magDef, multiplier, ignoreDefPercent);
    } else {
        damage = CombatService.calcPhysicalDamage(member.stats.str, monster.stats.def, multiplier, ignoreDefPercent);
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
    let statusApplied: string | undefined;
    if (skill?.statusEffect && skill.statusTarget === "monster") {
        statusApplied = skill.statusEffect.type;
    }

    return { damage, healed: 0, statusApplied };
}

function resolveTurn(state: TeamPartyState): TeamTurnResult {
    if (!state.monster) {
        return { memberActions: [], monsterDamagePerTarget: 0, monsterDefeated: false, teamWiped: false, downedThisTurn: [], revivedThisTurn: null };
    }

    const monster = state.monster;
    const aliveMembers = state.members.filter((m) => m.alive);

    // Sort by SPD descending
    const sortedMembers = [...aliveMembers].sort((a, b) => b.stats.spd - a.stats.spd);

    const memberActions: TeamTurnResult["memberActions"] = [];
    let revivedThisTurn: TeamTurnResult["revivedThisTurn"] = null;

    // Process each member's action
    for (const member of sortedMembers) {
        const action = state.actions[member.userId] ?? "defend";

        // Special: Priest resurrection ultimate in team = revive downed ally
        if (action === "ultimate" && member.advancedClass === "priest") {
            const downed = state.members.filter((m) => !m.alive);
            if (downed.length > 0) {
                const target = downed[randomInRange(0, downed.length - 1)];
                target.alive = true;
                target.hp = Math.floor(target.maxHp * 0.5);
                member.mp -= ULTIMATE_MP_COST;
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
    const totalMonsterDmg = Math.max(1, Math.floor((monster.stats.str * 1.5) - (0)));
    const perTargetDmg = Math.max(1, Math.floor(totalMonsterDmg / currentAlive.length));

    const downedThisTurn: string[] = [];

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

    return {
        memberActions,
        monsterDamagePerTarget: perTargetDmg,
        monsterDefeated: false,
        teamWiped,
        downedThisTurn,
        revivedThisTurn,
    };
}

function applyMpRegen(state: TeamPartyState): void {
    for (const member of state.members) {
        if (!member.alive) continue;
        const action = state.actions[member.userId] ?? "defend";
        const regen = MP_REGEN_PER_TURN + (action === "defend" ? MP_REGEN_ON_DEFEND : 0);
        member.mp = Math.min(member.maxMp, member.mp + regen);
    }
}

// --- Rewards ---

async function distributeRewards(
    state: TeamPartyState,
    source: "monster" | "boss"
): Promise<TeamRewardResult> {
    const floor = state.floor;
    const partySize = state.members.length;
    const isBoss = source === "boss";
    const rewards = DUNGEON_REWARDS.monster;
    const multiplier = isBoss ? DUNGEON_REWARDS.boss.rewardMultiplier : 1;

    // Gold/EXP scale with party: total = solo * (1 + 0.3 * (partySize - 1))
    const soloGold = Math.floor((rewards.goldBase + floor * rewards.goldPerFloor) * multiplier);
    const soloExp = Math.floor((rewards.expBase + floor * rewards.expPerFloor) * multiplier);
    const totalGold = Math.floor(soloGold * (1 + 0.3 * (partySize - 1)));
    const totalExp = Math.floor(soloExp * (1 + 0.3 * (partySize - 1)));
    const goldPerMember = Math.floor(totalGold / partySize);
    const expPerMember = Math.floor(totalExp / partySize);

    const memberRewards: TeamRewardResult["memberRewards"] = [];

    // Individual rewards per member
    const equipChance = (isBoss ? DUNGEON_REWARDS.boss.equipChance : rewards.equipChance) / 2;

    for (const member of state.members) {
        // Gold + EXP
        await CharacterService.addGold(member.userId, goldPerMember);
        const levelResult = await CharacterService.addExp(member.userId, expPerMember);

        // Independent material rolls
        const materialDrops = EquipmentService.rollMaterialDrops(floor, source);
        if (materialDrops.length > 0) {
            await CharacterService.addMaterials(member.userId, materialDrops);
        }

        // Independent equipment roll (halved chance)
        let equipDrop: { name: string; rarity: string; slot: string } | null = null;
        if (Math.random() < equipChance) {
            const item = await EquipmentService.createEquipmentDrop(member.userId, floor, member.classType, source);
            equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot };
        }

        // Independent crate rolls (halved chance)
        const crateDrops: { type: CrateType; qty: number }[] = [];
        const dropRates = isBoss ? CRATE_DROP_RATES.boss : CRATE_DROP_RATES.monster;
        for (const [type, chance] of Object.entries(dropRates)) {
            if (Math.random() < chance / 2) {
                crateDrops.push({ type: type as CrateType, qty: 1 });
                await CharacterService.addCrate(member.userId, type as CrateType);
            }
        }

        // Star drop
        const starReward = await tryStarDrop(member.userId, 0.03, "dungeon");

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

async function distributeTreasureRewards(
    state: TeamPartyState
): Promise<TeamTreasureResult> {
    const floor = state.floor;
    const partySize = state.members.length;
    const rewards = DUNGEON_REWARDS.treasure;

    const soloGold = rewards.goldBase + floor * rewards.goldPerFloor;
    const soloExp = rewards.expBase + floor * rewards.expPerFloor;
    const totalGold = Math.floor(soloGold * (1 + 0.3 * (partySize - 1)));
    const totalExp = Math.floor(soloExp * (1 + 0.3 * (partySize - 1)));
    const goldPerMember = Math.floor(totalGold / partySize);
    const expPerMember = Math.floor(totalExp / partySize);

    const memberRewards: TeamTreasureResult["memberRewards"] = [];

    for (const member of state.members) {
        await CharacterService.addGold(member.userId, goldPerMember);
        await CharacterService.addExp(member.userId, expPerMember);

        const materialDrops = EquipmentService.rollMaterialDrops(floor, "treasure");
        if (materialDrops.length > 0) {
            await CharacterService.addMaterials(member.userId, materialDrops);
        }

        let equipDrop: { name: string; rarity: string; slot: string } | null = null;
        if (Math.random() < rewards.equipChance / 2) {
            const item = await EquipmentService.createEquipmentDrop(member.userId, floor, member.classType, "treasure");
            equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot };
        }

        const starReward = await tryStarDrop(member.userId, 0.03, "dungeon");

        memberRewards.push({ userId: member.userId, materialDrops, equipDrop, starReward });
    }

    return { goldPerMember, expPerMember, memberRewards };
}

async function resolveTeamTrap(state: TeamPartyState): Promise<TeamTrapResult> {
    const floor = state.floor;
    const hpLost = randomInRange(10, 20);
    const goldLoss = DUNGEON_REWARDS.trap.goldLossBase + floor * DUNGEON_REWARDS.trap.goldLossPerFloor;
    const goldPerMember = Math.floor(goldLoss / state.members.length);

    for (const member of state.members) {
        if (!member.alive) continue;
        member.hp = Math.max(0, member.hp - hpLost);
        if (member.hp <= 0) member.alive = false;

        if (goldPerMember > 0) {
            await CharacterService.deductGold(member.userId, goldPerMember).catch(() => {});
        }
    }

    const collapsed = state.members.every((m) => !m.alive);

    return { hpLost, goldLost: goldPerMember, collapsed };
}

// --- Floor Progression ---

async function advanceFloor(state: TeamPartyState): Promise<{ checkpointReached: boolean }> {
    const newFloor = state.floor + 1;
    const checkpointReached = isPrime(newFloor);
    const newCheckpoint = checkpointReached ? newFloor : state.checkpoint;

    state.floor = newFloor;
    state.checkpoint = newCheckpoint;

    // Update all members' dungeon progress
    for (const member of state.members) {
        await CharacterService.updateDungeonProgress(member.userId, newFloor, newCheckpoint);
    }

    return { checkpointReached };
}

// --- Cleanup ---

async function cleanupParty(state: TeamPartyState): Promise<void> {
    await redis.deleteKey(partyKey(state.partyId));
    for (const member of state.members) {
        await redis.deleteKey(activePartyKey(member.userId));
    }
}

async function setCooldownForAll(state: TeamPartyState, cooldownSeconds: number): Promise<void> {
    for (const member of state.members) {
        await redis.setJson(cooldownKey(member.userId), 1, cooldownSeconds);
    }
}

async function isInParty(userId: string): Promise<boolean> {
    const activeId = await redis.getJson<string>(activePartyKey(userId));
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
    setCooldownForAll,
    isInParty,
    getClassLabel,
    scaleMonsterStats,
    TEAM_DUNGEON_TTL,
    TEAM_DUNGEON_COOLDOWN_TTL,
};

export default TeamDungeonService;
