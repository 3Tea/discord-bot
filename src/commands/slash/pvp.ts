// src/commands/slash/pvp.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import CharacterService from "../../services/rpg/character.service";
import GuildService from "../../services/rpg/guild.service";
import CombatService from "../../services/rpg/combat.service";
import PvPService from "../../services/rpg/pvp.service";
import type { PvPMatchState } from "../../services/rpg/pvp.service";
import {
    CLASS_SKILLS,
    ADVANCED_CLASS_CONFIG,
    SKILL1_MP_COST,
    SKILL2_MP_COST,
    ULTIMATE_MP_COST,
    type ClassType,
    type AdvancedClassType,
} from "../../services/rpg/rpg.config";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import { formatCooldown } from "../../util/date/format";

const ACTION_TIMEOUT_MS = 30_000;
const CHALLENGE_TIMEOUT_MS = 60_000;

// --- Helper: build PvP action buttons ---

function buildPvPActionRow(
    locale: SupportedLocale,
    matchId: string,
    classType: ClassType,
    currentMp: number,
    advancedClass: AdvancedClassType | null,
    ultimateUsed: boolean
): ActionRowBuilder<ButtonBuilder>[] {
    const [skill1, skill2] = CLASS_SKILLS[classType];

    const attackBtn = new ButtonBuilder()
        .setCustomId(`pvp_attack:${matchId}`)
        .setLabel(t(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(ButtonStyle.Danger);

    const skill1Btn = new ButtonBuilder()
        .setCustomId(`pvp_skill1:${matchId}`)
        .setLabel(t(locale, `rpg.skill.${skill1.key}`))
        .setEmoji(skill1.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentMp < SKILL1_MP_COST);

    const skill2Btn = new ButtonBuilder()
        .setCustomId(`pvp_skill2:${matchId}`)
        .setLabel(t(locale, `rpg.skill.${skill2.key}`))
        .setEmoji(skill2.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentMp < SKILL2_MP_COST);

    const defendBtn = new ButtonBuilder()
        .setCustomId(`pvp_defend:${matchId}`)
        .setLabel(t(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary);

    if (advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[advancedClass];
        const ultimateBtn = new ButtonBuilder()
            .setCustomId(`pvp_ultimate:${matchId}`)
            .setLabel(t(locale, `rpg.skill.${advConfig.ultimate.key}`))
            .setEmoji(advConfig.ultimate.emoji)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(ultimateUsed || currentMp < ULTIMATE_MP_COST);

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            attackBtn, skill1Btn, skill2Btn, ultimateBtn
        );
        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(defendBtn);
        return [row1, row2];
    }

    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            attackBtn, skill1Btn, skill2Btn, defendBtn
        ),
    ];
}

// --- Helper: build turn status embed for the channel ---

function buildTurnEmbed(
    locale: SupportedLocale,
    state: PvPMatchState
): EmbedBuilder {
    const cClass = PvPService.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = PvPService.getClassLabel(state.defenderClass, state.defenderAdvanced);

    return new EmbedBuilder()
        .setTitle(t(locale, "pvp.turn.title", { turn: String(state.turn), max: String(state.maxTurns) }))
        .setDescription([
            t(locale, "pvp.reveal.status", {
                user: state.challengerId,
                hp: String(state.challengerHp),
                maxHp: String(state.challengerMaxHp),
                mp: String(state.challengerMp),
                maxMp: String(state.challengerMaxMp),
            }) + ` (${cClass.emoji} ${cClass.name})`,
            t(locale, "pvp.reveal.status", {
                user: state.defenderId,
                hp: String(state.defenderHp),
                maxHp: String(state.defenderMaxHp),
                mp: String(state.defenderMp),
                maxMp: String(state.defenderMaxMp),
            }) + ` (${dClass.emoji} ${dClass.name})`,
            "",
            t(locale, "pvp.turn.select"),
        ].join("\n"))
        .setColor(0xe67e22);
}

// --- Helper: build reveal embed ---

function buildRevealEmbed(
    locale: SupportedLocale,
    state: PvPMatchState,
    result: {
        challengerAction: string;
        defenderAction: string;
        challengerDamageDealt: number;
        defenderDamageDealt: number;
        challengerHp: number;
        defenderHp: number;
        challengerMp: number;
        defenderMp: number;
        challengerHealed: number;
        defenderHealed: number;
        statusEffects: string[];
    },
    turnNumber: number
): EmbedBuilder {
    const cClass = PvPService.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = PvPService.getClassLabel(state.defenderClass, state.defenderAdvanced);

    const cLabel = PvPService.getActionLabel(result.challengerAction, state.challengerClass, state.challengerAdvanced);
    const dLabel = PvPService.getActionLabel(result.defenderAction, state.defenderClass, state.defenderAdvanced);

    const lines: string[] = [];

    // Challenger action
    if (result.challengerAction === "defend") {
        lines.push(t(locale, "pvp.reveal.defend", {
            user: state.challengerId,
            class: `${cClass.name} ${cClass.emoji}`,
            heal: String(result.challengerHealed),
        }));
    } else {
        const skillName = t(locale, `rpg.skill.${cLabel.key}`, { defaultValue: cLabel.key });
        lines.push(t(locale, "pvp.reveal.action", {
            user: state.challengerId,
            class: `${cClass.name} ${cClass.emoji}`,
            skill: result.challengerDamageDealt > 0 ? skillName : skillName,
            damage: String(result.challengerDamageDealt),
        }));
    }

    // Defender action
    if (result.defenderAction === "defend") {
        lines.push(t(locale, "pvp.reveal.defend", {
            user: state.defenderId,
            class: `${dClass.name} ${dClass.emoji}`,
            heal: String(result.defenderHealed),
        }));
    } else {
        const skillName = t(locale, `rpg.skill.${dLabel.key}`, { defaultValue: dLabel.key });
        lines.push(t(locale, "pvp.reveal.action", {
            user: state.defenderId,
            class: `${dClass.name} ${dClass.emoji}`,
            skill: skillName,
            damage: String(result.defenderDamageDealt),
        }));
    }

    lines.push("");

    // Status
    lines.push(t(locale, "pvp.reveal.status", {
        user: state.challengerId,
        hp: String(result.challengerHp),
        maxHp: String(state.challengerMaxHp),
        mp: String(result.challengerMp),
        maxMp: String(state.challengerMaxMp),
    }));
    lines.push(t(locale, "pvp.reveal.status", {
        user: state.defenderId,
        hp: String(result.defenderHp),
        maxHp: String(state.defenderMaxHp),
        mp: String(result.defenderMp),
        maxMp: String(state.defenderMaxMp),
    }));

    return new EmbedBuilder()
        .setTitle(t(locale, "pvp.reveal.title", { turn: String(turnNumber) }))
        .setDescription(lines.join("\n"))
        .setColor(0x3498db);
}

// --- Helper: build result embed ---

function buildResultEmbed(
    locale: SupportedLocale,
    state: PvPMatchState,
    winnerId: string | null,
    turnNumber: number
): EmbedBuilder {
    const cClass = PvPService.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = PvPService.getClassLabel(state.defenderClass, state.defenderAdvanced);

    const lines: string[] = [];

    if (winnerId) {
        lines.push(t(locale, "pvp.result.winner", { winner: winnerId }));
    } else {
        lines.push(t(locale, "pvp.result.draw", { turns: String(turnNumber) }));
    }

    lines.push("");
    lines.push(`<@${state.challengerId}> (${cClass.name} ${cClass.emoji}): HP **${Math.max(0, state.challengerHp)}**/${state.challengerMaxHp}`);
    lines.push(`<@${state.defenderId}> (${dClass.name} ${dClass.emoji}): HP **${Math.max(0, state.defenderHp)}**/${state.defenderMaxHp}`);
    lines.push("");
    lines.push(`Duration: ${turnNumber} turns`);

    if (winnerId) {
        const loserId = winnerId === state.challengerId ? state.defenderId : state.challengerId;
        lines.push(t(locale, "pvp.result.reward_win", { gp: String(PvPService.PVP_WIN_GP), gold: String(PvPService.PVP_WIN_GOLD) }));
        lines.push(t(locale, "pvp.result.reward_lose", { gp: String(PvPService.PVP_LOSE_GP) }));
    } else {
        lines.push(t(locale, "pvp.result.reward_lose", { gp: String(PvPService.PVP_LOSE_GP) }));
    }

    return new EmbedBuilder()
        .setTitle(t(locale, "pvp.result.title"))
        .setDescription(lines.join("\n"))
        .setColor(winnerId ? 0x2ecc71 : 0x95a5a6);
}

// --- Turn loop logic ---

async function runTurnLoop(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    matchId: string
): Promise<void> {
    for (let turnIdx = 0; turnIdx < PvPService.PVP_MAX_TURNS; turnIdx++) {
        const state = await PvPService.getMatch(matchId);
        if (!state) return;

        const turnNumber = state.turn;

        // Build and send turn embed with action buttons
        const turnEmbed = buildTurnEmbed(locale, state);
        const actionRows = buildPvPActionRow(
            locale, matchId,
            state.challengerClass, state.challengerMp,
            state.challengerAdvanced, state.challengerUltimateUsed
        );

        // We show one set of buttons — both players click the same message.
        // Buttons are generic per the challenger's class but both players
        // get class-appropriate buttons via the collector.
        // For simplicity, show buttons matching the first player's class
        // and use customId parsing in the collector to determine actions.

        // Build a combined row that both can use
        const combinedRows = buildCombinedActionRows(locale, matchId, state);

        const msg = await interaction.editReply({
            embeds: [turnEmbed],
            components: combinedRows,
        });

        // Collect both player actions
        const submitted = new Set<string>();
        let collectorDone = false;

        try {
            const collector = msg.createMessageComponentCollector({ time: ACTION_TIMEOUT_MS });

            await new Promise<void>((resolve) => {
                collector.on("collect", async (btnInteraction) => {
                    const userId = btnInteraction.user.id;

                    if (userId !== state.challengerId && userId !== state.defenderId) {
                        await btnInteraction.reply({
                            content: t(locale, "pvp.turn.not_yours"),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    if (submitted.has(userId)) {
                        await btnInteraction.reply({
                            content: t(locale, "pvp.turn.already_chosen"),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    // Parse action from customId: pvp_{action}:{matchId}
                    const actionPart = btnInteraction.customId.split(":")[0].replace("pvp_", "");

                    // Validate MP for the specific player
                    const isChallenger = userId === state.challengerId;
                    const playerMp = isChallenger ? state.challengerMp : state.defenderMp;
                    const playerAdvanced = isChallenger ? state.challengerAdvanced : state.defenderAdvanced;
                    const playerUltUsed = isChallenger ? state.challengerUltimateUsed : state.defenderUltimateUsed;

                    let finalAction = actionPart;
                    if (actionPart === "skill1" && playerMp < SKILL1_MP_COST) finalAction = "attack";
                    if (actionPart === "skill2" && playerMp < SKILL2_MP_COST) finalAction = "attack";
                    if (actionPart === "ultimate" && (playerUltUsed || playerMp < ULTIMATE_MP_COST || !playerAdvanced)) finalAction = "attack";

                    await PvPService.submitAction(matchId, userId, finalAction);
                    submitted.add(userId);

                    await btnInteraction.reply({
                        content: t(locale, "pvp.turn.action_locked"),
                        flags: MessageFlags.Ephemeral,
                    });

                    if (submitted.size >= 2) {
                        collectorDone = true;
                        collector.stop("both_submitted");
                    }
                });

                collector.on("end", () => {
                    resolve();
                });
            });
        } catch {
            // Collector error — auto-defend for missing players
        }

        // Auto-defend for players who didn't submit
        if (!submitted.has(state.challengerId)) {
            await PvPService.submitAction(matchId, state.challengerId, "defend");
        }
        if (!submitted.has(state.defenderId)) {
            await PvPService.submitAction(matchId, state.defenderId, "defend");
        }

        // Resolve turn
        const result = await PvPService.resolveTurn(matchId);

        if (result.matchOver) {
            // Build and show result
            const updatedState = await PvPService.getMatch(matchId);
            const resultState: PvPMatchState = {
                ...state,
                challengerHp: result.challengerHp,
                defenderHp: result.defenderHp,
                challengerMp: result.challengerMp,
                defenderMp: result.defenderMp,
            };

            if (result.winnerId) {
                const loserId = result.winnerId === state.challengerId ? state.defenderId : state.challengerId;
                await PvPService.endMatch(matchId, result.winnerId, loserId);
            } else {
                await PvPService.endMatchDraw(state.challengerId, state.defenderId);
            }

            const revealEmbed = buildRevealEmbed(locale, state, result, turnNumber);
            const resultEmbed = buildResultEmbed(locale, resultState, result.winnerId, turnNumber);

            await interaction.editReply({
                embeds: [revealEmbed, resultEmbed],
                components: [],
            });

            await PvPService.setCooldown(state.challengerId);
            await PvPService.setCooldown(state.defenderId);
            return;
        }

        // Show reveal embed briefly, then continue to next turn
        const revealEmbed = buildRevealEmbed(locale, state, result, turnNumber);
        await interaction.editReply({
            embeds: [revealEmbed],
            components: [],
        });

        // Small delay before next turn to let players see the result
        await new Promise((r) => setTimeout(r, 2000));
    }
}

// --- Build combined action rows showing generic PvP buttons ---

function buildCombinedActionRows(
    locale: SupportedLocale,
    matchId: string,
    state: PvPMatchState
): ActionRowBuilder<ButtonBuilder>[] {
    const attackBtn = new ButtonBuilder()
        .setCustomId(`pvp_attack:${matchId}`)
        .setLabel(t(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(ButtonStyle.Danger);

    const skill1Btn = new ButtonBuilder()
        .setCustomId(`pvp_skill1:${matchId}`)
        .setLabel("Skill 1")
        .setEmoji("✨")
        .setStyle(ButtonStyle.Primary);

    const skill2Btn = new ButtonBuilder()
        .setCustomId(`pvp_skill2:${matchId}`)
        .setLabel("Skill 2")
        .setEmoji("🔥")
        .setStyle(ButtonStyle.Primary);

    const defendBtn = new ButtonBuilder()
        .setCustomId(`pvp_defend:${matchId}`)
        .setLabel(t(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary);

    // Show ultimate if either player has advanced class
    const hasAdvanced = state.challengerAdvanced !== null || state.defenderAdvanced !== null;

    if (hasAdvanced) {
        const ultimateBtn = new ButtonBuilder()
            .setCustomId(`pvp_ultimate:${matchId}`)
            .setLabel("Ultimate")
            .setEmoji("💥")
            .setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            attackBtn, skill1Btn, skill2Btn, ultimateBtn
        );
        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(defendBtn);
        return [row1, row2];
    }

    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            attackBtn, skill1Btn, skill2Btn, defendBtn
        ),
    ];
}

// --- Subcommand: challenge ---

async function handleChallenge(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    await interaction.deferReply();

    const challenger = interaction.user;
    const defender = interaction.options.getUser("user", true);

    // Validate not self
    if (challenger.id === defender.id) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.self"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Validate not a bot
    if (defender.bot) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.self"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Check cooldowns
    const [challengerCd, defenderCd] = await Promise.all([
        PvPService.checkCooldown(challenger.id),
        PvPService.checkCooldown(defender.id),
    ]);

    if (challengerCd > 0) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.cooldown", { time: formatCooldown(challengerCd) }))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    if (defenderCd > 0) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.cooldown_opponent", { time: formatCooldown(defenderCd) }))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Check active matches
    const [challengerInMatch, defenderInMatch] = await Promise.all([
        PvPService.isInMatch(challenger.id),
        PvPService.isInMatch(defender.id),
    ]);

    if (challengerInMatch || defenderInMatch) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.in_match"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Validate both have characters and guild membership
    const [challengerChar, defenderChar] = await Promise.all([
        CharacterService.getCharacter(challenger.id),
        CharacterService.getCharacter(defender.id),
    ]);

    if (!challengerChar || !defenderChar) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.no_character"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    const [challengerMember, defenderMember] = await Promise.all([
        GuildService.getMember(challenger.id),
        GuildService.getMember(defender.id),
    ]);

    if (!challengerMember || !defenderMember) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.no_guild"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    // Send challenge embed
    const challengeEmbed = new EmbedBuilder()
        .setTitle(t(locale, "pvp.challenge.title"))
        .setDescription(t(locale, "pvp.challenge.desc", {
            defender: defender.id,
            challenger: challenger.id,
        }))
        .setColor(0xe67e22);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`pvp_accept:${challenger.id}`)
            .setLabel(t(locale, "pvp.challenge.accept"))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`pvp_decline:${challenger.id}`)
            .setLabel(t(locale, "pvp.challenge.decline"))
            .setStyle(ButtonStyle.Danger),
    );

    const msg = await interaction.editReply({
        embeds: [challengeEmbed],
        components: [row],
    });

    // Wait for accept/decline
    try {
        const btnInteraction = await msg.awaitMessageComponent({
            filter: (i) => i.user.id === defender.id,
            time: CHALLENGE_TIMEOUT_MS,
        });

        if (btnInteraction.customId.startsWith("pvp_decline")) {
            const declinedEmbed = new EmbedBuilder()
                .setDescription(t(locale, "pvp.challenge.declined"))
                .setColor(0x95a5a6);
            await btnInteraction.update({ embeds: [declinedEmbed], components: [] });
            return;
        }

        // Accepted — create match
        await btnInteraction.update({
            embeds: [new EmbedBuilder()
                .setDescription(t(locale, "pvp.challenge.accepted"))
                .setColor(0x2ecc71)],
            components: [],
        });

        const matchState = await PvPService.createMatch(
            challenger.id,
            defender.id,
            interaction.channelId,
            msg.id
        );

        // Start the turn loop
        await runTurnLoop(interaction, locale, matchState.matchId);
    } catch {
        // Timeout
        const timeoutEmbed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.timeout"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
}

// --- Subcommand: stats ---

async function handleStats(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const member = await GuildService.getMember(userId);

    if (!member) {
        const embed = new EmbedBuilder()
            .setDescription(t(locale, "pvp.challenge.no_guild"))
            .setColor(0xed4245);
        await Reply.embedEdit(interaction, embed);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "pvp.stats.title", { username: interaction.user.username }))
        .setDescription([
            t(locale, "pvp.stats.rating", { rating: String(member.pvpRating) }),
            t(locale, "pvp.stats.record", { wins: String(member.pvpWins), losses: String(member.pvpLosses) }),
        ].join("\n"))
        .setColor(0x3498db)
        .setThumbnail(interaction.user.displayAvatarURL());

    await Reply.embedEdit(interaction, embed);
}

// --- Main command ---

export default {
    data: new SlashCommandBuilder()
        .setName("pvp")
        .setDescription("Player vs Player battles")
        .setDescriptionLocalizations(descriptionLocales("cmd.pvp.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("challenge")
                .setDescription("Challenge another player to a PvP battle")
                .setDescriptionLocalizations(descriptionLocales("cmd.pvp.challenge.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Player to challenge")
                        .setDescriptionLocalizations(descriptionLocales("cmd.pvp.challenge.user.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("stats")
                .setDescription("View your PvP record and rating")
                .setDescriptionLocalizations(descriptionLocales("cmd.pvp.stats.desc"))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const subcommand = interaction.options.getSubcommand(true);

        try {
            if (subcommand === "challenge") {
                await handleChallenge(interaction, locale);
            } else if (subcommand === "stats") {
                await handleStats(interaction, locale);
            }
        } catch (error) {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    },
};
