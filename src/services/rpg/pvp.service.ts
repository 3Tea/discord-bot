// src/services/rpg/pvp.service.ts
import { randomBytes } from "node:crypto";
import redis from "../../connector/redis";
import GuildMemberModel from "../../models/guildMember.model";
import CharacterService from "./character.service";
import GuildService from "./guild.service";
import CombatService, { type StatusEffect } from "./combat.service";
import {
    CLASS_CONFIG,
    CLASS_SKILLS,
    ADVANCED_CLASS_CONFIG,
    MP_REGEN_PER_TURN,
    MP_REGEN_ON_DEFEND,
    SKILL1_MP_COST,
    SKILL2_MP_COST,
    ULTIMATE_MP_COST,
    type ClassType,
    type AdvancedClassType,
    type StatBlock,
    type SkillDef,
} from "./rpg.config";

// --- Constants ---

const PVP_DAMAGE_MODIFIER = 0.6;
const PVP_MAX_TURNS = 10;
const PVP_MATCH_TTL = 600;
const PVP_COOLDOWN_TTL = 300;
const PVP_WIN_GP = 20;
const PVP_WIN_GOLD = 100;
const PVP_WIN_RATING = 25;
const PVP_LOSE_GP = 5;
const PVP_LOSE_RATING = 10;
const DEFEND_HEAL_PERCENT = 0.05;
const DEFEND_DAMAGE_REDUCTION = 0.5;

// --- Types ---

export interface PvPMatchState {
    matchId: string;
    challengerId: string;
    defenderId: string;
    challengerHp: number;
    challengerMaxHp: number;
    challengerMp: number;
    challengerMaxMp: number;
    challengerStats: StatBlock;
    challengerClass: ClassType;
    challengerAdvanced: AdvancedClassType | null;
    defenderHp: number;
    defenderMaxHp: number;
    defenderMp: number;
    defenderMaxMp: number;
    defenderStats: StatBlock;
    defenderClass: ClassType;
    defenderAdvanced: AdvancedClassType | null;
    turn: number;
    maxTurns: number;
    challengerAction: string | null;
    defenderAction: string | null;
    challengerUltimateUsed: boolean;
    defenderUltimateUsed: boolean;
    challengerEffects: StatusEffect[];
    defenderEffects: StatusEffect[];
    challengerAutoDefends: number;
    defenderAutoDefends: number;
    messageId: string;
    channelId: string;
}

export interface TurnResult {
    challengerAction: string;
    defenderAction: string;
    challengerDamageDealt: number;
    defenderDamageDealt: number;
    challengerHp: number;
    defenderHp: number;
    challengerMp: number;
    defenderMp: number;
    challengerHealed: number;
    defenderHealed: number;
    statusEffects: string[];
    matchOver: boolean;
    winnerId: string | null;
    forfeitId: string | null;
}

// --- Helpers ---

function matchKey(matchId: string): string {
    return `pvp_match:${matchId}`;
}

function cooldownKey(userId: string): string {
    return `pvp_cd:${userId}`;
}

function activeMatchKey(userId: string): string {
    return `pvp_active:${userId}`;
}

function actionKey(matchId: string, userId: string): string {
    return `pvp_action:${matchId}:${userId}`;
}

const { getEffectiveStat, tickStatusEffectsStandalone: tickStatusEffects } = CombatService;

function resolveSkill(classType: ClassType, advancedClass: AdvancedClassType | null, action: string): SkillDef | null {
    if (action === "skill1") return CLASS_SKILLS[classType][0];
    if (action === "skill2") return CLASS_SKILLS[classType][1];
    if (action === "ultimate" && advancedClass) {
        return ADVANCED_CLASS_CONFIG[advancedClass].ultimate;
    }
    return null;
}

function getMpCost(action: string, advancedClass: AdvancedClassType | null): number {
    if (action === "skill1") return SKILL1_MP_COST;
    if (action === "skill2") return SKILL2_MP_COST;
    if (action === "ultimate" && advancedClass) return ADVANCED_CLASS_CONFIG[advancedClass].ultimate.mpCost;
    return 0;
}

function calcPvPDamage(
    attackerStats: StatBlock,
    defenderStats: StatBlock,
    attackerEffects: StatusEffect[],
    defenderEffects: StatusEffect[],
    skill: SkillDef | null,
    classType: ClassType,
    isDefending: boolean
): { damage: number; statusApplied: string | null } {
    const classConfig = CLASS_CONFIG[classType];
    const multiplier = skill?.multiplier ?? 1;
    const ignoreDefPercent = skill?.ignoreDefPercent ?? 0;

    let damage: number;
    if (skill?.damageType === "magical" || (!skill && classConfig.primaryDamage === "mag")) {
        const attackerMag = attackerStats.mag;
        const defenderMagDef = getEffectiveStat(defenderStats.magDef, defenderEffects, "magDef");
        damage = CombatService.calcMagicalDamage(attackerMag, defenderMagDef, multiplier, ignoreDefPercent);
    } else {
        const attackerStr = attackerStats.str;
        const defenderDef = getEffectiveStat(defenderStats.def, defenderEffects, "def");
        damage = CombatService.calcPhysicalDamage(attackerStr, defenderDef, multiplier, ignoreDefPercent);
    }

    // Apply PvP damage modifier
    damage = Math.max(1, Math.floor(damage * PVP_DAMAGE_MODIFIER));

    // Crit chance
    if (skill?.critChance && Math.random() < skill.critChance) {
        damage = Math.floor(damage * (skill.critMultiplier ?? 2));
    }

    // Multi-hit
    if (skill?.hits && skill.hits > 1) {
        damage = damage * skill.hits;
    }

    // Defending opponent takes half damage
    if (isDefending) {
        damage = Math.max(1, Math.floor(damage * DEFEND_DAMAGE_REDUCTION));
    }

    let statusApplied: string | null = null;
    if (skill?.statusEffect && skill.statusTarget === "monster") {
        // In PvP, "monster" target means the opponent
        statusApplied = skill.statusEffect.type;
    }

    return { damage, statusApplied };
}

// --- Service Functions ---

async function createMatch(
    challengerId: string,
    defenderId: string,
    channelId: string,
    messageId: string
): Promise<PvPMatchState> {
    const [challengerChar, defenderChar] = await Promise.all([
        CharacterService.requireCharacter(challengerId),
        CharacterService.requireCharacter(defenderId),
    ]);

    const [challengerStats, defenderStats] = await Promise.all([
        CharacterService.getEffectiveStats(challengerId),
        CharacterService.getEffectiveStats(defenderId),
    ]);

    const challengerMaxMp = CharacterService.getMaxMp(challengerChar.level);
    const defenderMaxMp = CharacterService.getMaxMp(defenderChar.level);

    const matchId = randomBytes(8).toString("hex");

    const state: PvPMatchState = {
        matchId,
        challengerId,
        defenderId,
        challengerHp: challengerStats.hp,
        challengerMaxHp: challengerStats.hp,
        challengerMp: challengerMaxMp,
        challengerMaxMp,
        challengerStats,
        challengerClass: challengerChar.class as ClassType,
        challengerAdvanced: (challengerChar.advancedClass as AdvancedClassType) ?? null,
        defenderHp: defenderStats.hp,
        defenderMaxHp: defenderStats.hp,
        defenderMp: defenderMaxMp,
        defenderMaxMp,
        defenderStats,
        defenderClass: defenderChar.class as ClassType,
        defenderAdvanced: (defenderChar.advancedClass as AdvancedClassType) ?? null,
        turn: 1,
        maxTurns: PVP_MAX_TURNS,
        challengerAction: null,
        defenderAction: null,
        challengerUltimateUsed: false,
        defenderUltimateUsed: false,
        challengerEffects: [],
        defenderEffects: [],
        challengerAutoDefends: 0,
        defenderAutoDefends: 0,
        messageId,
        channelId,
    };

    await redis.setJson(matchKey(matchId), state, PVP_MATCH_TTL);
    await redis.setJson(activeMatchKey(challengerId), matchId, PVP_MATCH_TTL);
    await redis.setJson(activeMatchKey(defenderId), matchId, PVP_MATCH_TTL);

    return state;
}

async function getMatch(matchId: string): Promise<PvPMatchState | null> {
    return redis.getJson<PvPMatchState>(matchKey(matchId));
}

async function submitAction(matchId: string, userId: string, action: string): Promise<boolean> {
    const state = await getMatch(matchId);
    if (!state) return false;

    if (userId !== state.challengerId && userId !== state.defenderId) return false;

    // Store action in a separate per-player key to avoid read-modify-write race
    await redis.setJson(actionKey(matchId, userId), action, PVP_MATCH_TTL);
    return true;
}

async function bothSubmitted(matchId: string): Promise<boolean> {
    const state = await getMatch(matchId);
    if (!state) return false;

    const [a1, a2] = await Promise.all([
        redis.getJson<string>(actionKey(matchId, state.challengerId)),
        redis.getJson<string>(actionKey(matchId, state.defenderId)),
    ]);
    return a1 !== null && a2 !== null;
}

interface PlayerView {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    stats: StatBlock;
    classType: ClassType;
    advancedClass: AdvancedClassType | null;
    effects: StatusEffect[];
    ultimateUsed: boolean;
    action: string | null;
}

function getPlayerView(state: PvPMatchState, role: "challenger" | "defender"): PlayerView {
    if (role === "challenger") {
        return {
            hp: state.challengerHp,
            maxHp: state.challengerMaxHp,
            mp: state.challengerMp,
            maxMp: state.challengerMaxMp,
            stats: state.challengerStats,
            classType: state.challengerClass,
            advancedClass: state.challengerAdvanced,
            effects: state.challengerEffects,
            ultimateUsed: state.challengerUltimateUsed,
            action: state.challengerAction,
        };
    }
    return {
        hp: state.defenderHp,
        maxHp: state.defenderMaxHp,
        mp: state.defenderMp,
        maxMp: state.defenderMaxMp,
        stats: state.defenderStats,
        classType: state.defenderClass,
        advancedClass: state.defenderAdvanced,
        effects: state.defenderEffects,
        ultimateUsed: state.defenderUltimateUsed,
        action: state.defenderAction,
    };
}

function writeBackPlayer(state: PvPMatchState, role: "challenger" | "defender", view: PlayerView): void {
    if (role === "challenger") {
        state.challengerHp = view.hp;
        state.challengerMp = view.mp;
        state.challengerUltimateUsed = view.ultimateUsed;
        state.challengerEffects = view.effects;
    } else {
        state.defenderHp = view.hp;
        state.defenderMp = view.mp;
        state.defenderUltimateUsed = view.ultimateUsed;
        state.defenderEffects = view.effects;
    }
}

function applyActionEffects(
    state: PvPMatchState,
    attackerRole: "challenger" | "defender",
    defenderRole: "challenger" | "defender",
    action: string
): { damage: number; healed: number; statusEffects: string[] } {
    const attacker = getPlayerView(state, attackerRole);
    const defender = getPlayerView(state, defenderRole);

    const effects: string[] = [];
    let damage = 0;
    let healed = 0;

    if (action === "defend") {
        healed = Math.floor(attacker.maxHp * DEFEND_HEAL_PERCENT);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
        writeBackPlayer(state, attackerRole, attacker);
        return { damage: 0, healed, statusEffects: effects };
    }

    // Check MP cost
    const mpCost = getMpCost(action, attacker.advancedClass);
    if (mpCost > attacker.mp) {
        action = "attack";
    } else if (mpCost > 0) {
        attacker.mp -= mpCost;
    }

    if (action === "ultimate") {
        attacker.ultimateUsed = true;
    }

    const skill = resolveSkill(attacker.classType, attacker.advancedClass, action);

    // Handle heal skills
    if (skill?.damageType === "heal") {
        if (skill.healPercent) {
            healed = Math.floor(attacker.maxHp * skill.healPercent);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
        }
        if (skill.statusEffect && skill.statusTarget === "self") {
            attacker.effects.push({
                type: skill.statusEffect.type,
                value: skill.statusEffect.value,
                turnsLeft: skill.statusEffect.turns,
            });
            effects.push(skill.statusEffect.type);
        }
        writeBackPlayer(state, attackerRole, attacker);
        return { damage: 0, healed, statusEffects: effects };
    }

    // Handle buff skills
    if (skill?.damageType === "buff") {
        if (skill.statusEffect && skill.statusTarget === "self") {
            attacker.effects.push({
                type: skill.statusEffect.type,
                value: skill.statusEffect.value,
                turnsLeft: skill.statusEffect.turns,
            });
            effects.push(skill.statusEffect.type);
        }
        writeBackPlayer(state, attackerRole, attacker);
        return { damage: 0, healed: 0, statusEffects: effects };
    }

    // Damage calculation
    const isDefending = defender.action === "defend";
    const { damage: dmg, statusApplied } = calcPvPDamage(
        attacker.stats,
        defender.stats,
        attacker.effects,
        defender.effects,
        skill,
        attacker.classType,
        isDefending
    );

    damage = dmg;
    defender.hp = Math.max(0, defender.hp - damage);

    // Apply status effect to opponent
    if (statusApplied && skill?.statusEffect) {
        defender.effects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        effects.push(statusApplied);
    }

    // Self-targeting status effect
    if (skill?.statusEffect && skill.statusTarget === "self") {
        attacker.effects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        effects.push(skill.statusEffect.type);
    }

    writeBackPlayer(state, attackerRole, attacker);
    writeBackPlayer(state, defenderRole, defender);
    return { damage, healed, statusEffects: effects };
}

async function resolveTurn(matchId: string): Promise<TurnResult> {
    const state = await getMatch(matchId);
    if (!state) {
        throw new Error("Match not found");
    }

    // Read actions from separate per-player keys, then clean up
    const [challengerRaw, defenderRaw] = await Promise.all([
        redis.getJson<string>(actionKey(matchId, state.challengerId)),
        redis.getJson<string>(actionKey(matchId, state.defenderId)),
    ]);

    const cAction = challengerRaw ?? "defend";
    const dAction = defenderRaw ?? "defend";

    // Write actions back onto state for applyActionEffects to read
    state.challengerAction = challengerRaw;
    state.defenderAction = defenderRaw;

    // Delete per-player action keys
    await Promise.all([
        redis.deleteKey(actionKey(matchId, state.challengerId)),
        redis.deleteKey(actionKey(matchId, state.defenderId)),
    ]);

    // Track auto-defends for forfeit detection
    if (challengerRaw === null) {
        state.challengerAutoDefends++;
    } else {
        state.challengerAutoDefends = 0;
    }
    if (defenderRaw === null) {
        state.defenderAutoDefends++;
    } else {
        state.defenderAutoDefends = 0;
    }

    // Check forfeit (3 consecutive auto-defends)
    let forfeitId: string | null = null;
    if (state.challengerAutoDefends >= 3) {
        forfeitId = state.challengerId;
    } else if (state.defenderAutoDefends >= 3) {
        forfeitId = state.defenderId;
    }

    if (forfeitId) {
        const winnerId = forfeitId === state.challengerId ? state.defenderId : state.challengerId;
        return {
            challengerAction: cAction,
            defenderAction: dAction,
            challengerDamageDealt: 0,
            defenderDamageDealt: 0,
            challengerHp: state.challengerHp,
            defenderHp: state.defenderHp,
            challengerMp: state.challengerMp,
            defenderMp: state.defenderMp,
            challengerHealed: 0,
            defenderHealed: 0,
            statusEffects: [],
            matchOver: true,
            winnerId,
            forfeitId,
        };
    }

    // Determine speed order
    const challengerSpd = getEffectiveStat(state.challengerStats.spd, state.challengerEffects, "spd");
    const defenderSpd = getEffectiveStat(state.defenderStats.spd, state.defenderEffects, "spd");

    const allEffects: string[] = [];
    let challengerDamageDealt = 0;
    let defenderDamageDealt = 0;
    let challengerHealed = 0;
    let defenderHealed = 0;

    if (challengerSpd >= defenderSpd) {
        // Challenger goes first
        const cResult = applyActionEffects(state, "challenger", "defender", cAction);
        challengerDamageDealt = cResult.damage;
        challengerHealed = cResult.healed;
        allEffects.push(...cResult.statusEffects);

        const dResult = applyActionEffects(state, "defender", "challenger", dAction);
        defenderDamageDealt = dResult.damage;
        defenderHealed = dResult.healed;
        allEffects.push(...dResult.statusEffects);
    } else {
        // Defender goes first
        const dResult = applyActionEffects(state, "defender", "challenger", dAction);
        defenderDamageDealt = dResult.damage;
        defenderHealed = dResult.healed;
        allEffects.push(...dResult.statusEffects);

        const cResult = applyActionEffects(state, "challenger", "defender", cAction);
        challengerDamageDealt = cResult.damage;
        challengerHealed = cResult.healed;
        allEffects.push(...cResult.statusEffects);
    }

    // Tick status effects on both
    const cTick = tickStatusEffects(state.challengerEffects, state.challengerHp, state.challengerMaxHp);
    state.challengerEffects = cTick.effects;
    state.challengerHp = cTick.hp;

    const dTick = tickStatusEffects(state.defenderEffects, state.defenderHp, state.defenderMaxHp);
    state.defenderEffects = dTick.effects;
    state.defenderHp = dTick.hp;

    // MP regen
    const cMpRegen = MP_REGEN_PER_TURN + (cAction === "defend" ? MP_REGEN_ON_DEFEND : 0);
    state.challengerMp = Math.min(state.challengerMaxMp, state.challengerMp + cMpRegen);

    const dMpRegen = MP_REGEN_PER_TURN + (dAction === "defend" ? MP_REGEN_ON_DEFEND : 0);
    state.defenderMp = Math.min(state.defenderMaxMp, state.defenderMp + dMpRegen);

    // Check match end
    let matchOver = false;
    let winnerId: string | null = null;

    if (state.challengerHp <= 0 && state.defenderHp <= 0) {
        matchOver = true;
        // Higher SPD wins on simultaneous death
        winnerId = challengerSpd >= defenderSpd ? state.challengerId : state.defenderId;
    } else if (state.challengerHp <= 0) {
        matchOver = true;
        winnerId = state.defenderId;
    } else if (state.defenderHp <= 0) {
        matchOver = true;
        winnerId = state.challengerId;
    } else if (state.turn >= state.maxTurns) {
        matchOver = true;
        // Higher HP% wins
        const cPercent = state.challengerHp / state.challengerMaxHp;
        const dPercent = state.defenderHp / state.defenderMaxHp;
        if (cPercent > dPercent) {
            winnerId = state.challengerId;
        } else if (dPercent > cPercent) {
            winnerId = state.defenderId;
        }
        // null winnerId = draw
    }

    // Reset actions for next turn
    state.challengerAction = null;
    state.defenderAction = null;
    state.turn++;

    if (matchOver) {
        await redis.deleteKey(matchKey(matchId));
        await redis.deleteKey(activeMatchKey(state.challengerId));
        await redis.deleteKey(activeMatchKey(state.defenderId));
    } else {
        await redis.setJson(matchKey(matchId), state, PVP_MATCH_TTL);
    }

    return {
        challengerAction: cAction,
        defenderAction: dAction,
        challengerDamageDealt,
        defenderDamageDealt,
        challengerHp: state.challengerHp,
        defenderHp: state.defenderHp,
        challengerMp: state.challengerMp,
        defenderMp: state.defenderMp,
        challengerHealed,
        defenderHealed,
        statusEffects: allEffects,
        matchOver,
        winnerId,
        forfeitId: null,
    };
}

async function endMatch(matchId: string, winnerId: string, loserId: string): Promise<void> {
    // Distribute rewards
    await Promise.all([
        CharacterService.addGold(winnerId, PVP_WIN_GOLD).catch(() => {}),
        GuildService.addGP(winnerId, PVP_WIN_GP).catch(() => {}),
        GuildService.addGP(loserId, PVP_LOSE_GP).catch(() => {}),
    ]);

    // Update PvP stats atomically
    await Promise.all([
        GuildMemberModel.updateOne({ userId: winnerId }, { $inc: { pvpWins: 1, pvpRating: PVP_WIN_RATING } }),
        // Use aggregation pipeline update for atomic clamp-to-zero
        GuildMemberModel.updateOne({ userId: loserId }, [
            {
                $set: {
                    pvpLosses: { $add: ["$pvpLosses", 1] },
                    pvpRating: { $max: [0, { $subtract: ["$pvpRating", PVP_LOSE_RATING] }] },
                },
            },
        ]),
    ]);

    // Clear caches
    await Promise.all([redis.deleteKey(`guild_member:${winnerId}`), redis.deleteKey(`guild_member:${loserId}`)]);
}

async function endMatchDraw(challengerId: string, defenderId: string): Promise<void> {
    // Both get participation GP
    await Promise.all([
        GuildService.addGP(challengerId, PVP_LOSE_GP).catch(() => {}),
        GuildService.addGP(defenderId, PVP_LOSE_GP).catch(() => {}),
    ]);
}

async function checkCooldown(userId: string): Promise<number> {
    return redis.ttlKey(cooldownKey(userId));
}

async function setCooldown(userId: string): Promise<void> {
    await redis.setJson(cooldownKey(userId), 1, PVP_COOLDOWN_TTL);
}

async function isInMatch(userId: string): Promise<boolean> {
    const activeId = await redis.getJson<string>(activeMatchKey(userId));
    return activeId !== null;
}

async function cleanupMatch(matchId: string, challengerId: string, defenderId: string): Promise<void> {
    await Promise.all([
        redis.deleteKey(matchKey(matchId)),
        redis.deleteKey(activeMatchKey(challengerId)),
        redis.deleteKey(activeMatchKey(defenderId)),
        redis.deleteKey(actionKey(matchId, challengerId)),
        redis.deleteKey(actionKey(matchId, defenderId)),
    ]);
}

function getActionLabel(
    action: string,
    classType: ClassType,
    advancedClass: AdvancedClassType | null
): { key: string; emoji: string } {
    if (action === "attack") return { key: "attack", emoji: "⚔️" };
    if (action === "defend") return { key: "defend", emoji: "🛡️" };
    if (action === "skill1") {
        const skill = CLASS_SKILLS[classType][0];
        return { key: skill.key, emoji: skill.emoji };
    }
    if (action === "skill2") {
        const skill = CLASS_SKILLS[classType][1];
        return { key: skill.key, emoji: skill.emoji };
    }
    if (action === "ultimate" && advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[advancedClass];
        return { key: advConfig.ultimate.key, emoji: advConfig.ultimate.emoji };
    }
    return { key: "attack", emoji: "⚔️" };
}

function getClassLabel(classType: ClassType, advancedClass: AdvancedClassType | null): { name: string; emoji: string } {
    if (advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[advancedClass];
        return { name: advancedClass, emoji: advConfig.emoji };
    }
    const config = CLASS_CONFIG[classType];
    return { name: classType, emoji: config.emoji };
}

const PvPService = {
    createMatch,
    getMatch,
    submitAction,
    bothSubmitted,
    resolveTurn,
    endMatch,
    endMatchDraw,
    checkCooldown,
    setCooldown,
    isInMatch,
    cleanupMatch,
    getActionLabel,
    getClassLabel,
    PVP_MAX_TURNS,
    PVP_WIN_GP,
    PVP_WIN_GOLD,
    PVP_LOSE_GP,
    SKILL1_MP_COST,
    SKILL2_MP_COST,
    ULTIMATE_MP_COST,
};

export default PvPService;
