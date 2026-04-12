# Mine Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/mine` slash command where users dig for minerals with depth progression, checkpoint system, and collapse risk.

**Architecture:** Create `mine.service.ts` for game logic (mineral roll, collapse, depth/checkpoint, prime check) and `mine.ts` command following the work/fish pattern. Add `mineDepth` and `mineCheckpoint` fields to existing `UserEconomy` model. Use `tryStarDrop()` for 4% star drop.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, ioredis, i18next

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/userEconomy.model.ts` | Modify | Add `mineDepth`, `mineCheckpoint` fields |
| `src/services/economy/mine.service.ts` | Create | Mineral roll, collapse logic, prime check, depth management |
| `src/commands/slash/mine.ts` | Create | Slash command — cooldown, service calls, embed building |
| `src/util/help/commandCategories.ts` | Modify | Add `mine: "economy"` |
| `src/locales/*.json` (15 files) | Modify | Add `mine.*` and `cmd.mine.desc` keys |

---

### Task 1: Add mine fields to UserEconomy model

**Files:**
- Modify: `src/models/userEconomy.model.ts`

- [ ] **Step 1: Add fields to IUserEconomy interface**

In `src/models/userEconomy.model.ts`, add two fields to the `IUserEconomy` interface after `lastStreakDate`:

```typescript
    mineDepth: number;
    mineCheckpoint: number;
```

- [ ] **Step 2: Add fields to schema**

In the same file, add to the schema definition object after `lastStreakDate`:

```typescript
        mineDepth: { type: Number, default: 1 },
        mineCheckpoint: { type: Number, default: 1 },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/userEconomy.model.ts
git commit -m "feat(economy): add mineDepth and mineCheckpoint to UserEconomy model"
```

---

### Task 2: Create mine service

**Files:**
- Create: `src/services/economy/mine.service.ts`

- [ ] **Step 1: Create the mine service file**

Create `src/services/economy/mine.service.ts`:

```typescript
import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";

// --- Types ---

export interface MineralRollResult {
    name: string;
    rarity: string;
    emoji: string;
    baseCoin: number;
    depthBonus: number;
    totalReward: number;
}

export interface MineResult {
    collapsed: boolean;
    mineral: MineralRollResult | null;
    penalty: number;
    newDepth: number;
    checkpoint: number;
    checkpointReached: boolean;
}

// --- Mineral table ---

const MINERAL_TABLE = [
    { threshold: 0.45, name: "stone", rarity: "common", emoji: "🪨", minCoin: 10, maxCoin: 30, depthMultiplier: 2 },
    { threshold: 0.73, name: "iron", rarity: "uncommon", emoji: "⛓️", minCoin: 40, maxCoin: 80, depthMultiplier: 3 },
    { threshold: 0.88, name: "gold", rarity: "rare", emoji: "🥇", minCoin: 100, maxCoin: 200, depthMultiplier: 5 },
    { threshold: 0.96, name: "diamond", rarity: "epic", emoji: "💎", minCoin: 300, maxCoin: 500, depthMultiplier: 8 },
    { threshold: 1.0, name: "emerald", rarity: "legendary", emoji: "🟢", minCoin: 500, maxCoin: 800, depthMultiplier: 12 },
] as const;

const COLLAPSE_PENALTY_MIN = 50;
const COLLAPSE_PENALTY_MAX = 100;

// --- Helpers ---

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function getCollapseRate(depth: number): number {
    if (depth <= 5) return 0.05;
    if (depth <= 10) return 0.10;
    return 0.15;
}

function rollMineral(depth: number): MineralRollResult {
    const roll = Math.random();
    for (const entry of MINERAL_TABLE) {
        if (roll < entry.threshold) {
            const baseCoin = randomInRange(entry.minCoin, entry.maxCoin);
            const depthBonus = depth * entry.depthMultiplier;
            return {
                name: entry.name,
                rarity: entry.rarity,
                emoji: entry.emoji,
                baseCoin,
                depthBonus,
                totalReward: baseCoin + depthBonus,
            };
        }
    }
    // Fallback to stone
    const baseCoin = randomInRange(10, 30);
    return { name: "stone", rarity: "common", emoji: "🪨", baseCoin, depthBonus: depth * 2, totalReward: baseCoin + depth * 2 };
}

// --- Rarity colors ---

const RARITY_COLORS: Record<string, number> = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    epic: 0xe91e63,
    legendary: 0xf1c40f,
};

function getRarityColor(rarity: string): number {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}

// --- Main mine logic ---

async function mine(userId: string, guildId: string): Promise<MineResult> {
    // Get or create economy record
    const economy = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId, coin: 0, gem: 0, prayStreak: 0, mineDepth: 1, mineCheckpoint: 1 } },
        { upsert: true, new: true }
    );

    const currentDepth = economy.mineDepth ?? 1;
    const currentCheckpoint = economy.mineCheckpoint ?? 1;

    // Roll collapse
    const collapseRate = getCollapseRate(currentDepth);
    if (Math.random() < collapseRate) {
        // Collapse: lose coins + reset to checkpoint
        const penalty = Math.min(randomInRange(COLLAPSE_PENALTY_MIN, COLLAPSE_PENALTY_MAX), economy.coin);

        await UserEconomyModel.updateOne(
            { userId, guildId },
            { $inc: { coin: -penalty }, $set: { mineDepth: currentCheckpoint } }
        );

        if (penalty > 0) {
            await CurrencyService.logTransaction(userId, guildId, -penalty, 0, "mine", { event: "collapse", depth: currentDepth, penalty });
        }

        return {
            collapsed: true,
            mineral: null,
            penalty,
            newDepth: currentCheckpoint,
            checkpoint: currentCheckpoint,
            checkpointReached: false,
        };
    }

    // Success: roll mineral
    const mineral = rollMineral(currentDepth);
    const newDepth = currentDepth + 1;
    const checkpointReached = isPrime(newDepth);
    const newCheckpoint = checkpointReached ? newDepth : currentCheckpoint;

    // Award coins + update depth
    await CurrencyService.addCoin(userId, guildId, mineral.totalReward, "mine", {
        mineral: mineral.name,
        rarity: mineral.rarity,
        depth: currentDepth,
        reward: mineral.totalReward,
    });

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { mineDepth: newDepth, mineCheckpoint: newCheckpoint } }
    );

    return {
        collapsed: false,
        mineral,
        penalty: 0,
        newDepth,
        checkpoint: newCheckpoint,
        checkpointReached,
    };
}

const MineService = { mine, getRarityColor, isPrime };
export default MineService;
```

- [ ] **Step 2: Check if CurrencyService exports logTransaction**

Read `src/services/economy/currency.service.ts` to verify `logTransaction` is exported. If not, use `addCoin` with negative amount for the penalty, or adjust the collapse penalty to use `UserEconomyModel.updateOne` directly (already done above). Remove the `logTransaction` call if it's not exported — the `$inc` update is sufficient.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/services/economy/mine.service.ts
git commit -m "feat(economy): create mine service with mineral roll, collapse, and depth system"
```

---

### Task 3: Add i18n keys for mine command

**Files:**
- Modify: `src/locales/en.json` and 14 other locale files

- [ ] **Step 1: Add mine keys to all 15 locale files**

Add the following keys to each locale file. Place them after the `star_drop.found` key.

**English (en.json):**
```json
    "cmd.mine.desc": "Dig for minerals — go deeper for better rewards",
    "mine.title": "Mining",
    "mine.cooldown": "You're resting. Try again in {{time}}.",
    "mine.success": "You dug at depth **{{depth}}** and found:",
    "mine.reward": "+**{{amount}}** coin",
    "mine.depth": "Depth: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint saved at depth **{{depth}}**!",
    "mine.collapse": "The mine collapsed at depth **{{depth}}**!",
    "mine.collapse_penalty": "You lost **{{amount}}** coin and fell back to depth **{{checkpoint}}**.",
    "mine.mineral.stone": "Stone",
    "mine.mineral.iron": "Iron",
    "mine.mineral.gold": "Gold",
    "mine.mineral.diamond": "Diamond",
    "mine.mineral.emerald": "Emerald",
```

**Vietnamese (vi.json):**
```json
    "cmd.mine.desc": "Đào khoáng sản — càng sâu phần thưởng càng lớn",
    "mine.title": "Đào mỏ",
    "mine.cooldown": "Bạn đang nghỉ ngơi. Thử lại sau {{time}}.",
    "mine.success": "Bạn đào ở độ sâu **{{depth}}** và tìm thấy:",
    "mine.reward": "+**{{amount}}** coin",
    "mine.depth": "Độ sâu: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint đã lưu tại độ sâu **{{depth}}**!",
    "mine.collapse": "Hầm mỏ sập ở độ sâu **{{depth}}**!",
    "mine.collapse_penalty": "Bạn mất **{{amount}}** coin và rơi xuống độ sâu **{{checkpoint}}**.",
    "mine.mineral.stone": "Đá",
    "mine.mineral.iron": "Sắt",
    "mine.mineral.gold": "Vàng",
    "mine.mineral.diamond": "Kim cương",
    "mine.mineral.emerald": "Ngọc lục bảo",
```

**Indonesian (id.json):**
```json
    "cmd.mine.desc": "Tambang mineral — semakin dalam hadiah semakin besar",
    "mine.title": "Menambang",
    "mine.cooldown": "Kamu sedang istirahat. Coba lagi dalam {{time}}.",
    "mine.success": "Kamu menambang di kedalaman **{{depth}}** dan menemukan:",
    "mine.reward": "+**{{amount}}** koin",
    "mine.depth": "Kedalaman: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint tersimpan di kedalaman **{{depth}}**!",
    "mine.collapse": "Tambang runtuh di kedalaman **{{depth}}**!",
    "mine.collapse_penalty": "Kamu kehilangan **{{amount}}** koin dan jatuh ke kedalaman **{{checkpoint}}**.",
    "mine.mineral.stone": "Batu",
    "mine.mineral.iron": "Besi",
    "mine.mineral.gold": "Emas",
    "mine.mineral.diamond": "Berlian",
    "mine.mineral.emerald": "Zamrud",
```

**Spanish (es.json):**
```json
    "cmd.mine.desc": "Minar minerales — más profundo, mejores recompensas",
    "mine.title": "Minería",
    "mine.cooldown": "Estás descansando. Intenta de nuevo en {{time}}.",
    "mine.success": "Minaste a profundidad **{{depth}}** y encontraste:",
    "mine.reward": "+**{{amount}}** monedas",
    "mine.depth": "Profundidad: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "¡Checkpoint guardado en profundidad **{{depth}}**!",
    "mine.collapse": "¡La mina colapsó a profundidad **{{depth}}**!",
    "mine.collapse_penalty": "Perdiste **{{amount}}** monedas y caíste a profundidad **{{checkpoint}}**.",
    "mine.mineral.stone": "Piedra",
    "mine.mineral.iron": "Hierro",
    "mine.mineral.gold": "Oro",
    "mine.mineral.diamond": "Diamante",
    "mine.mineral.emerald": "Esmeralda",
```

**Japanese (ja.json):**
```json
    "cmd.mine.desc": "鉱石を掘ろう — 深いほど報酬アップ",
    "mine.title": "採掘",
    "mine.cooldown": "休憩中。{{time}}後にもう一度。",
    "mine.success": "深さ**{{depth}}**で掘って見つけた：",
    "mine.reward": "+**{{amount}}** コイン",
    "mine.depth": "深さ: **{{depth}}** | チェックポイント: **{{checkpoint}}**",
    "mine.checkpoint_reached": "深さ**{{depth}}**でチェックポイント保存！",
    "mine.collapse": "深さ**{{depth}}**で坑道が崩落！",
    "mine.collapse_penalty": "**{{amount}}**コイン失い、深さ**{{checkpoint}}**に戻った。",
    "mine.mineral.stone": "石",
    "mine.mineral.iron": "鉄",
    "mine.mineral.gold": "金",
    "mine.mineral.diamond": "ダイヤモンド",
    "mine.mineral.emerald": "エメラルド",
```

**Chinese (zh.json):**
```json
    "cmd.mine.desc": "挖掘矿石 — 越深奖励越高",
    "mine.title": "挖矿",
    "mine.cooldown": "你正在休息。{{time}}后再试。",
    "mine.success": "你在深度**{{depth}}**挖掘并发现了：",
    "mine.reward": "+**{{amount}}** 金币",
    "mine.depth": "深度: **{{depth}}** | 存档点: **{{checkpoint}}**",
    "mine.checkpoint_reached": "深度**{{depth}}**存档点已保存！",
    "mine.collapse": "矿井在深度**{{depth}}**坍塌了！",
    "mine.collapse_penalty": "你失去了**{{amount}}**金币，退回深度**{{checkpoint}}**。",
    "mine.mineral.stone": "石头",
    "mine.mineral.iron": "铁",
    "mine.mineral.gold": "黄金",
    "mine.mineral.diamond": "钻石",
    "mine.mineral.emerald": "绿宝石",
```

**Korean (ko.json):**
```json
    "cmd.mine.desc": "광물을 캐세요 — 깊을수록 보상이 커요",
    "mine.title": "채굴",
    "mine.cooldown": "쉬는 중이에요. {{time}} 후에 다시 시도하세요.",
    "mine.success": "깊이 **{{depth}}**에서 채굴하여 발견했어요:",
    "mine.reward": "+**{{amount}}** 코인",
    "mine.depth": "깊이: **{{depth}}** | 체크포인트: **{{checkpoint}}**",
    "mine.checkpoint_reached": "깊이 **{{depth}}**에서 체크포인트 저장!",
    "mine.collapse": "깊이 **{{depth}}**에서 광산이 무너졌어요!",
    "mine.collapse_penalty": "**{{amount}}** 코인을 잃고 깊이 **{{checkpoint}}**(으)로 돌아갔어요.",
    "mine.mineral.stone": "돌",
    "mine.mineral.iron": "철",
    "mine.mineral.gold": "금",
    "mine.mineral.diamond": "다이아몬드",
    "mine.mineral.emerald": "에메랄드",
```

**Portuguese Brazil (pt-BR.json):**
```json
    "cmd.mine.desc": "Minere minerais — mais fundo, melhores recompensas",
    "mine.title": "Mineração",
    "mine.cooldown": "Você está descansando. Tente novamente em {{time}}.",
    "mine.success": "Você minerou na profundidade **{{depth}}** e encontrou:",
    "mine.reward": "+**{{amount}}** moedas",
    "mine.depth": "Profundidade: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint salvo na profundidade **{{depth}}**!",
    "mine.collapse": "A mina desabou na profundidade **{{depth}}**!",
    "mine.collapse_penalty": "Você perdeu **{{amount}}** moedas e caiu para a profundidade **{{checkpoint}}**.",
    "mine.mineral.stone": "Pedra",
    "mine.mineral.iron": "Ferro",
    "mine.mineral.gold": "Ouro",
    "mine.mineral.diamond": "Diamante",
    "mine.mineral.emerald": "Esmeralda",
```

**French (fr.json):**
```json
    "cmd.mine.desc": "Minez des minéraux — plus profond, meilleures récompenses",
    "mine.title": "Minage",
    "mine.cooldown": "Vous vous reposez. Réessayez dans {{time}}.",
    "mine.success": "Vous avez miné à la profondeur **{{depth}}** et trouvé :",
    "mine.reward": "+**{{amount}}** pièces",
    "mine.depth": "Profondeur : **{{depth}}** | Checkpoint : **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint sauvegardé à la profondeur **{{depth}}** !",
    "mine.collapse": "La mine s'est effondrée à la profondeur **{{depth}}** !",
    "mine.collapse_penalty": "Vous avez perdu **{{amount}}** pièces et êtes retombé à la profondeur **{{checkpoint}}**.",
    "mine.mineral.stone": "Pierre",
    "mine.mineral.iron": "Fer",
    "mine.mineral.gold": "Or",
    "mine.mineral.diamond": "Diamant",
    "mine.mineral.emerald": "Émeraude",
```

**German (de.json):**
```json
    "cmd.mine.desc": "Schürfe Mineralien — tiefer graben für bessere Belohnungen",
    "mine.title": "Bergbau",
    "mine.cooldown": "Du ruhst dich aus. Versuche es in {{time}} erneut.",
    "mine.success": "Du hast in Tiefe **{{depth}}** gegraben und gefunden:",
    "mine.reward": "+**{{amount}}** Münzen",
    "mine.depth": "Tiefe: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint bei Tiefe **{{depth}}** gespeichert!",
    "mine.collapse": "Die Mine ist bei Tiefe **{{depth}}** eingestürzt!",
    "mine.collapse_penalty": "Du hast **{{amount}}** Münzen verloren und bist auf Tiefe **{{checkpoint}}** zurückgefallen.",
    "mine.mineral.stone": "Stein",
    "mine.mineral.iron": "Eisen",
    "mine.mineral.gold": "Gold",
    "mine.mineral.diamond": "Diamant",
    "mine.mineral.emerald": "Smaragd",
```

**Russian (ru.json):**
```json
    "cmd.mine.desc": "Добывайте минералы — глубже копай, больше награда",
    "mine.title": "Добыча",
    "mine.cooldown": "Вы отдыхаете. Попробуйте через {{time}}.",
    "mine.success": "Вы копали на глубине **{{depth}}** и нашли:",
    "mine.reward": "+**{{amount}}** монет",
    "mine.depth": "Глубина: **{{depth}}** | Чекпоинт: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Чекпоинт сохранён на глубине **{{depth}}**!",
    "mine.collapse": "Шахта обрушилась на глубине **{{depth}}**!",
    "mine.collapse_penalty": "Вы потеряли **{{amount}}** монет и вернулись на глубину **{{checkpoint}}**.",
    "mine.mineral.stone": "Камень",
    "mine.mineral.iron": "Железо",
    "mine.mineral.gold": "Золото",
    "mine.mineral.diamond": "Алмаз",
    "mine.mineral.emerald": "Изумруд",
```

**Turkish (tr.json):**
```json
    "cmd.mine.desc": "Mineral çıkar — derine in, daha iyi ödüller kazan",
    "mine.title": "Madencilik",
    "mine.cooldown": "Dinleniyorsun. {{time}} sonra tekrar dene.",
    "mine.success": "**{{depth}}** derinliğinde kazdın ve buldun:",
    "mine.reward": "+**{{amount}}** altın",
    "mine.depth": "Derinlik: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "**{{depth}}** derinliğinde checkpoint kaydedildi!",
    "mine.collapse": "Maden **{{depth}}** derinliğinde çöktü!",
    "mine.collapse_penalty": "**{{amount}}** altın kaybettin ve **{{checkpoint}}** derinliğine düştün.",
    "mine.mineral.stone": "Taş",
    "mine.mineral.iron": "Demir",
    "mine.mineral.gold": "Altın",
    "mine.mineral.diamond": "Elmas",
    "mine.mineral.emerald": "Zümrüt",
```

**Italian (it.json):**
```json
    "cmd.mine.desc": "Scava minerali — più in profondità, migliori ricompense",
    "mine.title": "Estrazione",
    "mine.cooldown": "Stai riposando. Riprova tra {{time}}.",
    "mine.success": "Hai scavato alla profondità **{{depth}}** e trovato:",
    "mine.reward": "+**{{amount}}** monete",
    "mine.depth": "Profondità: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint salvato alla profondità **{{depth}}**!",
    "mine.collapse": "La miniera è crollata alla profondità **{{depth}}**!",
    "mine.collapse_penalty": "Hai perso **{{amount}}** monete e sei tornato alla profondità **{{checkpoint}}**.",
    "mine.mineral.stone": "Pietra",
    "mine.mineral.iron": "Ferro",
    "mine.mineral.gold": "Oro",
    "mine.mineral.diamond": "Diamante",
    "mine.mineral.emerald": "Smeraldo",
```

**Polish (pl.json):**
```json
    "cmd.mine.desc": "Wydobywaj minerały — głębiej kopiąc, lepsze nagrody",
    "mine.title": "Górnictwo",
    "mine.cooldown": "Odpoczywasz. Spróbuj ponownie za {{time}}.",
    "mine.success": "Kopałeś na głębokości **{{depth}}** i znalazłeś:",
    "mine.reward": "+**{{amount}}** monet",
    "mine.depth": "Głębokość: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint zapisany na głębokości **{{depth}}**!",
    "mine.collapse": "Kopalnia zawalała się na głębokości **{{depth}}**!",
    "mine.collapse_penalty": "Straciłeś **{{amount}}** monet i spadłeś na głębokość **{{checkpoint}}**.",
    "mine.mineral.stone": "Kamień",
    "mine.mineral.iron": "Żelazo",
    "mine.mineral.gold": "Złoto",
    "mine.mineral.diamond": "Diament",
    "mine.mineral.emerald": "Szmaragd",
```

**Dutch (nl.json):**
```json
    "cmd.mine.desc": "Delf mineralen — dieper graven voor betere beloningen",
    "mine.title": "Mijnbouw",
    "mine.cooldown": "Je rust uit. Probeer het opnieuw over {{time}}.",
    "mine.success": "Je hebt op diepte **{{depth}}** gegraven en gevonden:",
    "mine.reward": "+**{{amount}}** munten",
    "mine.depth": "Diepte: **{{depth}}** | Checkpoint: **{{checkpoint}}**",
    "mine.checkpoint_reached": "Checkpoint opgeslagen op diepte **{{depth}}**!",
    "mine.collapse": "De mijn is ingestort op diepte **{{depth}}**!",
    "mine.collapse_penalty": "Je verloor **{{amount}}** munten en viel terug naar diepte **{{checkpoint}}**.",
    "mine.mineral.stone": "Steen",
    "mine.mineral.iron": "IJzer",
    "mine.mineral.gold": "Goud",
    "mine.mineral.diamond": "Diamant",
    "mine.mineral.emerald": "Smaragd",
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add mine command translation keys for all 15 locales"
```

---

### Task 4: Create mine slash command

**Files:**
- Create: `src/commands/slash/mine.ts`

- [ ] **Step 1: Create the command file**

Create `src/commands/slash/mine.ts`:

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import redis from "../../connector/redis";
import MineService from "../../services/economy/mine.service";
import WorkService from "../../services/economy/work.service";
import Reply from "../../util/decorator/reply";
import { tryStarDrop } from "../../util/economy/starDrop";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const MINE_COOLDOWN = 7200; // 2 hours

export default {
    data: new SlashCommandBuilder()
        .setName("mine")
        .setDescription("Dig for minerals — go deeper for better rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.mine.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            // Check cooldown
            const cdKey = `mine_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "mine.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Execute mine
            const result = await MineService.mine(userId, guildId);

            // Set cooldown
            await redis.setJson(cdKey, 1, MINE_COOLDOWN);

            if (result.collapsed) {
                // Collapse embed
                const embed = new EmbedBuilder()
                    .setTitle(`💥 ${t(locale, "mine.title")}`)
                    .setDescription(
                        [
                            t(locale, "mine.collapse", { depth: String(result.newDepth) }),
                            t(locale, "mine.collapse_penalty", {
                                amount: String(result.penalty),
                                checkpoint: String(result.checkpoint),
                            }),
                        ].join("\n")
                    )
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Success embed
            const mineral = result.mineral!;
            const mineralName = t(locale, `mine.mineral.${mineral.name}`);
            const descLines = [
                t(locale, "mine.success", { depth: String(result.newDepth - 1) }),
                `${mineral.emoji} **${mineralName}**`,
                t(locale, "mine.reward", { amount: String(mineral.totalReward) }),
                "",
                t(locale, "mine.depth", { depth: String(result.newDepth), checkpoint: String(result.checkpoint) }),
            ];

            if (result.checkpointReached) {
                descLines.push("🔖 " + t(locale, "mine.checkpoint_reached", { depth: String(result.newDepth) }));
            }

            // Star drop
            const gotStar = await tryStarDrop(userId, 0.04, "mine");
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }

            const embed = new EmbedBuilder()
                .setTitle(`⛏️ ${t(locale, "mine.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(MineService.getRarityColor(mineral.rarity));

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/mine.ts
git commit -m "feat(economy): add /mine slash command with depth and checkpoint system"
```

---

### Task 5: Add mine to help categories

**Files:**
- Modify: `src/util/help/commandCategories.ts`

- [ ] **Step 1: Add mine to economy category**

In `src/util/help/commandCategories.ts`, add after the `rob: "economy"` line:

```typescript
    mine: "economy",
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/help/commandCategories.ts
git commit -m "feat(help): add mine command to economy category"
```
