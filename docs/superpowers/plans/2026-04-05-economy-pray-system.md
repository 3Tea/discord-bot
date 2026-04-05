# Economy Pray/Curse System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the economy foundation — pray/curse commands with dual currency (coin + gem), streak system, basic shop, and admin commands.

**Architecture:** Service-layer pattern with 3 Mongoose models (UserEconomy, ShopItem, Transaction), 3 services (CurrencyService, PrayService, ShopService), and 5 slash commands (pray, curse, balance, shop, economy). Services contain all business logic; commands are thin wrappers that parse input, call services, and format embeds.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose 8, existing Reply utility for embed responses.

**Note:** This project has no test framework configured. Tasks focus on implementation and manual verification via `npm run build`.

---

### Task 1: UserEconomy Model

**Files:**
- Create: `src/models/userEconomy.model.ts`

- [ ] **Step 1: Create the UserEconomy model**

```typescript
import { model, Schema, Document } from "mongoose";

export interface IUserEconomy extends Document {
    userId: string;
    guildId: string;
    coin: number;
    gem: number;
    lastPray: Date | null;
    lastCurse: Date | null;
    prayStreak: number;
    lastStreakDate: Date | null;
}

const userEconomySchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        coin: { type: Number, default: 0 },
        gem: { type: Number, default: 0 },
        lastPray: { type: Date, default: null },
        lastCurse: { type: Date, default: null },
        prayStreak: { type: Number, default: 0 },
        lastStreakDate: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "UserEconomies",
    }
);

userEconomySchema.index({ userId: 1, guildId: 1 }, { unique: true });
userEconomySchema.index({ guildId: 1, coin: -1 });

const UserEconomyModel = model<IUserEconomy>("UserEconomy", userEconomySchema);

export default UserEconomyModel;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/userEconomy.model.ts
git commit -m "feat(economy): add UserEconomy model"
```

---

### Task 2: ShopItem Model

**Files:**
- Create: `src/models/shopItem.model.ts`

- [ ] **Step 1: Create the ShopItem model**

```typescript
import { model, Schema, Document } from "mongoose";

export type ShopItemType = "role" | "cosmetic" | "currency_exchange";
export type CurrencyType = "coin" | "gem";

export interface IShopItem extends Document {
    guildId: string;
    itemId: string;
    name: string;
    description: string;
    type: ShopItemType;
    price: number;
    currencyType: CurrencyType;
    roleId?: string;
    stock: number | null;
    enabled: boolean;
}

const shopItemSchema = new Schema(
    {
        guildId: { type: String, required: true },
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        type: { type: String, enum: ["role", "cosmetic", "currency_exchange"], required: true },
        price: { type: Number, required: true },
        currencyType: { type: String, enum: ["coin", "gem"], required: true },
        roleId: { type: String },
        stock: { type: Number, default: null },
        enabled: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "ShopItems",
    }
);

shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, enabled: 1 });

const ShopItemModel = model<IShopItem>("ShopItem", shopItemSchema);

export default ShopItemModel;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/models/shopItem.model.ts
git commit -m "feat(economy): add ShopItem model"
```

---

### Task 3: Transaction Model

**Files:**
- Create: `src/models/transaction.model.ts`

- [ ] **Step 1: Create the Transaction model**

```typescript
import { model, Schema, Document } from "mongoose";

export type TransactionType = "pray" | "curse" | "purchase" | "exchange" | "streak_bonus" | "admin";

export interface ITransaction extends Document {
    userId: string;
    guildId: string;
    type: TransactionType;
    coinDelta: number;
    gemDelta: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

const transactionSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, required: true },
        type: {
            type: String,
            enum: ["pray", "curse", "purchase", "exchange", "streak_bonus", "admin"],
            required: true,
        },
        coinDelta: { type: Number, default: 0 },
        gemDelta: { type: Number, default: 0 },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: true,
        collection: "Transactions",
    }
);

transactionSchema.index({ userId: 1, guildId: 1, createdAt: -1 });

const TransactionModel = model<ITransaction>("Transaction", transactionSchema);

export default TransactionModel;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add Transaction model"
```

---

### Task 4: CurrencyService

**Files:**
- Create: `src/services/economy/currency.service.ts`

- [ ] **Step 1: Create the CurrencyService**

```typescript
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
        { upsert: true, new: true }
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
        { upsert: true, new: true }
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
        { upsert: true, new: true }
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
    const eco = await getOrCreate(userId, guildId);

    if (coinAmount > 0 && eco.coin < coinAmount) {
        throw new InsufficientFundsError("coin", coinAmount, eco.coin);
    }
    if (gemAmount > 0 && eco.gem < gemAmount) {
        throw new InsufficientFundsError("gem", gemAmount, eco.gem);
    }

    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $inc: { coin: -coinAmount, gem: -gemAmount } },
        { new: true }
    );
    await logTransaction(userId, guildId, reason, -coinAmount, -gemAmount, metadata);
    return updated!;
}

async function setCoin(userId: string, guildId: string, amount: number): Promise<IUserEconomy> {
    const eco = await getOrCreate(userId, guildId);
    const delta = amount - eco.coin;
    const updated = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $set: { coin: amount } },
        { new: true }
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
        { new: true }
    );
    await logTransaction(userId, guildId, "admin", 0, delta, { action: "set-gem" });
    return updated!;
}

const CurrencyService = {
    getBalance,
    addCoin,
    addGem,
    deduct,
    setCoin,
    setGem,
    InsufficientFundsError,
};

export default CurrencyService;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/currency.service.ts
git commit -m "feat(economy): add CurrencyService with balance, add, deduct, set"
```

---

### Task 5: PrayService

**Files:**
- Create: `src/services/economy/pray.service.ts`

- [ ] **Step 1: Create the PrayService**

```typescript
import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";

interface Reward {
    coin: number;
    gem: number;
}

interface StreakInfo {
    streak: number;
    milestoneHit: { days: number; bonusCoin: number; bonusGem: number } | null;
}

export interface PrayResult {
    userReward: Reward;
    targetReward: Reward | null;
    streakInfo: StreakInfo;
    targetId?: string;
}

export interface CurseResult {
    userReward: Reward;
    targetReward: Reward | null;
    targetId?: string;
}

const STREAK_MILESTONES = [
    { days: 3, bonusCoin: 50, bonusGem: 0 },
    { days: 7, bonusCoin: 150, bonusGem: 1 },
    { days: 14, bonusCoin: 300, bonusGem: 2 },
    { days: 30, bonusCoin: 500, bonusGem: 5 },
] as const;

function randomInRange(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function isSameUTCDay(d1: Date, d2: Date): boolean {
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
}

function isConsecutiveUTCDay(prev: Date, now: Date): boolean {
    const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
    const nowDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = nowDay.getTime() - prevDay.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}

function checkCooldown(lastAction: Date | null): boolean {
    if (!lastAction) return false;
    return isSameUTCDay(lastAction, new Date());
}

async function pray(userId: string, guildId: string, targetId?: string): Promise<PrayResult> {
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, new: true }
    );

    if (checkCooldown(eco.lastPray)) {
        throw new Error("PRAY_COOLDOWN");
    }

    const now = new Date();
    const isTargeted = targetId !== undefined;

    // Calculate rewards
    const userCoin = isTargeted ? randomInRange(100, 200) : randomInRange(50, 150);
    let userGem = 0;
    const userReward: Reward = { coin: userCoin, gem: 0 };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(80, 150), gem: 0 };
        // 5% gem chance for targeted pray
        if (Math.random() < 0.05) {
            userGem = 1;
            userReward.gem = 1;
        }
    }

    // Calculate streak
    let newStreak = 1;
    if (eco.lastStreakDate && isConsecutiveUTCDay(eco.lastStreakDate, now)) {
        newStreak = eco.prayStreak + 1;
    }

    // Check milestone
    let milestoneHit: StreakInfo["milestoneHit"] = null;
    for (const milestone of STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonusCoin: milestone.bonusCoin, bonusGem: milestone.bonusGem };
            userReward.coin += milestone.bonusCoin;
            userReward.gem += milestone.bonusGem;
            break;
        }
    }

    // Apply rewards
    await CurrencyService.addCoin(userId, guildId, userReward.coin, "pray", { targetId });
    if (userReward.gem > 0) {
        await CurrencyService.addGem(userId, guildId, userReward.gem, "pray", { targetId });
    }

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "pray", { fromUserId: userId });
    }

    // Log streak bonus as separate transaction
    if (milestoneHit) {
        // Already included in addCoin/addGem above — transaction logged there
    }

    // Update pray state
    await UserEconomyModel.updateOne(
        { userId, guildId },
        {
            $set: {
                lastPray: now,
                prayStreak: newStreak,
                lastStreakDate: now,
            },
        }
    );

    return {
        userReward,
        targetReward,
        streakInfo: { streak: newStreak, milestoneHit },
        targetId,
    };
}

async function curse(userId: string, guildId: string, targetId?: string): Promise<CurseResult> {
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, new: true }
    );

    if (checkCooldown(eco.lastCurse)) {
        throw new Error("CURSE_COOLDOWN");
    }

    const isTargeted = targetId !== undefined;

    const userReward: Reward = {
        coin: isTargeted ? randomInRange(40, 100) : randomInRange(20, 80),
        gem: 0,
    };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(30, 70), gem: 0 };
    }

    // Apply rewards
    await CurrencyService.addCoin(userId, guildId, userReward.coin, "curse", { targetId });

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "curse", { fromUserId: userId });
    }

    // Update curse cooldown (no streak for curse)
    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { lastCurse: new Date() } }
    );

    return { userReward, targetReward, targetId };
}

const PrayService = { pray, curse };

export default PrayService;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/pray.service.ts
git commit -m "feat(economy): add PrayService with pray, curse, streak logic"
```

---

### Task 6: ShopService

**Files:**
- Create: `src/services/economy/shop.service.ts`

- [ ] **Step 1: Create the ShopService**

```typescript
import ShopItemModel, { IShopItem, ShopItemType, CurrencyType } from "../../models/shopItem.model";
import CurrencyService from "./currency.service";
import { Guild } from "discord.js";

export interface PurchaseResult {
    item: IShopItem;
    coinSpent: number;
    gemSpent: number;
}

interface AddItemInput {
    itemId: string;
    name: string;
    description: string;
    type: ShopItemType;
    price: number;
    currencyType: CurrencyType;
    roleId?: string;
    stock?: number | null;
}

const ITEMS_PER_PAGE = 5;

async function getItems(guildId: string, page: number): Promise<{ items: IShopItem[]; totalPages: number }> {
    const total = await ShopItemModel.countDocuments({ guildId, enabled: true });
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const items = await ShopItemModel.find({ guildId, enabled: true })
        .sort({ price: 1 })
        .skip((safePage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);

    return { items, totalPages };
}

async function buyItem(
    userId: string,
    guildId: string,
    itemId: string,
    guild: Guild
): Promise<PurchaseResult> {
    const item = await ShopItemModel.findOne({ guildId, itemId, enabled: true });
    if (!item) {
        throw new Error("ITEM_NOT_FOUND");
    }

    if (item.stock !== null && item.stock <= 0) {
        throw new Error("OUT_OF_STOCK");
    }

    // Deduct currency
    const coinCost = item.currencyType === "coin" ? item.price : 0;
    const gemCost = item.currencyType === "gem" ? item.price : 0;

    await CurrencyService.deduct(userId, guildId, coinCost, gemCost, "purchase", { itemId });

    // Apply effect
    try {
        if (item.type === "role" && item.roleId) {
            const member = await guild.members.fetch(userId);
            if (member.roles.cache.has(item.roleId)) {
                // Rollback: refund the currency
                if (coinCost > 0) await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
                if (gemCost > 0) await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
                throw new Error("ALREADY_HAS_ROLE");
            }
            await member.roles.add(item.roleId);
        }
        // "cosmetic" and "currency_exchange" — no additional effect in phase 1
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_HAS_ROLE") {
            throw error;
        }
        // Rollback on unexpected failure
        if (coinCost > 0) await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
        if (gemCost > 0) await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
        throw new Error("EFFECT_FAILED");
    }

    // Decrement stock if not unlimited
    if (item.stock !== null) {
        await ShopItemModel.updateOne({ _id: item._id }, { $inc: { stock: -1 } });
    }

    return { item, coinSpent: coinCost, gemSpent: gemCost };
}

async function addItem(guildId: string, data: AddItemInput): Promise<IShopItem> {
    const existing = await ShopItemModel.findOne({ guildId, itemId: data.itemId });
    if (existing) {
        throw new Error("ITEM_ALREADY_EXISTS");
    }

    return ShopItemModel.create({ guildId, ...data });
}

async function removeItem(guildId: string, itemId: string): Promise<void> {
    const result = await ShopItemModel.updateOne(
        { guildId, itemId },
        { $set: { enabled: false } }
    );
    if (result.matchedCount === 0) {
        throw new Error("ITEM_NOT_FOUND");
    }
}

const ShopService = { getItems, buyItem, addItem, removeItem };

export default ShopService;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/shop.service.ts
git commit -m "feat(economy): add ShopService with buy, add, remove, pagination"
```

---

### Task 7: `/pray` Command

**Files:**
- Create: `src/commands/slash/pray.ts`

- [ ] **Step 1: Create the pray command**

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { PrayResult } from "../../services/economy/pray.service";

const PRAY_TEXTS = [
    "cầu nguyện dưới ánh trăng...",
    "thành tâm khấn vái thần linh...",
    "gửi lời nguyện lên trời cao...",
    "thắp nén hương thành kính...",
    "cầu phước lành từ đất trời...",
];

function randomText(texts: string[]): string {
    return texts[Math.floor(Math.random() * texts.length)]!;
}

function formatPrayEmbed(interaction: ChatInputCommandInteraction, result: PrayResult): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTimestamp();

    const flavorText = randomText(PRAY_TEXTS);
    let description = `**${interaction.user.username}** ${flavorText}\n\n`;

    description += `> +**${result.userReward.coin}** coin`;
    if (result.userReward.gem > 0) {
        description += ` | +**${result.userReward.gem}** gem`;
    }
    description += "\n";

    if (result.targetReward && result.targetId) {
        description += `> <@${result.targetId}> nhận +**${result.targetReward.coin}** coin\n`;
    }

    if (result.streakInfo.streak > 1) {
        description += `\nStreak: **${result.streakInfo.streak}** ngày`;
    }

    if (result.streakInfo.milestoneHit) {
        const m = result.streakInfo.milestoneHit;
        description += `\nMilestone **${m.days} ngày**! Bonus: +**${m.bonusCoin}** coin`;
        if (m.bonusGem > 0) {
            description += ` +**${m.bonusGem}** gem`;
        }
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("pray")
        .setDescription("Cầu nguyện để nhận coin")
        .addUserOption((option) =>
            option.setName("target").setDescription("Cầu nguyện cho người khác")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply("Không thể cầu nguyện cho bot.");
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply("Không thể cầu nguyện cho chính mình bằng target. Dùng `/pray` không có target.");
                return;
            }

            const result = await PrayService.pray(userId, guildId, targetUser?.id);
            const embed = formatPrayEmbed(interaction, result);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error instanceof Error && error.message === "PRAY_COOLDOWN") {
                await interaction.editReply("Bạn đã cầu nguyện hôm nay rồi. Quay lại vào ngày mai nhé!");
                return;
            }
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/pray.ts
git commit -m "feat(economy): add /pray command"
```

---

### Task 8: `/curse` Command

**Files:**
- Create: `src/commands/slash/curse.ts`

- [ ] **Step 1: Create the curse command**

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { CurseResult } from "../../services/economy/pray.service";

const CURSE_TEXTS = [
    "thì thầm lời nguyền trong bóng tối...",
    "triệu hồi bóng đêm vĩnh cửu...",
    "gửi lời rủa vào hư vô...",
    "khơi dậy sức mạnh hắc ám...",
    "phong ấn bóng tối cổ đại...",
];

function randomText(texts: string[]): string {
    return texts[Math.floor(Math.random() * texts.length)]!;
}

function formatCurseEmbed(interaction: ChatInputCommandInteraction, result: CurseResult): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0x800080)
        .setTimestamp();

    const flavorText = randomText(CURSE_TEXTS);
    let description = `**${interaction.user.username}** ${flavorText}\n\n`;

    description += `> +**${result.userReward.coin}** coin\n`;

    if (result.targetReward && result.targetId) {
        description += `> <@${result.targetId}> nhận +**${result.targetReward.coin}** coin\n`;
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("curse")
        .setDescription("Nguyền rủa để nhận coin (ít hơn pray)")
        .addUserOption((option) =>
            option.setName("target").setDescription("Nguyền rủa ai đó")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply("Không thể nguyền rủa bot.");
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply("Không thể nguyền rủa chính mình bằng target. Dùng `/curse` không có target.");
                return;
            }

            const result = await PrayService.curse(userId, guildId, targetUser?.id);
            const embed = formatCurseEmbed(interaction, result);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error instanceof Error && error.message === "CURSE_COOLDOWN") {
                await interaction.editReply("Bạn đã nguyền rủa hôm nay rồi. Quay lại vào ngày mai nhé!");
                return;
            }
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/curse.ts
git commit -m "feat(economy): add /curse command"
```

---

### Task 9: `/balance` Command

**Files:**
- Create: `src/commands/slash/balance.ts`

- [ ] **Step 1: Create the balance command**

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Xem số dư coin và gem")
        .addUserOption((option) =>
            option.setName("user").setDescription("Xem số dư của người khác")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const balance = await CurrencyService.getBalance(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(`Ví của ${target.username}`)
                .addFields(
                    { name: "Coin", value: `**${balance.coin.toLocaleString()}**`, inline: true },
                    { name: "Gem", value: `**${balance.gem.toLocaleString()}**`, inline: true },
                    { name: "Pray Streak", value: `**${balance.prayStreak}** ngày`, inline: true },
                )
                .setTimestamp();

            if (balance.lastPray) {
                embed.addFields({
                    name: "Pray cuối",
                    value: `<t:${Math.floor(balance.lastPray.getTime() / 1000)}:R>`,
                    inline: true,
                });
            }

            await Reply.embedEdit(interaction, embed);
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/balance.ts
git commit -m "feat(economy): add /balance command"
```

---

### Task 10: `/economy` Admin Command

**Files:**
- Create: `src/commands/slash/economy.ts`

- [ ] **Step 1: Create the economy admin command**

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import CurrencyService from "../../services/economy/currency.service";

export default {
    data: new SlashCommandBuilder()
        .setName("economy")
        .setDescription("Economy management (admin)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("set-coin")
                .setDescription("Set a user's coin")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-coin")
                .setDescription("Add coin to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin to add").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-gem")
                .setDescription("Set a user's gem")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-gem")
                .setDescription("Add gem to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem to add").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guildId = interaction.guildId!;
            const subcommand = interaction.options.getSubcommand(true);
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            let embed: EmbedBuilder;

            switch (subcommand) {
                case "set-coin": {
                    const updated = await CurrencyService.setCoin(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(`Set coin for <@${target.id}>: **${updated.coin.toLocaleString()}** coin`)
                        .setColor(0x5865f2);
                    break;
                }
                case "add-coin": {
                    const updated = await CurrencyService.addCoin(target.id, guildId, amount, "admin", { action: "add-coin" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** coin to <@${target.id}>\n` +
                            `Total: **${updated.coin.toLocaleString()}** coin`
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                case "set-gem": {
                    const updated = await CurrencyService.setGem(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(`Set gem for <@${target.id}>: **${updated.gem.toLocaleString()}** gem`)
                        .setColor(0x5865f2);
                    break;
                }
                case "add-gem": {
                    const updated = await CurrencyService.addGem(target.id, guildId, amount, "admin", { action: "add-gem" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** gem to <@${target.id}>\n` +
                            `Total: **${updated.gem.toLocaleString()}** gem`
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                default:
                    await interaction.editReply("Unknown subcommand.");
                    return;
            }

            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/economy.ts
git commit -m "feat(economy): add /economy admin command (set/add coin/gem)"
```

---

### Task 11: `/shop` Command

**Files:**
- Create: `src/commands/slash/shop.ts`

- [ ] **Step 1: Create the shop command**

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import ShopService from "../../services/economy/shop.service";
import CurrencyService from "../../services/economy/currency.service";

function currencyEmoji(type: string): string {
    return type === "gem" ? "gem" : "coin";
}

export default {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Cửa hàng server")
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("Xem danh sách items")
                .addIntegerOption((opt) =>
                    opt.setName("page").setDescription("Trang").setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("buy")
                .setDescription("Mua item")
                .addStringOption((opt) =>
                    opt.setName("item-id").setDescription("ID của item").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Thêm item vào shop (Admin)")
                .addStringOption((opt) => opt.setName("item-id").setDescription("Unique ID").setRequired(true))
                .addStringOption((opt) => opt.setName("name").setDescription("Tên item").setRequired(true))
                .addStringOption((opt) => opt.setName("description").setDescription("Mô tả").setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Loại item")
                        .setRequired(true)
                        .addChoices(
                            { name: "Role", value: "role" },
                            { name: "Cosmetic", value: "cosmetic" },
                            { name: "Currency Exchange", value: "currency_exchange" }
                        )
                )
                .addIntegerOption((opt) => opt.setName("price").setDescription("Giá").setMinValue(1).setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName("currency")
                        .setDescription("Loại tiền")
                        .setRequired(true)
                        .addChoices(
                            { name: "Coin", value: "coin" },
                            { name: "Gem", value: "gem" }
                        )
                )
                .addRoleOption((opt) => opt.setName("role").setDescription("Role (nếu type=role)"))
                .addIntegerOption((opt) => opt.setName("stock").setDescription("Số lượng (bỏ trống = vô hạn)").setMinValue(1))
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Xóa item khỏi shop (Admin)")
                .addStringOption((opt) =>
                    opt.setName("item-id").setDescription("ID của item").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        if (subcommand === "view") {
            await interaction.deferReply();
            try {
                const page = interaction.options.getInteger("page") ?? 1;
                const { items, totalPages } = await ShopService.getItems(guildId, page);

                if (items.length === 0) {
                    await interaction.editReply("Shop hiện tại trống.");
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle("Shop")
                    .setColor(0xffd700)
                    .setTimestamp();

                for (const item of items) {
                    const stockText = item.stock === null ? "Unlimited" : `${item.stock} left`;
                    embed.addFields({
                        name: `${item.name} — ${item.price} ${currencyEmoji(item.currencyType)}`,
                        value: `${item.description}\nID: \`${item.itemId}\` | Stock: ${stockText}`,
                    });
                }

                embed.setFooter({ text: `Trang ${page}/${totalPages}` });
                await interaction.editReply({ embeds: [embed] });
            } catch {
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        if (subcommand === "buy") {
            await interaction.deferReply();
            try {
                const itemId = interaction.options.getString("item-id", true);
                const result = await ShopService.buyItem(interaction.user.id, guildId, itemId, interaction.guild!);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(
                        `Mua thành công **${result.item.name}**!\n` +
                        `Đã trả: **${result.coinSpent > 0 ? `${result.coinSpent} coin` : `${result.gemSpent} gem`}**`
                    )
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                const msg = error instanceof Error ? error.message : "UNKNOWN";
                const errorMessages: Record<string, string> = {
                    ITEM_NOT_FOUND: "Item không tồn tại hoặc đã bị xóa.",
                    OUT_OF_STOCK: "Item đã hết hàng.",
                    ALREADY_HAS_ROLE: "Bạn đã có role này rồi.",
                    EFFECT_FAILED: "Không thể áp dụng item. Đã hoàn tiền.",
                };
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    await interaction.editReply("Bạn không đủ tiền để mua item này.");
                    return;
                }
                await interaction.editReply(errorMessages[msg] ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        // Admin commands: add and remove
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === "add") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply("Bạn cần quyền Administrator.");
                    return;
                }

                const type = interaction.options.getString("type", true) as "role" | "cosmetic" | "currency_exchange";
                const roleOption = interaction.options.getRole("role");

                if (type === "role" && !roleOption) {
                    await interaction.editReply("Cần chọn role cho item loại Role.");
                    return;
                }

                const item = await ShopService.addItem(guildId, {
                    itemId: interaction.options.getString("item-id", true),
                    name: interaction.options.getString("name", true),
                    description: interaction.options.getString("description", true),
                    type,
                    price: interaction.options.getInteger("price", true),
                    currencyType: interaction.options.getString("currency", true) as "coin" | "gem",
                    roleId: roleOption?.id,
                    stock: interaction.options.getInteger("stock") ?? null,
                });

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(`Đã thêm **${item.name}** (ID: \`${item.itemId}\`) vào shop.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_ALREADY_EXISTS") {
                    await interaction.editReply("Item ID đã tồn tại. Chọn ID khác.");
                    return;
                }
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        if (subcommand === "remove") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply("Bạn cần quyền Administrator.");
                    return;
                }

                const itemId = interaction.options.getString("item-id", true);
                await ShopService.removeItem(guildId, itemId);

                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription(`Đã xóa item \`${itemId}\` khỏi shop.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
                    await interaction.editReply("Không tìm thấy item này.");
                    return;
                }
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/shop.ts
git commit -m "feat(economy): add /shop command (view, buy, add, remove)"
```

---

### Task 12: Final Build Verification & Cleanup

**Files:**
- All files created in Tasks 1-11

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean compilation with zero errors.

- [ ] **Step 2: Verify command auto-discovery**

Check that the command loader in `src/loaders/commands.ts` will pick up the new files. The loader auto-discovers all `.ts` files in `src/commands/slash/` — no manual registration needed. Verify this by reading the loader file.

- [ ] **Step 3: Run format check**

Run: `npm run format:check`
If formatting issues: run `npm run format` and commit.

- [ ] **Step 4: Final commit (if formatting changes)**

```bash
git add -A
git commit -m "style(economy): format new economy files"
```
