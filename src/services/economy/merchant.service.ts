import crypto from "node:crypto";

// --- Types ---

export type BuffType = "attack" | "defense" | "luck";

export interface Buff {
    type: BuffType;
    encountersLeft: number;
}

export interface MerchantState {
    encounterId: string;
    userId: string;
    guildId: string;
    locale: string;
    floor: number;
    checkpoint: number;
    healCost: number;
    healAmount: number;
    buffType: BuffType;
    buffCost: number;
    exchangeRate: number;
    currentHp: number;
}

export interface MerchantOffer {
    healCost: number;
    healAmount: number;
    buffType: BuffType;
    buffCost: number;
    exchangeRate: number;
}

// --- Helpers ---

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BUFF_TYPES: BuffType[] = ["attack", "defense", "luck"];

// --- Core functions ---

function generateOffer(floor: number): MerchantOffer {
    return {
        healCost: 80 + floor * 5,
        healAmount: 30 + floor * 2,
        buffType: BUFF_TYPES[randomInRange(0, BUFF_TYPES.length - 1)],
        buffCost: 100 + floor * 5,
        exchangeRate: randomInRange(300, 600),
    };
}

function buildMerchantState(
    userId: string,
    guildId: string,
    locale: string,
    floor: number,
    checkpoint: number,
    currentHp: number,
): MerchantState {
    const offer = generateOffer(floor);
    return {
        encounterId: crypto.randomUUID(),
        userId,
        guildId,
        locale,
        floor,
        checkpoint,
        healCost: offer.healCost,
        healAmount: offer.healAmount,
        buffType: offer.buffType,
        buffCost: offer.buffCost,
        exchangeRate: offer.exchangeRate,
        currentHp,
    };
}

function calculateHeal(currentHp: number, healAmount: number): number {
    return Math.min(currentHp + healAmount, 100) - currentHp;
}

const MerchantService = { generateOffer, buildMerchantState, calculateHeal };
export default MerchantService;
