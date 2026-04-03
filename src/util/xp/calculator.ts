/**
 * Exponential level formula: XP needed for level N = N^2 * 50
 */

export function xpForLevel(level: number): number {
    return level * level * 50;
}

export function levelFromXP(xp: number): number {
    return Math.floor(Math.sqrt(xp / 50));
}

export interface LevelProgress {
    level: number;
    currentXP: number;
    requiredXP: number;
    percentage: number;
}

export function progressToNextLevel(xp: number): LevelProgress {
    const level = levelFromXP(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const currentXP = xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    const percentage = requiredXP > 0 ? Math.floor((currentXP / requiredXP) * 100) : 0;

    return { level, currentXP, requiredXP, percentage };
}

export function randomXP(base: number, variance: number = 5): number {
    return base - variance + Math.floor(Math.random() * (variance * 2 + 1));
}
