# NPC Merchant & Multi-Encounter Dungeon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `/dungeon` from single-encounter to multi-encounter runs (max 5) and add an interactive NPC merchant with heal, buff, and coin→gem exchange services.

**Architecture:** Approach 2 — separate `merchant.service.ts` for merchant pricing/logic, extend `dungeon.service.ts` with run lifecycle (`startRun`, `rollNextEncounter`, `endRun`) and buff-aware combat. Run state persisted in Redis (`dungeon_run:{userId}`, 900s TTL). 5 new button handlers (3 merchant + continue/leave). Existing combat buttons modified to update run state and show continue/leave after resolution.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, ioredis, i18next (15 locales)

**Spec:** `docs/superpowers/specs/2026-04-11-npc-merchant-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|----------------|
| `src/services/economy/merchant.service.ts` | Pricing formulas, heal calc, buff roll, exchange rate |
| `src/buttons/dungeonHeal.button.ts` | Heal button handler |
| `src/buttons/dungeonBuff.button.ts` | Buff button handler |
| `src/buttons/dungeonExchange.button.ts` | Exchange button handler |
| `src/buttons/dungeonContinue.button.ts` | Continue (go deeper) button handler |
| `src/buttons/dungeonLeave.button.ts` | Leave dungeon button handler |

### Modified Files

| File | Change |
|------|--------|
| `src/util/config/button.ts` | Add 5 new button IDs |
| `src/services/economy/dungeon.service.ts` | Add `DungeonRunState`, `Buff` types; add `startRun`, `rollNextEncounter`, `endRun`, `tickBuff`; modify `rollEncounterType` for luck buff; modify `processCombatAction` for attack/defense buff; modify `rollEncounter` to accept `runState` |
| `src/commands/slash/dungeon.ts` | Rewrite to multi-encounter run flow; add merchant/continue/leave embed builders |
| `src/buttons/dungeonAttack.button.ts` | After combat resolve → update run state → show continue/leave |
| `src/buttons/dungeonDefend.button.ts` | No changes needed (delegates to `handleCombatAction`) |
| `src/buttons/dungeonRun.button.ts` | After flee → show continue/leave instead of final embed |
| `src/locales/*.json` (15 files) | Add 24 new i18n keys |

---

### Task 1: Add Button IDs

**Files:**
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add 5 new dungeon button IDs**

In `src/util/config/button.ts`, add these entries after the existing `DUNGEON_RUN` line:

```typescript
// Dungeon merchant buttons
DUNGEON_HEAL: "dungeon_heal",
DUNGEON_BUFF: "dungeon_buff",
DUNGEON_EXCHANGE: "dungeon_exchange",
// Dungeon run flow buttons
DUNGEON_CONTINUE: "dungeon_continue",
DUNGEON_LEAVE: "dungeon_leave",
```

The full `BUTTON_ID` object should end with:

```typescript
// Dungeon combat buttons
DUNGEON_ATTACK: "dungeon_attack",
DUNGEON_DEFEND: "dungeon_defend",
DUNGEON_RUN: "dungeon_run",
// Dungeon merchant buttons
DUNGEON_HEAL: "dungeon_heal",
DUNGEON_BUFF: "dungeon_buff",
DUNGEON_EXCHANGE: "dungeon_exchange",
// Dungeon run flow buttons
DUNGEON_CONTINUE: "dungeon_continue",
DUNGEON_LEAVE: "dungeon_leave",
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to button.ts

- [ ] **Step 3: Commit**

```bash
git add src/util/config/button.ts
git commit -m "feat(dungeon): add merchant and run flow button IDs"
```

---

### Task 2: Add i18n Keys (All 15 Locales)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/vi.json`, `src/locales/id.json`, `src/locales/es.json`, `src/locales/ja.json`, `src/locales/zh.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/fr.json`, `src/locales/de.json`, `src/locales/ru.json`, `src/locales/tr.json`, `src/locales/it.json`, `src/locales/pl.json`, `src/locales/nl.json`

- [ ] **Step 1: Add 24 keys to `en.json`**

Add these keys after the existing `"dungeon.btn.run": "Run"` line in `src/locales/en.json`:

```json
"dungeon.merchant.title": "A mysterious merchant appears on floor **{{floor}}**!",
"dungeon.merchant.greeting": "\"Welcome, adventurer! What can I do for you?\"",
"dungeon.merchant.heal_option": "Restore **{{amount}}** HP (Cost: **{{cost}}** coin)",
"dungeon.merchant.buff_option": "**{{buffType}}** boost for remaining encounters (Cost: **{{cost}}** coin)",
"dungeon.merchant.exchange_option": "1 gem (Cost: **{{rate}}** coin)",
"dungeon.merchant.heal_result": "The merchant heals you for **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "You gained **{{buffType}}** boost for **{{turns}}** encounters!",
"dungeon.merchant.exchange_result": "Exchanged **{{cost}}** coin for **1** gem.",
"dungeon.merchant.no_coin": "Not enough coin!",
"dungeon.merchant.hp_full": "Your HP is already full!",
"dungeon.merchant.timeout": "The merchant vanishes into the shadows...",
"dungeon.merchant.buff_replaced": "New buff replaced your previous **{{oldBuff}}** buff.",
"dungeon.run.continue": "Go deeper? (**{{left}}** encounters remaining)",
"dungeon.run.leave": "You leave the dungeon with your rewards.",
"dungeon.run.max_reached": "You've explored as far as you can this run.",
"dungeon.run.timeout": "You waited too long — the dungeon collapses around you.",
"dungeon.run.in_progress": "You're already exploring the dungeon! Finish your current run first.",
"dungeon.btn.heal": "Heal",
"dungeon.btn.buff": "Buff",
"dungeon.btn.exchange": "Exchange",
"dungeon.btn.continue": "Go Deeper",
"dungeon.btn.leave": "Leave",
"dungeon.buff.attack": "Attack +30%",
"dungeon.buff.defense": "Defense +30%",
"dungeon.buff.luck": "Luck"
```

Note: also update the existing `"dungeon.encounter.npc"` key from `"A mysterious merchant waves at you..."` to `"A mysterious merchant appears on floor **{{floor}}**!"` — wait, the merchant title key already covers this. Keep `dungeon.encounter.npc` as-is for the encounter type label; the merchant embed uses `dungeon.merchant.title` + `dungeon.merchant.greeting` instead.

- [ ] **Step 2: Add 24 keys to `vi.json`**

Add after `"dungeon.btn.run": "Bỏ chạy"`:

```json
"dungeon.merchant.title": "Một thương nhân bí ẩn xuất hiện ở tầng **{{floor}}**!",
"dungeon.merchant.greeting": "\"Chào mừng, nhà thám hiểm! Tôi có thể giúp gì cho bạn?\"",
"dungeon.merchant.heal_option": "Hồi phục **{{amount}}** HP (Giá: **{{cost}}** coin)",
"dungeon.merchant.buff_option": "Tăng cường **{{buffType}}** cho các lượt còn lại (Giá: **{{cost}}** coin)",
"dungeon.merchant.exchange_option": "1 gem (Giá: **{{rate}}** coin)",
"dungeon.merchant.heal_result": "Thương nhân hồi phục **{{amount}}** HP cho bạn. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Bạn nhận được tăng cường **{{buffType}}** trong **{{turns}}** lượt!",
"dungeon.merchant.exchange_result": "Đổi **{{cost}}** coin lấy **1** gem.",
"dungeon.merchant.no_coin": "Không đủ coin!",
"dungeon.merchant.hp_full": "HP của bạn đã đầy!",
"dungeon.merchant.timeout": "Thương nhân biến mất vào bóng tối...",
"dungeon.merchant.buff_replaced": "Tăng cường mới thay thế **{{oldBuff}}** trước đó.",
"dungeon.run.continue": "Đi sâu hơn? (Còn **{{left}}** lượt)",
"dungeon.run.leave": "Bạn rời khỏi hầm ngục với phần thưởng.",
"dungeon.run.max_reached": "Bạn đã khám phá hết mức có thể trong lượt này.",
"dungeon.run.timeout": "Bạn chờ quá lâu — hầm ngục sụp đổ quanh bạn.",
"dungeon.run.in_progress": "Bạn đang trong hầm ngục! Hãy hoàn thành lượt hiện tại trước.",
"dungeon.btn.heal": "Hồi máu",
"dungeon.btn.buff": "Tăng sức",
"dungeon.btn.exchange": "Đổi gem",
"dungeon.btn.continue": "Đi tiếp",
"dungeon.btn.leave": "Rời đi",
"dungeon.buff.attack": "Tấn công +30%",
"dungeon.buff.defense": "Phòng thủ +30%",
"dungeon.buff.luck": "May mắn"
```

- [ ] **Step 3: Add 24 keys to all remaining 13 locale files**

For each of the remaining 13 locale files (`id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`), add the same 24 keys with **native translations**. All translations must be in the target language — never commit English placeholder text in non-EN files. Place keys after the existing `dungeon.btn.run` entry.

Native translations per locale:

**id.json (Indonesian):**
```json
"dungeon.merchant.title": "Seorang pedagang misterius muncul di lantai **{{floor}}**!",
"dungeon.merchant.greeting": "\"Selamat datang, petualang! Apa yang bisa saya bantu?\"",
"dungeon.merchant.heal_option": "Pulihkan **{{amount}}** HP (Harga: **{{cost}}** koin)",
"dungeon.merchant.buff_option": "Peningkatan **{{buffType}}** untuk pertemuan tersisa (Harga: **{{cost}}** koin)",
"dungeon.merchant.exchange_option": "1 gem (Harga: **{{rate}}** koin)",
"dungeon.merchant.heal_result": "Pedagang memulihkan **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Kamu mendapat peningkatan **{{buffType}}** selama **{{turns}}** pertemuan!",
"dungeon.merchant.exchange_result": "Menukar **{{cost}}** koin untuk **1** gem.",
"dungeon.merchant.no_coin": "Koin tidak cukup!",
"dungeon.merchant.hp_full": "HP kamu sudah penuh!",
"dungeon.merchant.timeout": "Pedagang menghilang ke dalam bayangan...",
"dungeon.merchant.buff_replaced": "Peningkatan baru menggantikan **{{oldBuff}}** sebelumnya.",
"dungeon.run.continue": "Pergi lebih dalam? (Tersisa **{{left}}** pertemuan)",
"dungeon.run.leave": "Kamu meninggalkan dungeon dengan hadiahmu.",
"dungeon.run.max_reached": "Kamu sudah menjelajah sejauh mungkin dalam putaran ini.",
"dungeon.run.timeout": "Kamu menunggu terlalu lama — dungeon runtuh di sekitarmu.",
"dungeon.run.in_progress": "Kamu sedang dalam dungeon! Selesaikan putaran saat ini dulu.",
"dungeon.btn.heal": "Pulihkan",
"dungeon.btn.buff": "Buff",
"dungeon.btn.exchange": "Tukar",
"dungeon.btn.continue": "Lanjut",
"dungeon.btn.leave": "Keluar",
"dungeon.buff.attack": "Serangan +30%",
"dungeon.buff.defense": "Pertahanan +30%",
"dungeon.buff.luck": "Keberuntungan"
```

**es.json (Spanish):**
```json
"dungeon.merchant.title": "¡Un misterioso mercader aparece en el piso **{{floor}}**!",
"dungeon.merchant.greeting": "\"¡Bienvenido, aventurero! ¿En qué puedo ayudarte?\"",
"dungeon.merchant.heal_option": "Restaurar **{{amount}}** HP (Costo: **{{cost}}** monedas)",
"dungeon.merchant.buff_option": "Mejora de **{{buffType}}** para los encuentros restantes (Costo: **{{cost}}** monedas)",
"dungeon.merchant.exchange_option": "1 gema (Costo: **{{rate}}** monedas)",
"dungeon.merchant.heal_result": "El mercader te cura **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "¡Obtuviste mejora de **{{buffType}}** por **{{turns}}** encuentros!",
"dungeon.merchant.exchange_result": "Intercambiaste **{{cost}}** monedas por **1** gema.",
"dungeon.merchant.no_coin": "¡No tienes suficientes monedas!",
"dungeon.merchant.hp_full": "¡Tu HP ya está al máximo!",
"dungeon.merchant.timeout": "El mercader desaparece en las sombras...",
"dungeon.merchant.buff_replaced": "La nueva mejora reemplazó tu **{{oldBuff}}** anterior.",
"dungeon.run.continue": "¿Ir más profundo? (Quedan **{{left}}** encuentros)",
"dungeon.run.leave": "Sales de la mazmorra con tus recompensas.",
"dungeon.run.max_reached": "Has explorado lo máximo posible en esta ronda.",
"dungeon.run.timeout": "Esperaste demasiado — la mazmorra colapsa a tu alrededor.",
"dungeon.run.in_progress": "¡Ya estás en la mazmorra! Termina tu ronda actual primero.",
"dungeon.btn.heal": "Curar",
"dungeon.btn.buff": "Mejora",
"dungeon.btn.exchange": "Cambiar",
"dungeon.btn.continue": "Continuar",
"dungeon.btn.leave": "Salir",
"dungeon.buff.attack": "Ataque +30%",
"dungeon.buff.defense": "Defensa +30%",
"dungeon.buff.luck": "Suerte"
```

**ja.json (Japanese):**
```json
"dungeon.merchant.title": "謎の商人がフロア**{{floor}}**に現れた！",
"dungeon.merchant.greeting": "「ようこそ、冒険者よ！何かお手伝いしましょうか？」",
"dungeon.merchant.heal_option": "**{{amount}}** HP回復（コスト：**{{cost}}** コイン）",
"dungeon.merchant.buff_option": "残りの遭遇に**{{buffType}}**ブースト（コスト：**{{cost}}** コイン）",
"dungeon.merchant.exchange_option": "1ジェム（コスト：**{{rate}}** コイン）",
"dungeon.merchant.heal_result": "商人が**{{amount}}** HPを回復してくれた。（HP：**{{hp}}**/100）",
"dungeon.merchant.buff_result": "**{{buffType}}**ブーストを**{{turns}}**回の遭遇分獲得！",
"dungeon.merchant.exchange_result": "**{{cost}}** コインを**1**ジェムに交換した。",
"dungeon.merchant.no_coin": "コインが足りない！",
"dungeon.merchant.hp_full": "HPはすでに満タンです！",
"dungeon.merchant.timeout": "商人は闇の中に消えていった...",
"dungeon.merchant.buff_replaced": "新しいブーストが以前の**{{oldBuff}}**を置き換えた。",
"dungeon.run.continue": "さらに深く？（残り**{{left}}**回の遭遇）",
"dungeon.run.leave": "報酬を持ってダンジョンを去った。",
"dungeon.run.max_reached": "今回の探索はここまでです。",
"dungeon.run.timeout": "待ちすぎた — ダンジョンが崩壊する。",
"dungeon.run.in_progress": "すでにダンジョン探索中です！現在の探索を終えてください。",
"dungeon.btn.heal": "回復",
"dungeon.btn.buff": "強化",
"dungeon.btn.exchange": "交換",
"dungeon.btn.continue": "先へ進む",
"dungeon.btn.leave": "去る",
"dungeon.buff.attack": "攻撃+30%",
"dungeon.buff.defense": "防御+30%",
"dungeon.buff.luck": "幸運"
```

**zh.json (Chinese):**
```json
"dungeon.merchant.title": "一位神秘商人出现在第**{{floor}}**层！",
"dungeon.merchant.greeting": "\"欢迎，冒险者！我能为你做什么？\"",
"dungeon.merchant.heal_option": "恢复**{{amount}}** HP（费用：**{{cost}}**金币）",
"dungeon.merchant.buff_option": "剩余遭遇**{{buffType}}**增益（费用：**{{cost}}**金币）",
"dungeon.merchant.exchange_option": "1宝石（费用：**{{rate}}**金币）",
"dungeon.merchant.heal_result": "商人为你恢复了**{{amount}}** HP。（HP：**{{hp}}**/100）",
"dungeon.merchant.buff_result": "你获得了**{{buffType}}**增益，持续**{{turns}}**次遭遇！",
"dungeon.merchant.exchange_result": "用**{{cost}}**金币兑换了**1**宝石。",
"dungeon.merchant.no_coin": "金币不足！",
"dungeon.merchant.hp_full": "你的HP已满！",
"dungeon.merchant.timeout": "商人消失在阴影中...",
"dungeon.merchant.buff_replaced": "新增益替换了之前的**{{oldBuff}}**。",
"dungeon.run.continue": "继续深入？（剩余**{{left}}**次遭遇）",
"dungeon.run.leave": "你带着奖励离开了地牢。",
"dungeon.run.max_reached": "你已探索到本次的极限。",
"dungeon.run.timeout": "你等待太久了——地牢在你周围崩塌。",
"dungeon.run.in_progress": "你已在地牢中！请先完成当前探索。",
"dungeon.btn.heal": "治疗",
"dungeon.btn.buff": "增益",
"dungeon.btn.exchange": "兑换",
"dungeon.btn.continue": "继续",
"dungeon.btn.leave": "离开",
"dungeon.buff.attack": "攻击+30%",
"dungeon.buff.defense": "防御+30%",
"dungeon.buff.luck": "幸运"
```

**ko.json (Korean):**
```json
"dungeon.merchant.title": "신비로운 상인이 **{{floor}}**층에 나타났다!",
"dungeon.merchant.greeting": "\"환영합니다, 모험가여! 무엇을 도와드릴까요?\"",
"dungeon.merchant.heal_option": "**{{amount}}** HP 회복 (비용: **{{cost}}** 코인)",
"dungeon.merchant.buff_option": "남은 조우에 **{{buffType}}** 강화 (비용: **{{cost}}** 코인)",
"dungeon.merchant.exchange_option": "1 젬 (비용: **{{rate}}** 코인)",
"dungeon.merchant.heal_result": "상인이 **{{amount}}** HP를 회복해줬다. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "**{{buffType}}** 강화를 **{{turns}}**번의 조우 동안 획득!",
"dungeon.merchant.exchange_result": "**{{cost}}** 코인을 **1** 젬으로 교환했다.",
"dungeon.merchant.no_coin": "코인이 부족합니다!",
"dungeon.merchant.hp_full": "HP가 이미 가득 찼습니다!",
"dungeon.merchant.timeout": "상인이 어둠 속으로 사라졌다...",
"dungeon.merchant.buff_replaced": "새로운 강화가 이전 **{{oldBuff}}**를 대체했다.",
"dungeon.run.continue": "더 깊이 갈까요? (남은 조우 **{{left}}**회)",
"dungeon.run.leave": "보상을 가지고 던전을 떠났다.",
"dungeon.run.max_reached": "이번 탐험에서 가능한 한 멀리 탐색했습니다.",
"dungeon.run.timeout": "너무 오래 기다렸다 — 던전이 무너진다.",
"dungeon.run.in_progress": "이미 던전 탐험 중입니다! 현재 탐험을 먼저 끝내세요.",
"dungeon.btn.heal": "치료",
"dungeon.btn.buff": "강화",
"dungeon.btn.exchange": "교환",
"dungeon.btn.continue": "계속",
"dungeon.btn.leave": "떠나기",
"dungeon.buff.attack": "공격 +30%",
"dungeon.buff.defense": "방어 +30%",
"dungeon.buff.luck": "행운"
```

**pt-BR.json (Portuguese Brazil):**
```json
"dungeon.merchant.title": "Um mercador misterioso aparece no andar **{{floor}}**!",
"dungeon.merchant.greeting": "\"Bem-vindo, aventureiro! O que posso fazer por você?\"",
"dungeon.merchant.heal_option": "Restaurar **{{amount}}** HP (Custo: **{{cost}}** moedas)",
"dungeon.merchant.buff_option": "Bônus de **{{buffType}}** para encontros restantes (Custo: **{{cost}}** moedas)",
"dungeon.merchant.exchange_option": "1 gema (Custo: **{{rate}}** moedas)",
"dungeon.merchant.heal_result": "O mercador curou **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Você ganhou bônus de **{{buffType}}** por **{{turns}}** encontros!",
"dungeon.merchant.exchange_result": "Trocou **{{cost}}** moedas por **1** gema.",
"dungeon.merchant.no_coin": "Moedas insuficientes!",
"dungeon.merchant.hp_full": "Seu HP já está cheio!",
"dungeon.merchant.timeout": "O mercador desaparece nas sombras...",
"dungeon.merchant.buff_replaced": "Novo bônus substituiu seu **{{oldBuff}}** anterior.",
"dungeon.run.continue": "Ir mais fundo? (**{{left}}** encontros restantes)",
"dungeon.run.leave": "Você sai da masmorra com suas recompensas.",
"dungeon.run.max_reached": "Você explorou o máximo possível nesta rodada.",
"dungeon.run.timeout": "Você esperou demais — a masmorra desmorona ao seu redor.",
"dungeon.run.in_progress": "Você já está na masmorra! Termine sua rodada atual primeiro.",
"dungeon.btn.heal": "Curar",
"dungeon.btn.buff": "Bônus",
"dungeon.btn.exchange": "Trocar",
"dungeon.btn.continue": "Continuar",
"dungeon.btn.leave": "Sair",
"dungeon.buff.attack": "Ataque +30%",
"dungeon.buff.defense": "Defesa +30%",
"dungeon.buff.luck": "Sorte"
```

**fr.json (French):**
```json
"dungeon.merchant.title": "Un marchand mystérieux apparaît à l'étage **{{floor}}** !",
"dungeon.merchant.greeting": "\"Bienvenue, aventurier ! Que puis-je faire pour vous ?\"",
"dungeon.merchant.heal_option": "Restaurer **{{amount}}** HP (Coût : **{{cost}}** pièces)",
"dungeon.merchant.buff_option": "Bonus **{{buffType}}** pour les rencontres restantes (Coût : **{{cost}}** pièces)",
"dungeon.merchant.exchange_option": "1 gemme (Coût : **{{rate}}** pièces)",
"dungeon.merchant.heal_result": "Le marchand vous soigne de **{{amount}}** HP. (HP : **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Vous avez obtenu le bonus **{{buffType}}** pour **{{turns}}** rencontres !",
"dungeon.merchant.exchange_result": "Échangé **{{cost}}** pièces contre **1** gemme.",
"dungeon.merchant.no_coin": "Pas assez de pièces !",
"dungeon.merchant.hp_full": "Vos HP sont déjà au maximum !",
"dungeon.merchant.timeout": "Le marchand disparaît dans l'ombre...",
"dungeon.merchant.buff_replaced": "Le nouveau bonus a remplacé votre **{{oldBuff}}** précédent.",
"dungeon.run.continue": "Aller plus profond ? (**{{left}}** rencontres restantes)",
"dungeon.run.leave": "Vous quittez le donjon avec vos récompenses.",
"dungeon.run.max_reached": "Vous avez exploré autant que possible cette fois.",
"dungeon.run.timeout": "Vous avez trop attendu — le donjon s'effondre autour de vous.",
"dungeon.run.in_progress": "Vous êtes déjà dans le donjon ! Terminez votre exploration en cours.",
"dungeon.btn.heal": "Soigner",
"dungeon.btn.buff": "Bonus",
"dungeon.btn.exchange": "Échanger",
"dungeon.btn.continue": "Continuer",
"dungeon.btn.leave": "Quitter",
"dungeon.buff.attack": "Attaque +30%",
"dungeon.buff.defense": "Défense +30%",
"dungeon.buff.luck": "Chance"
```

**de.json (German):**
```json
"dungeon.merchant.title": "Ein mysteriöser Händler erscheint auf Ebene **{{floor}}**!",
"dungeon.merchant.greeting": "\"Willkommen, Abenteurer! Was kann ich für dich tun?\"",
"dungeon.merchant.heal_option": "**{{amount}}** HP wiederherstellen (Kosten: **{{cost}}** Münzen)",
"dungeon.merchant.buff_option": "**{{buffType}}**-Verstärkung für verbleibende Begegnungen (Kosten: **{{cost}}** Münzen)",
"dungeon.merchant.exchange_option": "1 Edelstein (Kosten: **{{rate}}** Münzen)",
"dungeon.merchant.heal_result": "Der Händler heilt dich um **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Du hast **{{buffType}}**-Verstärkung für **{{turns}}** Begegnungen erhalten!",
"dungeon.merchant.exchange_result": "**{{cost}}** Münzen gegen **1** Edelstein getauscht.",
"dungeon.merchant.no_coin": "Nicht genug Münzen!",
"dungeon.merchant.hp_full": "Deine HP sind bereits voll!",
"dungeon.merchant.timeout": "Der Händler verschwindet in den Schatten...",
"dungeon.merchant.buff_replaced": "Neue Verstärkung hat dein vorheriges **{{oldBuff}}** ersetzt.",
"dungeon.run.continue": "Tiefer gehen? (**{{left}}** Begegnungen übrig)",
"dungeon.run.leave": "Du verlässt den Kerker mit deinen Belohnungen.",
"dungeon.run.max_reached": "Du hast so weit wie möglich erkundet.",
"dungeon.run.timeout": "Du hast zu lange gewartet — der Kerker stürzt um dich ein.",
"dungeon.run.in_progress": "Du bist bereits im Kerker! Beende zuerst deinen aktuellen Durchlauf.",
"dungeon.btn.heal": "Heilen",
"dungeon.btn.buff": "Stärken",
"dungeon.btn.exchange": "Tauschen",
"dungeon.btn.continue": "Weiter",
"dungeon.btn.leave": "Verlassen",
"dungeon.buff.attack": "Angriff +30%",
"dungeon.buff.defense": "Verteidigung +30%",
"dungeon.buff.luck": "Glück"
```

**ru.json (Russian):**
```json
"dungeon.merchant.title": "Таинственный торговец появился на этаже **{{floor}}**!",
"dungeon.merchant.greeting": "\"Добро пожаловать, искатель приключений! Чем могу помочь?\"",
"dungeon.merchant.heal_option": "Восстановить **{{amount}}** HP (Цена: **{{cost}}** монет)",
"dungeon.merchant.buff_option": "Усиление **{{buffType}}** на оставшиеся встречи (Цена: **{{cost}}** монет)",
"dungeon.merchant.exchange_option": "1 самоцвет (Цена: **{{rate}}** монет)",
"dungeon.merchant.heal_result": "Торговец исцелил вас на **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Вы получили усиление **{{buffType}}** на **{{turns}}** встреч!",
"dungeon.merchant.exchange_result": "Обменяли **{{cost}}** монет на **1** самоцвет.",
"dungeon.merchant.no_coin": "Недостаточно монет!",
"dungeon.merchant.hp_full": "Ваше HP уже полное!",
"dungeon.merchant.timeout": "Торговец исчезает в тенях...",
"dungeon.merchant.buff_replaced": "Новое усиление заменило ваше предыдущее **{{oldBuff}}**.",
"dungeon.run.continue": "Идти глубже? (Осталось **{{left}}** встреч)",
"dungeon.run.leave": "Вы покидаете подземелье с наградами.",
"dungeon.run.max_reached": "Вы исследовали всё, что можно в этом заходе.",
"dungeon.run.timeout": "Вы ждали слишком долго — подземелье обрушивается вокруг вас.",
"dungeon.run.in_progress": "Вы уже в подземелье! Сначала завершите текущий заход.",
"dungeon.btn.heal": "Лечение",
"dungeon.btn.buff": "Усиление",
"dungeon.btn.exchange": "Обмен",
"dungeon.btn.continue": "Дальше",
"dungeon.btn.leave": "Уйти",
"dungeon.buff.attack": "Атака +30%",
"dungeon.buff.defense": "Защита +30%",
"dungeon.buff.luck": "Удача"
```

**tr.json (Turkish):**
```json
"dungeon.merchant.title": "Gizemli bir tüccar **{{floor}}**. katta belirdi!",
"dungeon.merchant.greeting": "\"Hoş geldin, maceracı! Sana nasıl yardımcı olabilirim?\"",
"dungeon.merchant.heal_option": "**{{amount}}** HP yenile (Maliyet: **{{cost}}** altın)",
"dungeon.merchant.buff_option": "Kalan karşılaşmalar için **{{buffType}}** güçlendirmesi (Maliyet: **{{cost}}** altın)",
"dungeon.merchant.exchange_option": "1 mücevher (Maliyet: **{{rate}}** altın)",
"dungeon.merchant.heal_result": "Tüccar seni **{{amount}}** HP iyileştirdi. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "**{{turns}}** karşılaşma boyunca **{{buffType}}** güçlendirmesi kazandın!",
"dungeon.merchant.exchange_result": "**{{cost}}** altın karşılığında **1** mücevher aldın.",
"dungeon.merchant.no_coin": "Yeterli altın yok!",
"dungeon.merchant.hp_full": "HP'n zaten dolu!",
"dungeon.merchant.timeout": "Tüccar gölgelerde kayboldu...",
"dungeon.merchant.buff_replaced": "Yeni güçlendirme önceki **{{oldBuff}}** ile değiştirildi.",
"dungeon.run.continue": "Daha derine in? (Kalan **{{left}}** karşılaşma)",
"dungeon.run.leave": "Ödüllerinle zindandan ayrıldın.",
"dungeon.run.max_reached": "Bu turda olabildiğince keşfettin.",
"dungeon.run.timeout": "Çok uzun bekledin — zindan etrafında çöküyor.",
"dungeon.run.in_progress": "Zaten zindandasın! Önce mevcut turunu bitir.",
"dungeon.btn.heal": "İyileştir",
"dungeon.btn.buff": "Güçlendir",
"dungeon.btn.exchange": "Değiştir",
"dungeon.btn.continue": "Devam",
"dungeon.btn.leave": "Ayrıl",
"dungeon.buff.attack": "Saldırı +%30",
"dungeon.buff.defense": "Savunma +%30",
"dungeon.buff.luck": "Şans"
```

**it.json (Italian):**
```json
"dungeon.merchant.title": "Un misterioso mercante appare al piano **{{floor}}**!",
"dungeon.merchant.greeting": "\"Benvenuto, avventuriero! Come posso aiutarti?\"",
"dungeon.merchant.heal_option": "Ripristina **{{amount}}** HP (Costo: **{{cost}}** monete)",
"dungeon.merchant.buff_option": "Potenziamento **{{buffType}}** per gli incontri rimanenti (Costo: **{{cost}}** monete)",
"dungeon.merchant.exchange_option": "1 gemma (Costo: **{{rate}}** monete)",
"dungeon.merchant.heal_result": "Il mercante ti cura di **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Hai ottenuto il potenziamento **{{buffType}}** per **{{turns}}** incontri!",
"dungeon.merchant.exchange_result": "Scambiate **{{cost}}** monete per **1** gemma.",
"dungeon.merchant.no_coin": "Monete insufficienti!",
"dungeon.merchant.hp_full": "I tuoi HP sono già al massimo!",
"dungeon.merchant.timeout": "Il mercante svanisce nell'ombra...",
"dungeon.merchant.buff_replaced": "Il nuovo potenziamento ha sostituito il tuo **{{oldBuff}}** precedente.",
"dungeon.run.continue": "Andare più in profondità? (**{{left}}** incontri rimanenti)",
"dungeon.run.leave": "Lasci il dungeon con le tue ricompense.",
"dungeon.run.max_reached": "Hai esplorato il più possibile in questo turno.",
"dungeon.run.timeout": "Hai aspettato troppo — il dungeon crolla intorno a te.",
"dungeon.run.in_progress": "Sei già nel dungeon! Finisci prima il turno attuale.",
"dungeon.btn.heal": "Cura",
"dungeon.btn.buff": "Potenzia",
"dungeon.btn.exchange": "Scambia",
"dungeon.btn.continue": "Continua",
"dungeon.btn.leave": "Esci",
"dungeon.buff.attack": "Attacco +30%",
"dungeon.buff.defense": "Difesa +30%",
"dungeon.buff.luck": "Fortuna"
```

**pl.json (Polish):**
```json
"dungeon.merchant.title": "Tajemniczy kupiec pojawia się na piętrze **{{floor}}**!",
"dungeon.merchant.greeting": "\"Witaj, poszukiwaczu przygód! Czym mogę służyć?\"",
"dungeon.merchant.heal_option": "Przywróć **{{amount}}** HP (Koszt: **{{cost}}** monet)",
"dungeon.merchant.buff_option": "Wzmocnienie **{{buffType}}** na pozostałe spotkania (Koszt: **{{cost}}** monet)",
"dungeon.merchant.exchange_option": "1 klejnot (Koszt: **{{rate}}** monet)",
"dungeon.merchant.heal_result": "Kupiec uleczył cię o **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Otrzymałeś wzmocnienie **{{buffType}}** na **{{turns}}** spotkań!",
"dungeon.merchant.exchange_result": "Wymieniono **{{cost}}** monet na **1** klejnot.",
"dungeon.merchant.no_coin": "Za mało monet!",
"dungeon.merchant.hp_full": "Twoje HP jest już pełne!",
"dungeon.merchant.timeout": "Kupiec znika w cieniu...",
"dungeon.merchant.buff_replaced": "Nowe wzmocnienie zastąpiło twoje poprzednie **{{oldBuff}}**.",
"dungeon.run.continue": "Iść głębiej? (Pozostało **{{left}}** spotkań)",
"dungeon.run.leave": "Opuszczasz loch ze swoimi nagrodami.",
"dungeon.run.max_reached": "Zbadałeś tyle, ile było możliwe w tej rundzie.",
"dungeon.run.timeout": "Czekałeś zbyt długo — loch wali się wokół ciebie.",
"dungeon.run.in_progress": "Jesteś już w lochu! Najpierw zakończ bieżącą rundę.",
"dungeon.btn.heal": "Lecz",
"dungeon.btn.buff": "Wzmocnij",
"dungeon.btn.exchange": "Wymień",
"dungeon.btn.continue": "Dalej",
"dungeon.btn.leave": "Wyjdź",
"dungeon.buff.attack": "Atak +30%",
"dungeon.buff.defense": "Obrona +30%",
"dungeon.buff.luck": "Szczęście"
```

**nl.json (Dutch):**
```json
"dungeon.merchant.title": "Een mysterieuze handelaar verschijnt op verdieping **{{floor}}**!",
"dungeon.merchant.greeting": "\"Welkom, avonturier! Wat kan ik voor je doen?\"",
"dungeon.merchant.heal_option": "Herstel **{{amount}}** HP (Kosten: **{{cost}}** munten)",
"dungeon.merchant.buff_option": "**{{buffType}}** versterking voor resterende ontmoetingen (Kosten: **{{cost}}** munten)",
"dungeon.merchant.exchange_option": "1 edelsteen (Kosten: **{{rate}}** munten)",
"dungeon.merchant.heal_result": "De handelaar geneest je voor **{{amount}}** HP. (HP: **{{hp}}**/100)",
"dungeon.merchant.buff_result": "Je hebt **{{buffType}}** versterking gekregen voor **{{turns}}** ontmoetingen!",
"dungeon.merchant.exchange_result": "**{{cost}}** munten geruild voor **1** edelsteen.",
"dungeon.merchant.no_coin": "Niet genoeg munten!",
"dungeon.merchant.hp_full": "Je HP is al vol!",
"dungeon.merchant.timeout": "De handelaar verdwijnt in de schaduwen...",
"dungeon.merchant.buff_replaced": "Nieuwe versterking verving je vorige **{{oldBuff}}**.",
"dungeon.run.continue": "Dieper gaan? (**{{left}}** ontmoetingen over)",
"dungeon.run.leave": "Je verlaat de kerker met je beloningen.",
"dungeon.run.max_reached": "Je hebt zoveel mogelijk verkend deze ronde.",
"dungeon.run.timeout": "Je wachtte te lang — de kerker stort in om je heen.",
"dungeon.run.in_progress": "Je bent al in de kerker! Maak eerst je huidige ronde af.",
"dungeon.btn.heal": "Genezen",
"dungeon.btn.buff": "Versterken",
"dungeon.btn.exchange": "Ruilen",
"dungeon.btn.continue": "Verder",
"dungeon.btn.leave": "Vertrek",
"dungeon.buff.attack": "Aanval +30%",
"dungeon.buff.defense": "Verdediging +30%",
"dungeon.buff.luck": "Geluk"
```

- [ ] **Step 4: Verify JSON validity**

Run: `node -e "const fs=require('fs');const locales=['en','vi','id','es','ja','zh','ko','pt-BR','fr','de','ru','tr','it','pl','nl'];locales.forEach(l=>{try{JSON.parse(fs.readFileSync('src/locales/'+l+'.json','utf8'));console.log(l+': OK')}catch(e){console.error(l+': FAIL',e.message)}})"`
Expected: All 15 locales show "OK"

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(dungeon): add merchant and run i18n keys for all 15 locales"
```

---

### Task 3: Create Merchant Service

**Files:**
- Create: `src/services/economy/merchant.service.ts`

- [ ] **Step 1: Create `merchant.service.ts`**

Create `src/services/economy/merchant.service.ts`:

```typescript
import type { SupportedLocale } from "../../util/i18n/index";

// --- Types ---

export type BuffType = "attack" | "defense" | "luck";

export interface Buff {
    type: BuffType;
    encountersLeft: number;
}

export interface MerchantState {
    userId: string;
    guildId: string;
    locale: string;
    floor: number;
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
    currentHp: number,
): MerchantState {
    const offer = generateOffer(floor);
    return {
        userId,
        guildId,
        locale,
        floor,
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/merchant.service.ts
git commit -m "feat(dungeon): create merchant service with pricing and buff logic"
```

---

### Task 4: Refactor Dungeon Service for Multi-Encounter Runs

**Files:**
- Modify: `src/services/economy/dungeon.service.ts`

- [ ] **Step 1: Add run state types and buff-aware encounter rolling**

At the top of `src/services/economy/dungeon.service.ts`, after the existing imports, add the import for Buff type:

```typescript
import type { Buff } from "./merchant.service";
```

Add the `DungeonRunState` interface after the existing `CombatLossResult` interface (after line 70):

```typescript
export interface DungeonRunState {
    userId: string;
    guildId: string;
    locale: string;
    hp: number;
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    activeBuff: Buff | null;
    messageId: string;
}
```

- [ ] **Step 2: Add luck-buff-aware `rollEncounterType` function**

Replace the existing `rollEncounterType()` function (around line 120-126) with a version that accepts an optional luck buff:

```typescript
function rollEncounterType(hasLuckBuff = false): EncounterType {
    const roll = Math.random();
    if (hasLuckBuff) {
        // Luck buff: monster 50%, treasure 35%, trap 5%, npc 10%
        if (roll < 0.50) return "monster";
        if (roll < 0.85) return "treasure";
        if (roll < 0.90) return "trap";
        return "npc";
    }
    if (roll < 0.50) return "monster";
    if (roll < 0.75) return "treasure";
    if (roll < 0.90) return "trap";
    return "npc";
}
```

- [ ] **Step 3: Modify `processCombatAction` for attack/defense buff**

Update the `processCombatAction` function signature to accept an optional buff (around line 218):

```typescript
function processCombatAction(state: CombatState, action: "attack" | "defend" | "run" | "timeout", buff?: Buff | null): CombatActionResult {
```

Then, inside the damage calculation section (after calculating `baseUserDmg` and `baseMonsterDmg`, around line 249-263), modify the damage application:

Replace the block:
```typescript
    const baseUserDmg = randomInRange(15, 25) + state.floor * 2;
    const baseMonsterDmg = randomInRange(10, 20) + state.floor * 3;

    let userDmg: number;
    let monsterDmg: number;

    if (action === "attack") {
        userDmg = baseUserDmg;
        monsterDmg = baseMonsterDmg;
    } else {
        // defend: 70% user damage, 50% monster damage
        userDmg = Math.floor(baseUserDmg * 0.7);
        monsterDmg = Math.floor(baseMonsterDmg * 0.5);
    }
```

With:
```typescript
    const baseUserDmg = randomInRange(15, 25) + state.floor * 2;
    const baseMonsterDmg = randomInRange(10, 20) + state.floor * 3;

    let userDmg: number;
    let monsterDmg: number;

    if (action === "attack") {
        userDmg = baseUserDmg;
        monsterDmg = baseMonsterDmg;
    } else {
        // defend: 70% user damage, 50% monster damage
        userDmg = Math.floor(baseUserDmg * 0.7);
        monsterDmg = Math.floor(baseMonsterDmg * 0.5);
    }

    // Apply buff effects
    if (buff?.type === "attack") {
        userDmg = Math.floor(userDmg * 1.3);
    }
    if (buff?.type === "defense") {
        monsterDmg = Math.floor(monsterDmg * 0.7);
    }
```

- [ ] **Step 4: Add `startRun`, `rollNextEncounter`, `endRun`, `tickBuff` functions**

Add these functions before the final `const DungeonService = { ... }` export line:

```typescript
async function startRun(userId: string, guildId: string, locale: string): Promise<DungeonRunState> {
    const economy = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId, coin: 0, gem: 0, prayStreak: 0, mineDepth: 1, mineCheckpoint: 1, dungeonDepth: 1, dungeonCheckpoint: 1 } },
        { upsert: true, new: true }
    );

    return {
        userId,
        guildId,
        locale,
        hp: 100,
        floor: economy.dungeonDepth ?? 1,
        checkpoint: economy.dungeonCheckpoint ?? 1,
        encountersLeft: 5,
        activeBuff: null,
        messageId: "",
    };
}

function rollEncounterForRun(runState: DungeonRunState): EncounterType {
    const hasLuck = runState.activeBuff?.type === "luck";
    return rollEncounterType(hasLuck);
}

function tickBuff(runState: DungeonRunState): void {
    if (runState.activeBuff) {
        runState.activeBuff.encountersLeft -= 1;
        if (runState.activeBuff.encountersLeft <= 0) {
            runState.activeBuff = null;
        }
    }
}

async function endRun(userId: string, guildId: string): Promise<void> {
    // Floor/checkpoint already persisted after each advance.
    // This function is for cleanup only — Redis key deletion
    // handled by the caller (button handler) since they have the keys.
}
```

- [ ] **Step 5: Update the `DungeonService` export**

Replace the existing export line:

```typescript
const DungeonService = { rollEncounter, processCombatAction, resolveCombatWin, resolveCombatLoss, isPrime };
```

With:

```typescript
const DungeonService = {
    rollEncounter,
    processCombatAction,
    resolveCombatWin,
    resolveCombatLoss,
    isPrime,
    startRun,
    rollEncounterForRun,
    rollEncounterType,
    tickBuff,
    endRun,
    rollMonster,
    randomInRange,
};
```

Note: `rollMonster` and `randomInRange` are also exported now because the slash command needs them when building encounter embeds from run state.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/services/economy/dungeon.service.ts
git commit -m "feat(dungeon): add multi-encounter run lifecycle and buff-aware combat"
```

---

### Task 5: Rewrite Dungeon Slash Command for Multi-Encounter Flow

**Files:**
- Modify: `src/commands/slash/dungeon.ts`

- [ ] **Step 1: Rewrite the dungeon slash command**

Replace the entire contents of `src/commands/slash/dungeon.ts` with:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import DungeonService from "../../services/economy/dungeon.service";
import type { CombatState, DungeonRunState, EncounterResult } from "../../services/economy/dungeon.service";
import MerchantService from "../../services/economy/merchant.service";
import type { MerchantState } from "../../services/economy/merchant.service";
import CurrencyService from "../../services/economy/currency.service";
import WorkService from "../../services/economy/work.service";
import { tryStarDrop } from "../../util/economy/starDrop";
import Reply from "../../util/decorator/reply";
import { BUTTON_ID } from "../../util/config/button";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const DUNGEON_COOLDOWN = 3600;
const RUN_TTL = 900;
const COMBAT_TTL = 60;
const MERCHANT_TTL = 60;
const COMBAT_TIMEOUT_MS = 30_000;

// --- Embed builders ---

export function buildCombatRow(locale: SupportedLocale): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_ATTACK).setLabel(t(locale, "dungeon.btn.attack")).setEmoji("⚔️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_DEFEND).setLabel(t(locale, "dungeon.btn.defend")).setEmoji("🛡️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_RUN).setLabel(t(locale, "dungeon.btn.run")).setEmoji("🏃").setStyle(ButtonStyle.Secondary),
    );
}

export function buildContinueLeaveRow(locale: SupportedLocale, encountersLeft: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_CONTINUE)
            .setLabel(t(locale, "dungeon.btn.continue"))
            .setEmoji("⬇️")
            .setStyle(ButtonStyle.Success)
            .setDisabled(encountersLeft <= 0),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_LEAVE)
            .setLabel(t(locale, "dungeon.btn.leave"))
            .setEmoji("🚪")
            .setStyle(ButtonStyle.Secondary),
    );
}

export function buildMerchantRow(locale: SupportedLocale, merchantState: MerchantState, userCoin: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_HEAL)
            .setLabel(t(locale, "dungeon.btn.heal"))
            .setEmoji("🧪")
            .setStyle(ButtonStyle.Success)
            .setDisabled(merchantState.currentHp >= 100 || userCoin < merchantState.healCost),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_BUFF)
            .setLabel(t(locale, "dungeon.btn.buff"))
            .setEmoji("✨")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(userCoin < merchantState.buffCost),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.DUNGEON_EXCHANGE)
            .setLabel(t(locale, "dungeon.btn.exchange"))
            .setEmoji("💎")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(userCoin < merchantState.exchangeRate),
    );
}

export function buildMerchantEmbed(locale: SupportedLocale, merchantState: MerchantState, userCoin: number): EmbedBuilder {
    const buffLabel = t(locale, `dungeon.buff.${merchantState.buffType}`);
    return new EmbedBuilder()
        .setTitle(`🏪 ${t(locale, "dungeon.title")}`)
        .setDescription(
            [
                t(locale, "dungeon.merchant.title", { floor: String(merchantState.floor) }),
                t(locale, "dungeon.merchant.greeting"),
                "",
                `🧪 ${t(locale, "dungeon.merchant.heal_option", { amount: String(merchantState.healAmount), cost: String(merchantState.healCost) })}`,
                `✨ ${t(locale, "dungeon.merchant.buff_option", { buffType: buffLabel, cost: String(merchantState.buffCost) })}`,
                `💎 ${t(locale, "dungeon.merchant.exchange_option", { rate: String(merchantState.exchangeRate) })}`,
                "",
                t(locale, "dungeon.combat.hp", { userHp: String(merchantState.currentHp), monster: "—", monsterHp: "—" }).replace(" | — HP: **—**", ""),
                `Coin: **${userCoin}**`,
                t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }),
            ].join("\n"),
        )
        .setColor(0x9b59b6);
}

export function buildTreasureEmbed(locale: SupportedLocale, floor: number, checkpoint: number, coinReward: number, gemReward: number, starReward: boolean, newFloor: number, checkpointReached: boolean): EmbedBuilder {
    const descLines = [
        t(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        t(locale, "dungeon.reward.coin", { amount: String(coinReward) }),
    ];
    if (gemReward > 0) {
        descLines.push(t(locale, "dungeon.reward.gem", { amount: String(gemReward) }));
    }
    descLines.push("", t(locale, "dungeon.floor", { floor: String(newFloor), checkpoint: String(checkpoint) }));
    if (checkpointReached) {
        descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) }));
    }
    if (starReward) {
        descLines.push("\n⭐ " + t(locale, "star_drop.found"));
    }
    return new EmbedBuilder()
        .setTitle(`🎁 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xf1c40f);
}

export function buildTrapEmbed(locale: SupportedLocale, floor: number, checkpoint: number, hpLost: number, coinLost: number, collapsed: boolean, currentHp: number): EmbedBuilder {
    const descLines = [
        t(locale, "dungeon.encounter.trap", { floor: String(floor) }),
        t(locale, "dungeon.trap.damage", { hp: String(hpLost), coin: String(coinLost) }),
    ];
    if (collapsed) {
        descLines.push("", t(locale, "dungeon.collapse", { checkpoint: String(checkpoint) }));
    }
    descLines.push("", `HP: **${currentHp}**/100`);
    descLines.push(t(locale, "dungeon.floor", { floor: String(collapsed ? checkpoint : floor), checkpoint: String(checkpoint) }));
    return new EmbedBuilder()
        .setTitle(`🪤 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(collapsed ? 0xed4245 : 0xe67e22);
}

export function buildCombatEmbed(locale: SupportedLocale, state: CombatState, checkpoint: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
        .setDescription(
            [
                t(locale, "dungeon.combat.hp", { userHp: String(state.userHp), monster: state.monsterName, monsterHp: String(state.monsterHp) }),
                "",
                t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String(checkpoint) }),
            ].join("\n"),
        )
        .setColor(0xe67e22);
}

export function buildNpcStubEmbed(locale: SupportedLocale, floor: number, checkpoint: number): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
        .setDescription(
            [
                t(locale, "dungeon.encounter.npc"),
                "",
                t(locale, "dungeon.floor", { floor: String(floor), checkpoint: String(checkpoint) }),
            ].join("\n"),
        )
        .setColor(0x9b59b6);
}

// --- Encounter processing for a run ---

export async function processEncounter(
    runState: DungeonRunState,
): Promise<{
    embed: EmbedBuilder;
    row: ActionRowBuilder<ButtonBuilder>;
    runEnded: boolean;
}> {
    const locale = runState.locale as SupportedLocale;
    const { userId, guildId, floor, checkpoint } = runState;
    const encounterType = DungeonService.rollEncounterForRun(runState);

    // Tick buff (decrement encounters left)
    DungeonService.tickBuff(runState);

    if (encounterType === "monster") {
        const monster = DungeonService.rollMonster(floor);
        const combatState: CombatState = {
            userId,
            monsterHp: 30 + floor * 5,
            userHp: runState.hp,
            floor,
            checkpoint,
            turnsLeft: 3,
            guildId,
            locale: runState.locale,
            monsterName: monster.name,
            monsterEmoji: monster.emoji,
        };

        const combatKey = `dungeon_combat:${userId}`;
        await redis.setJson(combatKey, combatState, COMBAT_TTL);

        // Schedule auto-timeout
        setTimeout(async () => {
            try {
                const active = await redis.getJson(combatKey);
                if (active) {
                    await redis.deleteKey(combatKey);
                    // Run state stays — user can still continue after timeout
                }
            } catch {
                // Silently ignore
            }
        }, COMBAT_TIMEOUT_MS);

        return {
            embed: buildCombatEmbed(locale, combatState, checkpoint),
            row: buildCombatRow(locale),
            runEnded: false,
        };
    }

    if (encounterType === "treasure") {
        const coinReward = DungeonService.randomInRange(30, 100) + floor * 8;
        const gemReward = Math.random() < 0.15 ? 1 : 0;

        await CurrencyService.addCoin(userId, guildId, coinReward, "dungeon", { encounter: "treasure", floor });
        if (gemReward > 0) {
            await CurrencyService.addGem(userId, guildId, gemReward, "dungeon", { encounter: "treasure", floor });
        }
        const starReward = await tryStarDrop(userId, 0.03, "dungeon");

        // Advance floor
        const newFloor = floor + 1;
        const checkpointReached = DungeonService.isPrime(newFloor);
        const newCheckpoint = checkpointReached ? newFloor : checkpoint;

        await import("../../models/userEconomy.model").then(m =>
            m.default.updateOne(
                { userId, guildId },
                { $set: { dungeonDepth: newFloor, dungeonCheckpoint: newCheckpoint } },
            )
        );

        runState.floor = newFloor;
        runState.checkpoint = newCheckpoint;

        const embed = buildTreasureEmbed(locale, floor, newCheckpoint, coinReward, gemReward, starReward, newFloor, checkpointReached);

        return {
            embed,
            row: buildContinueLeaveRow(locale, runState.encountersLeft),
            runEnded: false,
        };
    }

    if (encounterType === "trap") {
        const hpLost = DungeonService.randomInRange(10, 20);
        const balance = await CurrencyService.getBalance(userId, guildId);
        const coinLost = Math.min(DungeonService.randomInRange(30, 60), balance.coin);

        runState.hp -= hpLost;

        if (runState.hp <= 0) {
            // Collapse: reset to checkpoint + additional coin loss
            const additionalLoss = Math.min(DungeonService.randomInRange(100, 200), Math.max(balance.coin - coinLost, 0));
            const totalLoss = coinLost + additionalLoss;

            await import("../../models/userEconomy.model").then(m =>
                m.default.updateOne(
                    { userId, guildId },
                    { $inc: { coin: -totalLoss }, $set: { dungeonDepth: checkpoint } },
                )
            );

            runState.floor = checkpoint;

            const embed = buildTrapEmbed(locale, floor, checkpoint, hpLost, totalLoss, true, 0);
            // Run ends — HP depleted
            return { embed, row: new ActionRowBuilder<ButtonBuilder>(), runEnded: true };
        }

        // Stay on floor, lose coin
        if (coinLost > 0) {
            await import("../../models/userEconomy.model").then(m =>
                m.default.updateOne(
                    { userId, guildId },
                    { $inc: { coin: -coinLost } },
                )
            );
        }

        const embed = buildTrapEmbed(locale, floor, checkpoint, hpLost, coinLost, false, runState.hp);
        return {
            embed,
            row: buildContinueLeaveRow(locale, runState.encountersLeft),
            runEnded: false,
        };
    }

    // NPC Merchant encounter
    const merchantState = MerchantService.buildMerchantState(userId, guildId, runState.locale, floor, runState.hp);
    const merchantKey = `dungeon_merchant:${userId}`;
    await redis.setJson(merchantKey, merchantState, MERCHANT_TTL);

    const balance = await CurrencyService.getBalance(userId, guildId);

    // Schedule merchant timeout
    setTimeout(async () => {
        try {
            const active = await redis.getJson(merchantKey);
            if (active) {
                await redis.deleteKey(merchantKey);
            }
        } catch {
            // Silently ignore
        }
    }, MERCHANT_TTL * 1000);

    return {
        embed: buildMerchantEmbed(locale, merchantState, balance.coin),
        row: buildMerchantRow(locale, merchantState, balance.coin),
        runEnded: false,
    };
}

// --- Main command ---

export default {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            // Check cooldown
            const cdKey = `dungeon_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check existing run
            const runKey = `dungeon_run:${userId}`;
            const existingRun = await redis.getJson(runKey);
            if (existingRun) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.run.in_progress"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check existing combat state
            const combatKey = `dungeon_combat:${userId}`;
            const existingCombat = await redis.getJson(combatKey);
            if (existingCombat) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.in_combat"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Start run
            const runState = await DungeonService.startRun(userId, guildId, locale);
            runState.encountersLeft -= 1;

            // Process first encounter
            const { embed, row, runEnded } = await processEncounter(runState);

            // Save run state (with messageId to be set after reply)
            const reply = await interaction.editReply({ embeds: [embed], components: runEnded ? [] : [row] });
            runState.messageId = reply.id;

            if (runEnded) {
                // Run ended on first encounter (e.g., trap collapse)
                await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);
            } else {
                await redis.setJson(runKey, runState, RUN_TTL);
            }
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/dungeon.ts
git commit -m "feat(dungeon): rewrite slash command for multi-encounter run flow"
```

---

### Task 6: Refactor Combat Button Handlers for Run State

**Files:**
- Modify: `src/buttons/dungeonAttack.button.ts`
- Modify: `src/buttons/dungeonRun.button.ts`
- (No changes to `src/buttons/dungeonDefend.button.ts` — it delegates to `handleCombatAction`)

- [ ] **Step 1: Rewrite `dungeonAttack.button.ts`**

Replace the entire contents of `src/buttons/dungeonAttack.button.ts` with:

```typescript
import {
    ButtonInteraction,
    EmbedBuilder,
} from "discord.js";
import redis from "../connector/redis";
import DungeonService from "../services/economy/dungeon.service";
import type { CombatState, DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const DUNGEON_COOLDOWN = 3600;
const RUN_TTL = 900;

export async function handleCombatAction(
    interaction: ButtonInteraction,
    action: "attack" | "defend",
): Promise<void> {
    const userId = interaction.user.id;
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;

    const state = (await redis.getJson(combatKey)) as CombatState | null;
    if (!state) {
        await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
        return;
    }

    if (state.userId !== userId) {
        await interaction.deferUpdate();
        return;
    }

    await interaction.deferUpdate();

    const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
    const locale = state.locale as SupportedLocale;
    const result = DungeonService.processCombatAction(state, action, runState?.activeBuff);

    const actionLine =
        action === "attack"
            ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
            : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) });

    if (result.won) {
        await redis.deleteKey(combatKey);
        const resolve = await DungeonService.resolveCombatWin(userId, state.guildId, state.floor);

        const descLines = [
            actionLine,
            "",
            t(locale, "dungeon.combat.win", { monster: state.monsterName }),
            t(locale, "dungeon.reward.coin", { amount: String(resolve.coinReward) }),
        ];
        if (resolve.gemReward > 0) {
            descLines.push(t(locale, "dungeon.reward.gem", { amount: String(resolve.gemReward) }));
        }
        descLines.push("", t(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }));
        if (resolve.checkpointReached) {
            descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) }));
        }
        if (resolve.starReward) {
            descLines.push("\n⭐ " + t(locale, "star_drop.found"));
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x2ecc71);

        // Update run state and show continue/leave
        if (runState) {
            runState.hp = result.userHp;
            runState.floor = resolve.newFloor;
            runState.checkpoint = resolve.checkpoint;
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [] });
        }
        return;
    }

    if (result.lost) {
        await redis.deleteKey(combatKey);
        const loss = await DungeonService.resolveCombatLoss(userId, state.guildId);

        const descLines = [
            actionLine,
            "",
            t(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
            t(locale, "dungeon.penalty", { amount: String(loss.coinLost) }),
        ];

        const embed = new EmbedBuilder()
            .setTitle(`💀 ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0xed4245);

        // Run ends — HP depleted
        if (runState) {
            await redis.deleteKey(runKey);
            const cdKey = `dungeon_cd:${state.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);
        }
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    if (result.turnsUp) {
        await redis.deleteKey(combatKey);

        const descLines = [actionLine, "", t(locale, "dungeon.combat.turns_up")];

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x95a5a6);

        // User escapes — show continue/leave
        if (runState) {
            runState.hp = result.userHp;
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [] });
        }
        return;
    }

    // Combat continues
    const updatedState: CombatState = {
        ...state,
        monsterHp: result.monsterHp,
        userHp: result.userHp,
        turnsLeft: result.turnsLeft,
    };
    await redis.setJson(combatKey, updatedState, 60);

    const { buildCombatRow } = await import("../commands/slash/dungeon");

    const descLines = [
        actionLine,
        "",
        t(locale, "dungeon.combat.hp", { userHp: String(result.userHp), monster: state.monsterName, monsterHp: String(result.monsterHp) }),
        t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String(state.checkpoint) }),
    ];

    const embed = new EmbedBuilder()
        .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xe67e22);

    await interaction.editReply({ embeds: [embed], components: [buildCombatRow(locale)] });
}

export default {
    id: BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "attack");
    },
};
```

- [ ] **Step 2: Rewrite `dungeonRun.button.ts`**

Replace the entire contents of `src/buttons/dungeonRun.button.ts` with:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState } from "../services/economy/dungeon.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const combatKey = `dungeon_combat:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const state = (await redis.getJson(combatKey)) as CombatState | null;
        if (!state) {
            await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
            return;
        }

        if (state.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();
        await redis.deleteKey(combatKey);

        const locale = state.locale as SupportedLocale;
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(t(locale, "dungeon.combat.run"))
            .setColor(0x95a5a6);

        if (runState) {
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [] });
        }
    },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/buttons/dungeonAttack.button.ts src/buttons/dungeonRun.button.ts
git commit -m "feat(dungeon): update combat buttons to support run state and continue/leave"
```

---

### Task 7: Create Continue and Leave Button Handlers

**Files:**
- Create: `src/buttons/dungeonContinue.button.ts`
- Create: `src/buttons/dungeonLeave.button.ts`

- [ ] **Step 1: Create `dungeonContinue.button.ts`**

Create `src/buttons/dungeonContinue.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { processEncounter } from "../commands/slash/dungeon";

const RUN_TTL = 900;
const DUNGEON_COOLDOWN = 3600;

export default {
    id: BUTTON_ID.DUNGEON_CONTINUE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const runKey = `dungeon_run:${userId}`;

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (!runState) {
            await interaction.reply({ content: t("en", "dungeon.run.timeout"), ephemeral: true });
            return;
        }

        if (runState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();

        const locale = runState.locale as SupportedLocale;

        // Check if encounters exhausted
        if (runState.encountersLeft <= 0) {
            await redis.deleteKey(runKey);
            const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);

            const embed = new EmbedBuilder()
                .setTitle(`🏰 ${t(locale, "dungeon.title")}`)
                .setDescription(t(locale, "dungeon.run.max_reached"))
                .setColor(0x3498db);
            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }

        // Decrement encounters
        runState.encountersLeft -= 1;

        // Process next encounter
        const { embed, row, runEnded } = await processEncounter(runState);

        if (runEnded) {
            await redis.deleteKey(runKey);
            const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    },
};
```

- [ ] **Step 2: Create `dungeonLeave.button.ts`**

Create `src/buttons/dungeonLeave.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";

const DUNGEON_COOLDOWN = 3600;

export default {
    id: BUTTON_ID.DUNGEON_LEAVE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const runKey = `dungeon_run:${userId}`;

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (!runState) {
            await interaction.reply({ content: t("en", "dungeon.run.timeout"), ephemeral: true });
            return;
        }

        if (runState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();

        const locale = runState.locale as SupportedLocale;

        // Cleanup run state
        await redis.deleteKey(runKey);
        // Also cleanup any active combat or merchant state
        await redis.deleteKey(`dungeon_combat:${userId}`);
        await redis.deleteKey(`dungeon_merchant:${userId}`);

        // Set cooldown
        const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
        await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);

        const embed = new EmbedBuilder()
            .setTitle(`🚪 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.run.leave"),
                    "",
                    t(locale, "dungeon.floor", { floor: String(runState.floor), checkpoint: String(runState.checkpoint) }),
                ].join("\n"),
            )
            .setColor(0x3498db);

        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/buttons/dungeonContinue.button.ts src/buttons/dungeonLeave.button.ts
git commit -m "feat(dungeon): add continue and leave button handlers for run flow"
```

---

### Task 8: Create Merchant Button Handlers

**Files:**
- Create: `src/buttons/dungeonHeal.button.ts`
- Create: `src/buttons/dungeonBuff.button.ts`
- Create: `src/buttons/dungeonExchange.button.ts`

- [ ] **Step 1: Create `dungeonHeal.button.ts`**

Create `src/buttons/dungeonHeal.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import MerchantService from "../services/economy/merchant.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_HEAL,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const merchantState = (await redis.getJson(merchantKey)) as MerchantState | null;
        if (!merchantState) {
            await interaction.reply({ content: t("en", "dungeon.merchant.timeout"), ephemeral: true });
            return;
        }

        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        const locale = merchantState.locale as SupportedLocale;

        // Check HP already full
        if (merchantState.currentHp >= 100) {
            await interaction.reply({ content: t(locale, "dungeon.merchant.hp_full"), ephemeral: true });
            return;
        }

        // Check sufficient coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.healCost, 0, "dungeon", {
                action: "merchant_heal",
                floor: merchantState.floor,
                cost: merchantState.healCost,
                healAmount: merchantState.healAmount,
            });
        } catch {
            await interaction.reply({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        // Apply heal
        const actualHeal = MerchantService.calculateHeal(merchantState.currentHp, merchantState.healAmount);
        const newHp = merchantState.currentHp + actualHeal;

        // Update run state
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (runState) {
            runState.hp = newHp;
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const embed = new EmbedBuilder()
            .setTitle(`🧪 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.heal_result", { amount: String(actualHeal), hp: String(newHp) }),
                    "",
                    t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }),
                ].join("\n"),
            )
            .setColor(0x2ecc71);

        const encountersLeft = runState?.encountersLeft ?? 0;
        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
```

- [ ] **Step 2: Create `dungeonBuff.button.ts`**

Create `src/buttons/dungeonBuff.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import type { MerchantState, BuffType } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_BUFF,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const merchantState = (await redis.getJson(merchantKey)) as MerchantState | null;
        if (!merchantState) {
            await interaction.reply({ content: t("en", "dungeon.merchant.timeout"), ephemeral: true });
            return;
        }

        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        const locale = merchantState.locale as SupportedLocale;

        // Check sufficient coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.buffCost, 0, "dungeon", {
                action: "merchant_buff",
                floor: merchantState.floor,
                cost: merchantState.buffCost,
                buffType: merchantState.buffType,
            });
        } catch {
            await interaction.reply({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        // Update run state with buff
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        const descLines: string[] = [];
        const buffLabel = t(locale, `dungeon.buff.${merchantState.buffType}`);

        if (runState) {
            // Check for existing buff replacement
            if (runState.activeBuff) {
                const oldBuffLabel = t(locale, `dungeon.buff.${runState.activeBuff.type}`);
                descLines.push(t(locale, "dungeon.merchant.buff_replaced", { oldBuff: oldBuffLabel }));
            }

            runState.activeBuff = {
                type: merchantState.buffType,
                encountersLeft: runState.encountersLeft,
            };
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const encountersLeft = runState?.encountersLeft ?? 0;
        descLines.push(t(locale, "dungeon.merchant.buff_result", { buffType: buffLabel, turns: String(encountersLeft) }));
        descLines.push("", t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }));

        const embed = new EmbedBuilder()
            .setTitle(`✨ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x9b59b6);

        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
```

- [ ] **Step 3: Create `dungeonExchange.button.ts`**

Create `src/buttons/dungeonExchange.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_EXCHANGE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const merchantState = (await redis.getJson(merchantKey)) as MerchantState | null;
        if (!merchantState) {
            await interaction.reply({ content: t("en", "dungeon.merchant.timeout"), ephemeral: true });
            return;
        }

        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        const locale = merchantState.locale as SupportedLocale;

        // Check sufficient coin and deduct
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.exchangeRate, 0, "dungeon", {
                action: "merchant_exchange",
                floor: merchantState.floor,
                cost: merchantState.exchangeRate,
                gemGained: 1,
            });
        } catch {
            await interaction.reply({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        // Add 1 gem
        await CurrencyService.addGem(userId, merchantState.guildId, 1, "dungeon", {
            action: "merchant_exchange",
            floor: merchantState.floor,
        });

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        const encountersLeft = runState?.encountersLeft ?? 0;

        // Refresh run TTL
        if (runState) {
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        const embed = new EmbedBuilder()
            .setTitle(`💎 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.exchange_result", { cost: String(merchantState.exchangeRate) }),
                    "",
                    t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }),
                ].join("\n"),
            )
            .setColor(0x3498db);

        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/buttons/dungeonHeal.button.ts src/buttons/dungeonBuff.button.ts src/buttons/dungeonExchange.button.ts
git commit -m "feat(dungeon): add merchant button handlers (heal, buff, exchange)"
```

---

### Task 9: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript build**

Run: `npm run build`
Expected: Successful build with no errors. Output in `dist/` directory.

- [ ] **Step 2: Verify all locale files are valid JSON**

Run: `node -e "const fs=require('fs');const locales=['en','vi','id','es','ja','zh','ko','pt-BR','fr','de','ru','tr','it','pl','nl'];locales.forEach(l=>{try{JSON.parse(fs.readFileSync('src/locales/'+l+'.json','utf8'));console.log(l+': OK')}catch(e){console.error(l+': FAIL',e.message)}})"`
Expected: All 15 locales show "OK"

- [ ] **Step 3: Verify new button files are discoverable by loader**

Run: `ls src/buttons/dungeon*.button.ts`
Expected: Should list 6 files:
- `dungeonAttack.button.ts`
- `dungeonBuff.button.ts`
- `dungeonContinue.button.ts`
- `dungeonDefend.button.ts`
- `dungeonExchange.button.ts`
- `dungeonHeal.button.ts`
- `dungeonLeave.button.ts`
- `dungeonRun.button.ts`

(8 total — 3 existing + 5 new)

- [ ] **Step 4: Verify all 24 new i18n keys exist in en.json**

Run: `node -e "const en=require('./src/locales/en.json');const keys=['dungeon.merchant.title','dungeon.merchant.greeting','dungeon.merchant.heal_option','dungeon.merchant.buff_option','dungeon.merchant.exchange_option','dungeon.merchant.heal_result','dungeon.merchant.buff_result','dungeon.merchant.exchange_result','dungeon.merchant.no_coin','dungeon.merchant.hp_full','dungeon.merchant.timeout','dungeon.merchant.buff_replaced','dungeon.run.continue','dungeon.run.leave','dungeon.run.max_reached','dungeon.run.timeout','dungeon.run.in_progress','dungeon.btn.heal','dungeon.btn.buff','dungeon.btn.exchange','dungeon.btn.continue','dungeon.btn.leave','dungeon.buff.attack','dungeon.buff.defense','dungeon.buff.luck'];const missing=keys.filter(k=>!en[k]);if(missing.length)console.error('Missing:',missing);else console.log('All 25 keys present')"`
Expected: "All 25 keys present"

- [ ] **Step 5: Commit (final integration commit if any adjustments needed)**

If any adjustments were made during verification:
```bash
git add -A
git commit -m "fix(dungeon): address build verification issues"
```
