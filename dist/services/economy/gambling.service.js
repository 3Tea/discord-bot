"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// --- Coinflip: 50/50, 0% house edge ---
function coinflip() {
    const isHeads = Math.random() < 0.5;
    return {
        result: isHeads ? "heads" : "tails",
        won: isHeads,
        multiplier: isHeads ? 2 : 0,
    };
}
// --- Slots: flat probability table, ~12% house edge ---
const SYMBOLS = ["🍒", "🍋", "🔔", "💎", "7️⃣"];
const SLOTS_TABLE = [
    { threshold: 0.005, combo: "777", reels: ["7️⃣", "7️⃣", "7️⃣"], multiplier: 20 },
    { threshold: 0.02, combo: "diamond", reels: ["💎", "💎", "💎"], multiplier: 8 },
    { threshold: 0.06, combo: "bell", reels: ["🔔", "🔔", "🔔"], multiplier: 4 },
    { threshold: 0.16, combo: "lemon", reels: ["🍋", "🍋", "🍋"], multiplier: 2 },
    { threshold: 0.31, combo: "cherry3", reels: ["🍒", "🍒", "🍒"], multiplier: 1.5 },
    { threshold: 0.46, combo: "cherry2", reels: null, multiplier: 0.5 },
    { threshold: 1.0, combo: "none", reels: null, multiplier: 0 },
];
function randomSymbolExcept(...exclude) {
    const pool = SYMBOLS.filter((s) => !exclude.includes(s));
    return pool[Math.floor(Math.random() * pool.length)];
}
function generateNoMatchReels() {
    // Generate 3 symbols that don't form a triple and aren't cherry-cherry-X
    const first = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    let second;
    let third;
    // Avoid cherry-cherry-X pattern
    if (first === "🍒") {
        second = randomSymbolExcept("🍒");
        third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }
    else {
        second = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (second === first) {
            // Avoid triple
            third = randomSymbolExcept(first);
        }
        else if (second === "🍒") {
            third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        }
        else {
            third = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            // If we accidentally made a triple, reroll third
            if (third === first && second === first) {
                third = randomSymbolExcept(first);
            }
        }
    }
    return [first, second, third];
}
function slots() {
    const roll = Math.random();
    for (const entry of SLOTS_TABLE) {
        if (roll < entry.threshold) {
            let reels;
            if (entry.reels) {
                reels = [...entry.reels];
            }
            else if (entry.combo === "cherry2") {
                reels = ["🍒", "🍒", randomSymbolExcept("🍒")];
            }
            else {
                reels = generateNoMatchReels();
            }
            return {
                reels,
                combo: entry.combo,
                won: entry.multiplier > 0,
                multiplier: entry.multiplier,
            };
        }
    }
    // Fallback (should not reach here)
    return { reels: generateNoMatchReels(), combo: "none", won: false, multiplier: 0 };
}
// --- Dice: 2d6, high/low, ~17% house edge (7 always loses) ---
function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}
function dice(mode) {
    const d1 = rollDie();
    const d2 = rollDie();
    const total = d1 + d2;
    const won = mode === "high" ? total >= 8 : total <= 6;
    return {
        dice: [d1, d2],
        total,
        mode,
        won,
        multiplier: won ? 2 : 0,
    };
}
const GamblingService = { coinflip, slots, dice };
exports.default = GamblingService;
