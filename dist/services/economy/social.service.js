"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const random_1 = require("../../util/math/random");
const format_1 = require("../../util/date/format");
function rollRob(robberBalance, targetBalance, config) {
    const success = Math.random() < config.robSuccessRate;
    if (success) {
        const stealPct = (0, random_1.randomInRange)(config.robStealMinPct, config.robStealMaxPct);
        let stealAmount = Math.floor((targetBalance * stealPct) / 100);
        // Never drain target below min balance
        const maxSteal = Math.max(0, targetBalance - config.robMinBalance);
        stealAmount = Math.min(stealAmount, maxSteal);
        return { success: true, amount: stealAmount, percentage: stealPct };
    }
    const penaltyPct = (0, random_1.randomInRange)(config.robPenaltyMinPct, config.robPenaltyMaxPct);
    const penaltyAmount = Math.floor((robberBalance * penaltyPct) / 100);
    return { success: false, amount: penaltyAmount, percentage: penaltyPct };
}
const SocialService = { rollRob, formatCooldown: format_1.formatCooldown, randomInRange: random_1.randomInRange };
exports.default = SocialService;
