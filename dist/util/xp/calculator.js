"use strict";
/**
 * Exponential level formula: XP needed for level N = N^2 * 50
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpForLevel = xpForLevel;
exports.levelFromXP = levelFromXP;
exports.progressToNextLevel = progressToNextLevel;
exports.randomXP = randomXP;
function xpForLevel(level) {
    return level * level * 50;
}
function levelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 50));
}
function progressToNextLevel(xp) {
    const level = levelFromXP(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const currentXP = xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    const percentage = requiredXP > 0 ? Math.floor((currentXP / requiredXP) * 100) : 0;
    return { level, currentXP, requiredXP, percentage };
}
function randomXP(base, variance = 5) {
    return base - variance + Math.floor(Math.random() * (variance * 2 + 1));
}
