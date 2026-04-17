"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameUTCDay = isSameUTCDay;
exports.isConsecutiveUTCDay = isConsecutiveUTCDay;
exports.secondsUntilUTCMidnight = secondsUntilUTCMidnight;
function isSameUTCDay(d1, d2) {
    return (d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate());
}
function isConsecutiveUTCDay(prev, now) {
    const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
    const nowDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return nowDay.getTime() - prevDay.getTime() === 86400000;
}
function secondsUntilUTCMidnight() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}
