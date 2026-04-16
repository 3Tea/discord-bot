import crypto from "node:crypto";
import { randomInRange } from "../../util/math/random";

// --- Types ---

export type BuffType = "attack" | "defense" | "luck";

export interface Buff {
    type: BuffType;
    encountersLeft: number;
}

export interface MerchantState {
    encounterId: string;
    userId: string;
    locale: string;
    floor: number;
    checkpoint: number;
    healCost: number;
    healAmount: number;
    buffType: BuffType;
    buffCost: number;
    equipCost: number;
    currentHp: number;
    maxHp: number;
}

export interface MerchantOffer {
    healCost: number;
    healAmount: number;
    buffType: BuffType;
    buffCost: number;
    equipCost: number;
}

// --- Helpers ---

const BUFF_TYPES: BuffType[] = ["attack", "defense", "luck"];

// --- Core functions ---

function generateOffer(floor: number): MerchantOffer {
    return {
        healCost: 80 + floor * 5,
        healAmount: 30 + floor * 2,
        buffType: BUFF_TYPES[randomInRange(0, BUFF_TYPES.length - 1)],
        buffCost: 100 + floor * 5,
        equipCost: 200 + floor * 10,
    };
}

function buildMerchantState(
    userId: string,
    locale: string,
    floor: number,
    checkpoint: number,
    currentHp: number,
    maxHp: number
): MerchantState {
    const offer = generateOffer(floor);
    return {
        encounterId: crypto.randomUUID(),
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

function calculateHeal(currentHp: number, healAmount: number, maxHp: number): number {
    return Math.min(currentHp + healAmount, maxHp) - currentHp;
}

const MerchantService = { generateOffer, buildMerchantState, calculateHeal };
export default MerchantService;
