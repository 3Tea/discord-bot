export interface RobResult {
    success: boolean;
    amount: number;
    percentage: number;
}

interface RobConfig {
    robSuccessRate: number;
    robStealMinPct: number;
    robStealMaxPct: number;
    robPenaltyMinPct: number;
    robPenaltyMaxPct: number;
    robMinBalance: number;
}

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCooldown(seconds: number): string {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
}

function rollRob(robberBalance: number, targetBalance: number, config: RobConfig): RobResult {
    const success = Math.random() < config.robSuccessRate;

    if (success) {
        const stealPct = randomInRange(config.robStealMinPct, config.robStealMaxPct);
        let stealAmount = Math.floor((targetBalance * stealPct) / 100);
        // Never drain target below min balance
        const maxSteal = Math.max(0, targetBalance - config.robMinBalance);
        stealAmount = Math.min(stealAmount, maxSteal);

        return { success: true, amount: stealAmount, percentage: stealPct };
    }

    const penaltyPct = randomInRange(config.robPenaltyMinPct, config.robPenaltyMaxPct);
    const penaltyAmount = Math.floor((robberBalance * penaltyPct) / 100);

    return { success: false, amount: penaltyAmount, percentage: penaltyPct };
}

const SocialService = { rollRob, formatCooldown, randomInRange };

export default SocialService;
