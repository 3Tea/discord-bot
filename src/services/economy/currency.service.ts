import UserEconomyModel, { IUserEconomy } from "../../models/userEconomy.model";
import TransactionModel, { TransactionType } from "../../models/transaction.model";

export interface BalanceInfo {
    coin: number;
    gem: number;
    prayStreak: number;
    lastPray: Date | null;
    lastCurse: Date | null;
}

class InsufficientFundsError extends Error {
    constructor(currency: string, required: number, available: number) {
        super(`Insufficient ${currency}: need ${required}, have ${available}`);
        this.name = "InsufficientFundsError";
    }
}

async function logTransaction(
    userId: string,
    guildId: string,
    type: TransactionType,
    coinDelta: number,
    gemDelta: number,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await TransactionModel.create({ userId, guildId, type, coinDelta, gemDelta, metadata });
}

async function getOrCreate(userId: string, guildId: string): Promise<IUserEconomy> {
    const doc = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, returnDocument: "after" }
    );
    return doc;
}

async function getBalance(userId: string, guildId: string): Promise<BalanceInfo> {
    const eco = await getOrCreate(userId, guildId);
    return {
        coin: eco.coin,
        gem: eco.gem,
        prayStreak: eco.prayStreak,
        lastPray: eco.lastPray,
        lastCurse: eco.lastCurse,
    };
}

async function addCoin(
    userId: string,
    guildId: string,
    amount: number,
    reason: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<IUserEconomy> {
    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        {
            $inc: { coin: amount },
            $setOnInsert: { userId, guildId },
        },
        { upsert: true, returnDocument: "after" }
    );
    await logTransaction(userId, guildId, reason, amount, 0, metadata);
    return updated;
}

async function addGem(
    userId: string,
    guildId: string,
    amount: number,
    reason: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<IUserEconomy> {
    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        {
            $inc: { gem: amount },
            $setOnInsert: { userId, guildId },
        },
        { upsert: true, returnDocument: "after" }
    );
    await logTransaction(userId, guildId, reason, 0, amount, metadata);
    return updated;
}

async function deduct(
    userId: string,
    guildId: string,
    coinAmount: number,
    gemAmount: number,
    reason: TransactionType,
    metadata: Record<string, unknown> = {}
): Promise<IUserEconomy> {
    // Ensure the record exists first
    await getOrCreate(userId, guildId);

    // Atomic check + update: only deducts if balance is sufficient
    const filter: Record<string, unknown> = { userId, guildId };
    if (coinAmount > 0) filter.coin = { $gte: coinAmount };
    if (gemAmount > 0) filter.gem = { $gte: gemAmount };

    const updated = await UserEconomyModel.findOneAndUpdate(
        filter,
        { $inc: { coin: -coinAmount, gem: -gemAmount } },
        { returnDocument: "after" }
    );

    if (!updated) {
        // Re-read to provide accurate error message
        const eco = await UserEconomyModel.findOne({ userId, guildId });
        if (coinAmount > 0 && (eco?.coin ?? 0) < coinAmount) {
            throw new InsufficientFundsError("coin", coinAmount, eco?.coin ?? 0);
        }
        throw new InsufficientFundsError("gem", gemAmount, eco?.gem ?? 0);
    }

    await logTransaction(userId, guildId, reason, -coinAmount, -gemAmount, metadata);
    return updated;
}

async function setCoin(userId: string, guildId: string, amount: number): Promise<IUserEconomy> {
    const eco = await getOrCreate(userId, guildId);
    const delta = amount - eco.coin;
    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $set: { coin: amount } },
        { returnDocument: "after" }
    );
    await logTransaction(userId, guildId, "admin", delta, 0, { action: "set-coin" });
    return updated!;
}

async function setGem(userId: string, guildId: string, amount: number): Promise<IUserEconomy> {
    const eco = await getOrCreate(userId, guildId);
    const delta = amount - eco.gem;
    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $set: { gem: amount } },
        { returnDocument: "after" }
    );
    await logTransaction(userId, guildId, "admin", 0, delta, { action: "set-gem" });
    return updated!;
}

async function exchange(userId: string, guildId: string, gemAmount: number, ratePerGem: number): Promise<IUserEconomy> {
    const coinCost = gemAmount * ratePerGem;
    await deduct(userId, guildId, coinCost, 0, "exchange", { gemAmount, ratePerGem });
    try {
        return await addGem(userId, guildId, gemAmount, "exchange", { coinCost, ratePerGem });
    } catch (error) {
        await addCoin(userId, guildId, coinCost, "exchange", { gemAmount, ratePerGem, refund: true });
        throw error;
    }
}

const CurrencyService = {
    getBalance,
    addCoin,
    addGem,
    deduct,
    exchange,
    setCoin,
    setGem,
    InsufficientFundsError,
};

export default CurrencyService;
