# Manga Star Charge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge 1 star per manga command use after 3 free daily uses, with refund on error.

**Architecture:** Add charge/refund logic directly in `mangaCommand()` handler before the API call. Track free uses via Redis counter with UTC-midnight TTL. Use existing `WalletService.deductStar`/`addStar` for star operations.

**Tech Stack:** Redis (counter + TTL), Mongoose (wallet transactions), i18next (translations)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/transaction.model.ts` | Modify | Add `command_charge` and `command_refund` transaction types |
| `src/util/manga/handler.ts` | Modify | Add free-use check, star charge, and refund logic |
| `src/locales/*.json` (15 files) | Modify | Add `manga.no_stars` translation key |

---

### Task 1: Add transaction types

**Files:**
- Modify: `src/models/transaction.model.ts:3-26` (TransactionType union)
- Modify: `src/models/transaction.model.ts:44-68` (schema enum array)

- [ ] **Step 1: Add types to TransactionType union**

In `src/models/transaction.model.ts`, add `"command_charge"` and `"command_refund"` to the `TransactionType` union:

```typescript
export type TransactionType =
    | "pray"
    | "curse"
    | "purchase"
    | "exchange"
    | "streak_bonus"
    | "admin"
    | "confession_vip"
    | "confession_skip_cd"
    | "confession_refund"
    | "confession_reply"
    | "level_up"
    | "voice_reward"
    | "gambling"
    | "work"
    | "fish"
    | "gift"
    | "rob"
    | "rob_penalty"
    | "global_daily"
    | "global_streak_bonus"
    | "global_milestone"
    | "global_spend"
    | "global_refund"
    | "command_charge"
    | "command_refund";
```

- [ ] **Step 2: Add types to schema enum array**

In the same file, add to the `enum` array in the schema definition (after `"global_refund"`):

```typescript
                "global_refund",
                "command_charge",
                "command_refund",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add command_charge and command_refund transaction types"
```

---

### Task 2: Add i18n key for no-stars error

**Files:**
- Modify: `src/locales/en.json` and 14 other locale files

- [ ] **Step 1: Add `manga.no_stars` to all 15 locale files**

Add the key after `manga.support_server` in each file:

| Locale | Value |
|--------|-------|
| en | `"You've used all 3 free uses today and don't have enough stars. Use /wallet daily to claim stars."` |
| vi | `"Bạn đã hết 3 lượt miễn phí hôm nay và không đủ star. Dùng /wallet daily để nhận star."` |
| id | `"Anda telah menggunakan 3 penggunaan gratis hari ini dan tidak memiliki cukup star. Gunakan /wallet daily untuk klaim star."` |
| es | `"Has agotado tus 3 usos gratuitos de hoy y no tienes suficientes estrellas. Usa /wallet daily para reclamar estrellas."` |
| ja | `"本日の無料3回を使い切り、スターが不足しています。/wallet daily でスターを受け取ってください。"` |
| zh | `"你已用完今天的3次免费机会，星星不足。请使用 /wallet daily 领取星星。"` |
| ko | `"오늘의 무료 3회를 모두 사용했고 스타가 부족해요. /wallet daily로 스타를 받으세요."` |
| pt-BR | `"Você usou todas as 3 utilizações gratuitas de hoje e não tem estrelas suficientes. Use /wallet daily para receber estrelas."` |
| fr | `"Vous avez utilisé vos 3 utilisations gratuites du jour et n'avez pas assez d'étoiles. Utilisez /wallet daily pour en obtenir."` |
| de | `"Du hast deine 3 kostenlosen Nutzungen heute aufgebraucht und hast nicht genug Sterne. Nutze /wallet daily um Sterne zu erhalten."` |
| ru | `"Вы использовали все 3 бесплатные попытки сегодня и у вас недостаточно звёзд. Используйте /wallet daily для получения звёзд."` |
| tr | `"Bugünkü 3 ücretsiz kullanım hakkınızı tükettiniz ve yeterli yıldızınız yok. Yıldız almak için /wallet daily kullanın."` |
| it | `"Hai esaurito i 3 utilizzi gratuiti di oggi e non hai abbastanza stelle. Usa /wallet daily per ottenere stelle."` |
| pl | `"Wykorzystałeś 3 darmowe użycia na dziś i nie masz wystarczająco gwiazd. Użyj /wallet daily aby odebrać gwiazdy."` |
| nl | `"Je hebt je 3 gratis gebruiken van vandaag opgebruikt en hebt niet genoeg sterren. Gebruik /wallet daily om sterren te claimen."` |

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add manga.no_stars translation key for all 15 locales"
```

---

### Task 3: Add star charge logic to manga handler

**Files:**
- Modify: `src/util/manga/handler.ts`

- [ ] **Step 1: Add imports**

Add these imports at the top of `src/util/manga/handler.ts`:

```typescript
import WalletService, { InsufficientStarError } from "../../services/economy/wallet.service";
```

- [ ] **Step 2: Add constants and helper**

After the existing constants (`CACHE_TTL`, `BUTTON_REMOVE_DELAY`, `MAX_READ_PAGES`), add:

```typescript
const FREE_DAILY_USES = 3;
const STAR_COST = 1;

function secondsUntilUTCMidnight(): number {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
}
```

- [ ] **Step 3: Add charge logic inside execute()**

Replace the `execute()` method body in `src/util/manga/handler.ts` with this updated version. The key changes are:
1. After NSFW check, add free-use check + star charge (before `deferReply`)
2. Track `charged` flag
3. In catch block, refund if `charged`

Full updated `execute()`:

```typescript
        async execute(interaction: ChatInputCommandInteraction): Promise<void> {
            const locale = await resolveLocale(interaction);
            let charged = false;

            try {
                if (!(interaction.channel as TextChannel)?.nsfw) {
                    await interaction.reply({ content: t(locale, "manga.nsfw_only"), ephemeral: true });
                    return;
                }

                // --- Star charge gate ---
                const userId = interaction.user.id;
                const freeKey = `manga_free:${userId}`;
                const usedToday = (await redis.getJson(freeKey)) as number | null;

                if (usedToday !== null && usedToday >= FREE_DAILY_USES) {
                    try {
                        await WalletService.deductStar(userId, STAR_COST, "command_charge", {
                            command: source.name,
                        });
                        charged = true;
                    } catch (error) {
                        if (error instanceof InsufficientStarError) {
                            await interaction.reply({
                                content: t(locale, "manga.no_stars"),
                                ephemeral: true,
                            });
                            return;
                        }
                        throw error;
                    }
                } else {
                    const newCount = (usedToday ?? 0) + 1;
                    await redis.setJson(freeKey, newCount, secondsUntilUTCMidnight());
                }
                // --- End star charge gate ---

                const subcommand = interaction.options.getSubcommand(true);
                await interaction.deferReply();

                const apiUrl =
                    subcommand === "random"
                        ? `${SERVER_HD}${source.apiPath}/random`
                        : `${SERVER_HD}${source.apiPath}/get?book=${interaction.options.getInteger("id", true)}`;

                const response = await axios.get(apiUrl);

                if (!response.data?.data) return;

                const result = response.data.data;

                const embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`${source.urlBase}${result.id}`)
                    .setImage(result.image[0])
                    .addFields(source.fields(result))
                    .setDescription(`${result.id}`)
                    .setTimestamp()
                    .setFooter(FOOTER.text ? { text: FOOTER.text, iconURL: FOOTER.icon } : null);

                const row = new ActionRowBuilder<ButtonBuilder>();

                if (result.total < MAX_READ_PAGES) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.MANGA_READ)
                            .setLabel(t(locale, "manga.read"))
                            .setStyle(ButtonStyle.Primary)
                    );
                    await redis.setJson(`${BUTTON_ID.MANGA_READ}_${result.id}`, result.image, CACHE_TTL);
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.MANGA_READ)
                            .setLabel(t(locale, "manga.premium_only"))
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setURL(`${source.urlBase}${result.id}`)
                        .setLabel(t(locale, "manga.read_online"))
                        .setStyle(ButtonStyle.Link)
                );

                await interaction.editReply({ embeds: [embed], components: [row] });
                await wait(BUTTON_REMOVE_DELAY);
                await interaction.editReply({ components: [] });
            } catch (error) {
                log(`[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`, "error");

                // Refund star if charged
                if (charged) {
                    try {
                        await WalletService.addStar(interaction.user.id, STAR_COST, "command_refund", {
                            command: source.name,
                        });
                    } catch (refundError) {
                        log(`[manga:${source.name}] refund failed: ${refundError instanceof Error ? refundError.message : "Unknown"}`, "error");
                    }
                }

                const row = new ActionRowBuilder<ButtonBuilder>();
                row.addComponents(
                    new ButtonBuilder()
                        .setURL(URL_REPORT_BUG)
                        .setLabel(t(locale, "manga.report_issue"))
                        .setStyle(ButtonStyle.Link)
                );
                if (SUPPORT_SERVER_LINK) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setURL(SUPPORT_SERVER_LINK)
                            .setLabel(t(locale, "manga.support_server"))
                            .setStyle(ButtonStyle.Link)
                    );
                }
                await interaction.editReply({
                    content: t(locale, "manga.premium_only"),
                    components: [row],
                });
            }
        },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(manga): add star charge with 3 free daily uses and error refund"
```
