"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/rpg/combat.service.ts
const rpg_config_1 = require("./rpg.config");
function initCombat({ userId, classType, advancedClass, userStats, userHp, maxHp, userMp, maxMp, monster, isBoss, }) {
    const maxTurns = isBoss ? rpg_config_1.BOSS_TURNS : rpg_config_1.NORMAL_TURNS;
    const turnOrder = userStats.spd >= monster.stats.spd ? "user_first" : "monster_first";
    const advClass = advancedClass ?? null;
    return {
        userId,
        classType,
        advancedClass: advClass,
        isBoss,
        monsterName: monster.name,
        monsterEmoji: monster.emoji,
        user: {
            hp: userHp,
            maxHp,
            mp: userMp,
            maxMp,
            stats: { ...userStats },
            statusEffects: [],
        },
        monster: {
            hp: monster.stats.hp,
            maxHp: monster.stats.hp,
            mp: 0,
            maxMp: 0,
            stats: {
                hp: monster.stats.hp,
                str: monster.stats.str,
                def: monster.stats.def,
                mag: monster.stats.mag,
                magDef: monster.stats.magDef,
                spd: monster.stats.spd,
            },
            statusEffects: [],
        },
        turnsLeft: maxTurns,
        turnOrder,
        ultimateUsed: false,
        resurrectionReady: advClass === "priest",
        stoneWallActive: false,
        divineShieldActive: false,
    };
}
// --- Damage Calculation ---
function calcPhysicalDamage(attackerStr, defenderDef, multiplier, ignoreDefPercent = 0) {
    const effectiveDef = defenderDef * (1 - ignoreDefPercent);
    const raw = attackerStr * 1.5 * multiplier - effectiveDef * 0.5;
    return Math.max(1, Math.floor(raw));
}
function calcMagicalDamage(attackerMag, defenderMagDef, multiplier, ignoreDefPercent = 0) {
    const effectiveMagDef = defenderMagDef * (1 - ignoreDefPercent);
    const raw = attackerMag * 1.5 * multiplier - effectiveMagDef * 0.5;
    return Math.max(1, Math.floor(raw));
}
function getEffectiveStat(base, effects, statType) {
    let value = base;
    for (const effect of effects) {
        if (effect.type === "def_buff" && (statType === "def" || statType === "magDef")) {
            value = Math.floor(value * (1 + effect.value));
        }
        if (effect.type === "spd_debuff" && statType === "spd") {
            value = Math.floor(value * (1 - effect.value));
        }
    }
    return value;
}
function monsterAttack(state) {
    const monsterStr = state.monster.stats.str;
    const userDef = getEffectiveStat(state.user.stats.def, state.user.statusEffects, "def");
    const raw = Math.max(1, Math.floor(monsterStr * 1.5 - userDef * 0.5));
    if (state.divineShieldActive) {
        state.divineShieldActive = false;
        return { damage: 0, reflected: 0, blocked: true };
    }
    if (state.stoneWallActive) {
        state.stoneWallActive = false;
        state.monster.hp = Math.max(0, state.monster.hp - raw);
        return { damage: 0, reflected: raw, blocked: false };
    }
    return { damage: raw, reflected: 0, blocked: false };
}
// --- Tick Status Effects ---
function tickStatusEffects(combatant) {
    let poisonDmg = 0;
    for (const effect of combatant.statusEffects) {
        if (effect.type === "poison") {
            poisonDmg = Math.floor(combatant.maxHp * effect.value);
            combatant.hp = Math.max(0, combatant.hp - poisonDmg);
        }
        effect.turnsLeft--;
    }
    combatant.statusEffects = combatant.statusEffects.filter((e) => e.turnsLeft > 0);
    return poisonDmg;
}
/** Standalone version for PvP/team contexts where effects, hp, and maxHp are separate values. */
function tickStatusEffectsStandalone(effects, hp, maxHp) {
    let poisonDmg = 0;
    for (const effect of effects) {
        if (effect.type === "poison") {
            poisonDmg = Math.floor(maxHp * effect.value);
            hp = Math.max(0, hp - poisonDmg);
        }
        effect.turnsLeft--;
    }
    const remaining = effects.filter((e) => e.turnsLeft > 0);
    return { effects: remaining, poisonDmg, hp };
}
// --- MP helpers ---
function resolveMpCost(action) {
    if (action === "skill1")
        return rpg_config_1.SKILL1_MP_COST;
    if (action === "skill2")
        return rpg_config_1.SKILL2_MP_COST;
    return 0;
}
function regenMp(user, action) {
    const regen = rpg_config_1.MP_REGEN_PER_TURN + (action === "defend" ? rpg_config_1.MP_REGEN_ON_DEFEND : 0);
    user.mp = Math.min(user.maxMp, user.mp + regen);
    return regen;
}
// --- Action branch: Defend ---
function checkResurrection(state) {
    if (state.user.hp <= 0 && state.resurrectionReady) {
        state.resurrectionReady = false;
        state.user.hp = Math.floor(state.user.maxHp * 0.5);
        return true;
    }
    return false;
}
function executeDefend(state, mpCost) {
    const healAmount = Math.floor(state.user.maxHp * 0.05);
    state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
    const mAtk = monsterAttack(state);
    const monsterDmg = mAtk.damage > 0 ? Math.max(1, Math.floor(mAtk.damage * 0.5)) : 0;
    state.user.hp = Math.max(0, state.user.hp - monsterDmg);
    const resurrectionTriggered = checkResurrection(state);
    state.turnsLeft--;
    const monsterPoisonDmg = tickStatusEffects(state.monster);
    const userPoisonDmg = tickStatusEffects(state.user);
    const mpRegen = regenMp(state.user, "defend");
    return {
        userDamage: 0,
        monsterDamage: monsterDmg,
        userHp: state.user.hp,
        monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: state.monster.hp <= 0,
        lost: state.user.hp <= 0,
        fled: false,
        turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
        healAmount,
        poisonDamage: monsterPoisonDmg + userPoisonDmg,
        mpCost,
        mpRegen,
        currentMp: state.user.mp,
        insufficientMp: false,
        resurrectionTriggered: resurrectionTriggered || undefined,
        stoneWallReflect: mAtk.reflected || undefined,
        divineShieldBlocked: mAtk.blocked || undefined,
    };
}
// --- Action branch: Heal skill ---
function executeHealSkill(state, skill, action, mpCost) {
    let healAmount = 0;
    let statusApplied;
    if (skill.healPercent) {
        healAmount = Math.floor(state.user.maxHp * skill.healPercent);
        state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
    }
    if (skill.statusEffect && skill.statusTarget === "self") {
        state.user.statusEffects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        statusApplied = skill.statusEffect.type;
    }
    const mAtk = monsterAttack(state);
    state.user.hp = Math.max(0, state.user.hp - mAtk.damage);
    const resurrectionTriggered = checkResurrection(state);
    state.turnsLeft--;
    tickStatusEffects(state.monster);
    tickStatusEffects(state.user);
    const mpRegen = regenMp(state.user, action);
    return {
        userDamage: 0,
        monsterDamage: mAtk.damage,
        userHp: state.user.hp,
        monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: state.monster.hp <= 0,
        lost: state.user.hp <= 0,
        fled: false,
        turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
        healAmount,
        statusApplied,
        mpCost,
        mpRegen,
        currentMp: state.user.mp,
        insufficientMp: false,
        resurrectionTriggered: resurrectionTriggered || undefined,
        stoneWallReflect: mAtk.reflected || undefined,
        divineShieldBlocked: mAtk.blocked || undefined,
    };
}
// --- Single-hit damage calculation ---
function calcHitDamage(state, skill, monsterDef, monsterMagDef) {
    const classConfig = rpg_config_1.CLASS_CONFIG[state.classType];
    const multiplier = skill?.multiplier ?? 1;
    const ignoreDefPercent = skill?.ignoreDefPercent ?? 0;
    let dmg;
    if (skill?.damageType === "magical" || (!skill && classConfig.primaryDamage === "mag")) {
        dmg = calcMagicalDamage(state.user.stats.mag, monsterMagDef, multiplier, ignoreDefPercent);
    }
    else {
        dmg = calcPhysicalDamage(state.user.stats.str, monsterDef, multiplier, ignoreDefPercent);
    }
    let crit = false;
    if (skill?.critChance && Math.random() < skill.critChance) {
        dmg = Math.floor(dmg * (skill.critMultiplier ?? 2));
        crit = true;
    }
    return { dmg, crit };
}
// --- Action branch: Damage (attack / damage skills) ---
function executeDamageAction(state, skill, action, mpCost) {
    const hits = skill?.hits ?? 1;
    const monsterDef = getEffectiveStat(state.monster.stats.def, state.monster.statusEffects, "def");
    const monsterMagDef = getEffectiveStat(state.monster.stats.magDef, state.monster.statusEffects, "magDef");
    let userDamage = 0;
    let critHit = false;
    for (let h = 0; h < hits; h++) {
        const { dmg, crit } = calcHitDamage(state, skill, monsterDef, monsterMagDef);
        if (crit)
            critHit = true;
        userDamage += dmg;
        state.monster.hp = Math.max(0, state.monster.hp - dmg);
    }
    let statusApplied;
    if (skill?.statusEffect) {
        const target = skill.statusTarget === "self" ? state.user : state.monster;
        target.statusEffects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        statusApplied = skill.statusEffect.type;
    }
    let monsterDmg = 0;
    let stoneWallReflect;
    let divineShieldBlocked;
    if (state.monster.hp > 0) {
        const mAtk = monsterAttack(state);
        monsterDmg = mAtk.damage;
        state.user.hp = Math.max(0, state.user.hp - mAtk.damage);
        if (mAtk.reflected)
            stoneWallReflect = mAtk.reflected;
        if (mAtk.blocked)
            divineShieldBlocked = true;
    }
    const resurrectionTriggered = checkResurrection(state);
    state.turnsLeft--;
    const monsterPoisonDmg = tickStatusEffects(state.monster);
    tickStatusEffects(state.user);
    const mpRegen = regenMp(state.user, action);
    return {
        userDamage,
        monsterDamage: monsterDmg,
        userHp: state.user.hp,
        monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: state.monster.hp <= 0,
        lost: state.user.hp <= 0,
        fled: false,
        turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
        critHit,
        statusApplied,
        poisonDamage: monsterPoisonDmg,
        mpCost,
        mpRegen,
        currentMp: state.user.mp,
        insufficientMp: false,
        resurrectionTriggered: resurrectionTriggered || undefined,
        stoneWallReflect,
        divineShieldBlocked,
    };
}
// --- Action branch: Ultimate skill ---
function executeUltimateHeadshot(state, skill) {
    const monsterDef = getEffectiveStat(state.monster.stats.def, state.monster.statusEffects, "def");
    const { dmg } = calcHitDamage(state, skill, monsterDef, state.monster.stats.magDef);
    let instantKill = false;
    const hpRatio = state.monster.hp / state.monster.maxHp;
    if (hpRatio < 0.3 && Math.random() < 0.5) {
        state.monster.hp = 0;
        instantKill = true;
    }
    else {
        state.monster.hp = Math.max(0, state.monster.hp - dmg);
    }
    return buildUltimateResult(state, instantKill ? state.monster.maxHp : dmg, skill.mpCost, { instantKill });
}
function executeUltimateSoulBurn(state, skill) {
    const selfDamage = Math.floor(state.user.hp * 0.2);
    state.user.hp = Math.max(1, state.user.hp - selfDamage);
    const monsterMagDef = getEffectiveStat(state.monster.stats.magDef, state.monster.statusEffects, "magDef");
    const { dmg } = calcHitDamage(state, skill, state.monster.stats.def, monsterMagDef);
    state.monster.hp = Math.max(0, state.monster.hp - dmg);
    return buildUltimateResult(state, dmg, skill.mpCost, { selfDamage });
}
function executeUltimateBloodFrenzy(state, skill) {
    const monsterDef = getEffectiveStat(state.monster.stats.def, state.monster.statusEffects, "def");
    const { dmg } = calcHitDamage(state, skill, monsterDef, state.monster.stats.magDef);
    state.monster.hp = Math.max(0, state.monster.hp - dmg);
    const healAmount = Math.floor(dmg * 0.3);
    state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
    return buildUltimateResult(state, dmg, skill.mpCost, { healAmount });
}
function applyUltimateBuff(state) {
    if (state.advancedClass === "fortress")
        state.stoneWallActive = true;
}
function applyUltimateHeal(state, skill) {
    let healAmount;
    if (skill.healPercent) {
        healAmount = Math.floor(state.user.maxHp * skill.healPercent);
        state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
    }
    if (state.advancedClass === "paladin")
        state.divineShieldActive = true;
    return healAmount;
}
function applyUltimateDamage(state, skill) {
    const hits = skill.hits ?? 1;
    const monsterDef = getEffectiveStat(state.monster.stats.def, state.monster.statusEffects, "def");
    const monsterMagDef = getEffectiveStat(state.monster.stats.magDef, state.monster.statusEffects, "magDef");
    let damage = 0;
    for (let h = 0; h < hits; h++) {
        const { dmg } = calcHitDamage(state, skill, monsterDef, monsterMagDef);
        damage += dmg;
        state.monster.hp = Math.max(0, state.monster.hp - dmg);
    }
    let healAmount;
    if (skill.healPercent) {
        healAmount = Math.floor(state.user.maxHp * skill.healPercent);
        state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
    }
    return { damage, healAmount };
}
function applyUltimateStatus(state, skill) {
    let statusApplied;
    if (skill.statusEffect) {
        const target = skill.statusTarget === "self" ? state.user : state.monster;
        target.statusEffects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        statusApplied = skill.statusEffect.type;
    }
    if (state.advancedClass === "shadow") {
        state.monster.statusEffects.push({ type: "spd_debuff", value: 0.5, turnsLeft: 3 });
        statusApplied = statusApplied ?? "spd_debuff";
    }
    return statusApplied;
}
function executeUltimateGeneric(state, skill) {
    let userDamage = 0;
    let healAmount;
    if (skill.damageType === "buff") {
        applyUltimateBuff(state);
    }
    else if (skill.damageType === "heal") {
        healAmount = applyUltimateHeal(state, skill);
    }
    else {
        const result = applyUltimateDamage(state, skill);
        userDamage = result.damage;
        healAmount = result.healAmount;
    }
    const statusApplied = applyUltimateStatus(state, skill);
    return buildUltimateResult(state, userDamage, skill.mpCost, { healAmount, statusApplied });
}
function buildUltimateResult(state, userDamage, mpCost, extra = {}) {
    let monsterDmg = 0;
    let stoneWallReflect;
    let divineShieldBlocked;
    if (state.monster.hp > 0) {
        const mAtk = monsterAttack(state);
        monsterDmg = mAtk.damage;
        state.user.hp = Math.max(0, state.user.hp - mAtk.damage);
        if (mAtk.reflected)
            stoneWallReflect = mAtk.reflected;
        if (mAtk.blocked)
            divineShieldBlocked = true;
    }
    const resurrectionTriggered = checkResurrection(state);
    state.turnsLeft--;
    const monsterPoisonDmg = tickStatusEffects(state.monster);
    tickStatusEffects(state.user);
    const mpRegen = regenMp(state.user, "ultimate");
    return {
        userDamage,
        monsterDamage: monsterDmg,
        userHp: state.user.hp,
        monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: state.monster.hp <= 0,
        lost: state.user.hp <= 0,
        fled: false,
        turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
        healAmount: extra.healAmount,
        statusApplied: extra.statusApplied,
        poisonDamage: monsterPoisonDmg || undefined,
        mpCost,
        mpRegen,
        currentMp: state.user.mp,
        insufficientMp: false,
        ultimateUsed: true,
        resurrectionTriggered: resurrectionTriggered || undefined,
        stoneWallReflect,
        divineShieldBlocked,
        instantKill: extra.instantKill,
        selfDamage: extra.selfDamage,
    };
}
function executeUltimate(state) {
    if (!state.advancedClass) {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: false,
            turnsUp: false,
            mpCost: 0,
            mpRegen: 0,
            currentMp: state.user.mp,
            insufficientMp: false,
        };
    }
    if (state.ultimateUsed) {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: false,
            turnsUp: false,
            mpCost: 0,
            mpRegen: 0,
            currentMp: state.user.mp,
            insufficientMp: false,
        };
    }
    const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[state.advancedClass];
    const mpCost = advConfig.ultimate.mpCost;
    if (state.user.mp < mpCost) {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: false,
            turnsUp: false,
            mpCost: 0,
            mpRegen: 0,
            currentMp: state.user.mp,
            insufficientMp: true,
        };
    }
    state.user.mp -= mpCost;
    state.ultimateUsed = true;
    const skill = advConfig.ultimate;
    switch (state.advancedClass) {
        case "berserker":
            return executeUltimateBloodFrenzy(state, skill);
        case "warlock":
            return executeUltimateSoulBurn(state, skill);
        case "sniper":
            return executeUltimateHeadshot(state, skill);
        default:
            return executeUltimateGeneric(state, skill);
    }
}
// --- Execute Action (dispatcher) ---
function executeAction(state, action) {
    if (action === "run") {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: true,
            turnsUp: false,
            mpCost: 0,
            mpRegen: 0,
            currentMp: state.user.mp,
            insufficientMp: false,
        };
    }
    if (action === "ultimate")
        return executeUltimate(state);
    const mpCost = resolveMpCost(action);
    if (mpCost > 0 && state.user.mp < mpCost) {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: false,
            turnsUp: false,
            mpCost: 0,
            mpRegen: 0,
            currentMp: state.user.mp,
            insufficientMp: true,
        };
    }
    if (mpCost > 0)
        state.user.mp -= mpCost;
    if (action === "defend")
        return executeDefend(state, mpCost);
    let skill = null;
    if (action === "skill1")
        skill = rpg_config_1.CLASS_SKILLS[state.classType][0];
    if (action === "skill2")
        skill = rpg_config_1.CLASS_SKILLS[state.classType][1];
    if (skill?.damageType === "heal")
        return executeHealSkill(state, skill, action, mpCost);
    return executeDamageAction(state, skill, action, mpCost);
}
function getSkillLabels(classType, advancedClass) {
    const [s1, s2] = rpg_config_1.CLASS_SKILLS[classType];
    const labels = [
        { key: s1.key, emoji: s1.emoji },
        { key: s2.key, emoji: s2.emoji },
    ];
    if (advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[advancedClass];
        labels.push({ key: advConfig.ultimate.key, emoji: advConfig.ultimate.emoji });
    }
    return labels;
}
// --- Export ---
const CombatService = {
    initCombat,
    executeAction,
    getSkillLabels,
    calcPhysicalDamage,
    calcMagicalDamage,
    getEffectiveStat,
    tickStatusEffects,
    tickStatusEffectsStandalone,
};
exports.default = CombatService;
