// src/util/xp/periodKey.ts

export type Period = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Returns the current period keys for all 4 periods in UTC.
 *
 * daily:   "2026-04-06"
 * weekly:  "2026-W15"  (ISO 8601 week, starts Monday)
 * monthly: "2026-04"
 * yearly:  "2026"
 */
export function getCurrentPeriodKeys(date: Date = new Date()): Record<Period, string> {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");

    return {
        daily: `${y}-${m}-${d}`,
        weekly: getISOWeekKey(date),
        monthly: `${y}-${m}`,
        yearly: String(y),
    };
}

/**
 * ISO 8601 week key: "YYYY-WNN"
 * Week 1 is the week containing the first Thursday of the year.
 * Weeks start on Monday.
 */
function getISOWeekKey(date: Date): string {
    // Copy date to avoid mutation, work in UTC
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
    const dayNum = d.getUTCDay() || 7; // Convert Sunday(0) to 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks between yearStart and nearest Thursday
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export const ALL_PERIODS: readonly Period[] = ["daily", "weekly", "monthly", "yearly"] as const;
