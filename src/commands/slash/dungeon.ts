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
import type { CombatState, DungeonRunState } from "../../services/economy/dungeon.service";
import MerchantService from "../../services/economy/merchant.service";
import type { MerchantState } from "../../services/economy/merchant.service";
import CurrencyService from "../../services/economy/currency.service";
import WorkService from "../../services/economy/work.service";
import { tryStarDrop } from "../../util/economy/starDrop";
import UserEconomyModel from "../../models/userEconomy.model";
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

// --- Embed builders (exported for button handlers) ---

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
                `HP: **${merchantState.currentHp}**/100 | Coin: **${userCoin}**`,
                t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.checkpoint) }),
            ].join("\n"),
        )
        .setColor(0x9b59b6);
}

export interface TreasureEmbedOptions {
    floor: number;
    checkpoint: number;
    coinReward: number;
    gemReward: number;
    starReward: boolean;
    newFloor: number;
    checkpointReached: boolean;
}

export function buildTreasureEmbed(locale: SupportedLocale, opts: TreasureEmbedOptions): EmbedBuilder {
    const { floor, checkpoint, coinReward, gemReward, starReward, newFloor, checkpointReached } = opts;
    const descLines = [
        t(locale, "dungeon.encounter.treasure", { floor: String(floor) }),
        t(locale, "dungeon.reward.coin", { amount: String(coinReward) }),
        ...(gemReward > 0 ? [t(locale, "dungeon.reward.gem", { amount: String(gemReward) })] : []),
        "",
        t(locale, "dungeon.floor", { floor: String(newFloor), checkpoint: String(checkpoint) }),
        ...(checkpointReached ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(newFloor) })] : []),
        ...(starReward ? ["\n⭐ " + t(locale, "star_drop.found")] : []),
    ];
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
    descLines.push(
        ...(collapsed ? ["", t(locale, "dungeon.collapse", { checkpoint: String(checkpoint) })] : []),
        "",
        `HP: **${currentHp}**/100`,
        t(locale, "dungeon.floor", { floor: String(collapsed ? checkpoint : floor), checkpoint: String(checkpoint) }),
    );
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

        await UserEconomyModel.updateOne(
            { userId, guildId },
            { $set: { dungeonDepth: newFloor, dungeonCheckpoint: newCheckpoint } },
        );

        runState.floor = newFloor;
        runState.checkpoint = newCheckpoint;

        const embed = buildTreasureEmbed(locale, { floor, checkpoint: newCheckpoint, coinReward, gemReward, starReward, newFloor, checkpointReached });

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

            await UserEconomyModel.updateOne(
                { userId, guildId },
                { $inc: { coin: -totalLoss }, $set: { dungeonDepth: checkpoint } },
            );

            runState.floor = checkpoint;

            const embed = buildTrapEmbed(locale, floor, checkpoint, hpLost, totalLoss, true, 0);
            return { embed, row: new ActionRowBuilder<ButtonBuilder>(), runEnded: true };
        }

        if (coinLost > 0) {
            await UserEconomyModel.updateOne(
                { userId, guildId },
                { $inc: { coin: -coinLost } },
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
    const merchantState = MerchantService.buildMerchantState(userId, guildId, runState.locale, floor, checkpoint, runState.hp);
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
        const guildId = interaction.guildId ?? "";
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

            // Save run state
            const reply = await interaction.editReply({ embeds: [embed], components: runEnded ? [] : [row] });
            runState.messageId = reply.id;

            if (runEnded) {
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
