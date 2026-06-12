"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const random_1 = require("../../util/math/random");
// --- Helpers ---
const BUFF_TYPES = ["attack", "defense", "luck"];
// --- Core functions ---
function generateOffer(floor) {
    return {
        healCost: 80 + floor * 5,
        healAmount: 30 + floor * 2,
        buffType: BUFF_TYPES[(0, random_1.randomInRange)(0, BUFF_TYPES.length - 1)],
        buffCost: 100 + floor * 5,
        equipCost: 200 + floor * 10,
    };
}
function buildMerchantState(userId, locale, floor, checkpoint, currentHp, maxHp) {
    const offer = generateOffer(floor);
    return {
        encounterId: node_crypto_1.default.randomUUID(),
        userId,
        locale,
        floor,
        checkpoint,
        healCost: offer.healCost,
        healAmount: offer.healAmount,
        buffType: offer.buffType,
        buffCost: offer.buffCost,
        equipCost: offer.equipCost,
        currentHp,
        maxHp,
    };
}
function calculateHeal(currentHp, healAmount, maxHp) {
    return Math.min(currentHp + healAmount, maxHp) - currentHp;
}
const MerchantService = { generateOffer, buildMerchantState, calculateHeal };
exports.default = MerchantService;
