import { randomInRange } from "../../util/math/random";
import { formatCooldown } from "../../util/date/format";

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
