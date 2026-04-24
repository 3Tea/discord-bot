"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/commands/slash/pvp.ts
const discord_js_1 = require("discord.js");
const character_service_1 = __importDefault(require("../../services/rpg/character.service"));
const guild_service_1 = __importDefault(require("../../services/rpg/guild.service"));
const pvp_service_1 = __importDefault(require("../../services/rpg/pvp.service"));
const rpg_config_1 = require("../../services/rpg/rpg.config");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const format_1 = require("../../util/date/format");
const ACTION_TIMEOUT_MS = 30_000;
const CHALLENGE_TIMEOUT_MS = 60_000;
// --- Helper: build PvP action buttons ---
function buildPvPActionRow(locale, matchId, classType, currentMp, advancedClass, ultimateUsed) {
    const [skill1, skill2] = rpg_config_1.CLASS_SKILLS[classType];
    const attackBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_attack:${matchId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const skill1Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_skill1:${matchId}`)
        .setLabel((0, t_1.t)(locale, `rpg.skill.${skill1.key}`))
        .setEmoji(skill1.emoji)
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(currentMp < rpg_config_1.SKILL1_MP_COST);
    const skill2Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_skill2:${matchId}`)
        .setLabel((0, t_1.t)(locale, `rpg.skill.${skill2.key}`))
        .setEmoji(skill2.emoji)
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(currentMp < rpg_config_1.SKILL2_MP_COST);
    const defendBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_defend:${matchId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    if (advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[advancedClass];
        const ultimateBtn = new discord_js_1.ButtonBuilder()
            .setCustomId(`pvp_ultimate:${matchId}`)
            .setLabel((0, t_1.t)(locale, `rpg.skill.${advConfig.ultimate.key}`))
            .setEmoji(advConfig.ultimate.emoji)
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setDisabled(ultimateUsed || currentMp < rpg_config_1.ULTIMATE_MP_COST);
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, ultimateBtn);
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(defendBtn);
        return [row1, row2];
    }
    return [new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn)];
}
// --- Helper: build turn status embed for the channel ---
function buildTurnEmbed(locale, state) {
    const cClass = pvp_service_1.default.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = pvp_service_1.default.getClassLabel(state.defenderClass, state.defenderAdvanced);
    return new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "pvp.turn.title", { turn: String(state.turn), max: String(state.maxTurns) }))
        .setDescription([
        (0, t_1.t)(locale, "pvp.reveal.status", {
            user: state.challengerId,
            hp: String(state.challengerHp),
            maxHp: String(state.challengerMaxHp),
            mp: String(state.challengerMp),
            maxMp: String(state.challengerMaxMp),
        }) + ` (${cClass.emoji} ${cClass.name})`,
        (0, t_1.t)(locale, "pvp.reveal.status", {
            user: state.defenderId,
            hp: String(state.defenderHp),
            maxHp: String(state.defenderMaxHp),
            mp: String(state.defenderMp),
            maxMp: String(state.defenderMaxMp),
        }) + ` (${dClass.emoji} ${dClass.name})`,
        "",
        (0, t_1.t)(locale, "pvp.turn.select"),
    ].join("\n"))
        .setColor(0xe67e22);
}
// --- Helper: build reveal embed ---
function buildRevealEmbed(locale, state, result, turnNumber) {
    const cClass = pvp_service_1.default.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = pvp_service_1.default.getClassLabel(state.defenderClass, state.defenderAdvanced);
    const cLabel = pvp_service_1.default.getActionLabel(result.challengerAction, state.challengerClass, state.challengerAdvanced);
    const dLabel = pvp_service_1.default.getActionLabel(result.defenderAction, state.defenderClass, state.defenderAdvanced);
    const lines = [];
    // Challenger action
    if (result.challengerAction === "defend") {
        lines.push((0, t_1.t)(locale, "pvp.reveal.defend", {
            user: state.challengerId,
            class: `${cClass.name} ${cClass.emoji}`,
            heal: String(result.challengerHealed),
        }));
    }
    else {
        const skillName = (0, t_1.t)(locale, `rpg.skill.${cLabel.key}`, { defaultValue: cLabel.key });
        lines.push((0, t_1.t)(locale, "pvp.reveal.action", {
            user: state.challengerId,
            class: `${cClass.name} ${cClass.emoji}`,
            skill: result.challengerDamageDealt > 0 ? skillName : skillName,
            damage: String(result.challengerDamageDealt),
        }));
    }
    // Defender action
    if (result.defenderAction === "defend") {
        lines.push((0, t_1.t)(locale, "pvp.reveal.defend", {
            user: state.defenderId,
            class: `${dClass.name} ${dClass.emoji}`,
            heal: String(result.defenderHealed),
        }));
    }
    else {
        const skillName = (0, t_1.t)(locale, `rpg.skill.${dLabel.key}`, { defaultValue: dLabel.key });
        lines.push((0, t_1.t)(locale, "pvp.reveal.action", {
            user: state.defenderId,
            class: `${dClass.name} ${dClass.emoji}`,
            skill: skillName,
            damage: String(result.defenderDamageDealt),
        }));
    }
    lines.push("");
    // Status
    lines.push((0, t_1.t)(locale, "pvp.reveal.status", {
        user: state.challengerId,
        hp: String(result.challengerHp),
        maxHp: String(state.challengerMaxHp),
        mp: String(result.challengerMp),
        maxMp: String(state.challengerMaxMp),
    }));
    lines.push((0, t_1.t)(locale, "pvp.reveal.status", {
        user: state.defenderId,
        hp: String(result.defenderHp),
        maxHp: String(state.defenderMaxHp),
        mp: String(result.defenderMp),
        maxMp: String(state.defenderMaxMp),
    }));
    return new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "pvp.reveal.title", { turn: String(turnNumber) }))
        .setDescription(lines.join("\n"))
        .setColor(0x3498db);
}
// --- Helper: build result embed ---
function buildResultEmbed(locale, state, winnerId, turnNumber) {
    const cClass = pvp_service_1.default.getClassLabel(state.challengerClass, state.challengerAdvanced);
    const dClass = pvp_service_1.default.getClassLabel(state.defenderClass, state.defenderAdvanced);
    const lines = [];
    if (winnerId) {
        lines.push((0, t_1.t)(locale, "pvp.result.winner", { winner: winnerId }));
    }
    else {
        lines.push((0, t_1.t)(locale, "pvp.result.draw", { turns: String(turnNumber) }));
    }
    lines.push("");
    lines.push(`<@${state.challengerId}> (${cClass.name} ${cClass.emoji}): HP **${Math.max(0, state.challengerHp)}**/${state.challengerMaxHp}`);
    lines.push(`<@${state.defenderId}> (${dClass.name} ${dClass.emoji}): HP **${Math.max(0, state.defenderHp)}**/${state.defenderMaxHp}`);
    lines.push("");
    lines.push(`Duration: ${turnNumber} turns`);
    if (winnerId) {
        const loserId = winnerId === state.challengerId ? state.defenderId : state.challengerId;
        lines.push((0, t_1.t)(locale, "pvp.result.reward_win", {
            gp: String(pvp_service_1.default.PVP_WIN_GP),
            gold: String(pvp_service_1.default.PVP_WIN_GOLD),
        }));
        lines.push((0, t_1.t)(locale, "pvp.result.reward_lose", { gp: String(pvp_service_1.default.PVP_LOSE_GP) }));
    }
    else {
        lines.push((0, t_1.t)(locale, "pvp.result.reward_lose", { gp: String(pvp_service_1.default.PVP_LOSE_GP) }));
    }
    return new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "pvp.result.title"))
        .setDescription(lines.join("\n"))
        .setColor(winnerId ? 0x2ecc71 : 0x95a5a6);
}
// --- Turn loop logic ---
async function runTurnLoop(interaction, locale, matchId) {
    for (let turnIdx = 0; turnIdx < pvp_service_1.default.PVP_MAX_TURNS; turnIdx++) {
        const state = await pvp_service_1.default.getMatch(matchId);
        if (!state)
            return;
        const turnNumber = state.turn;
        // Build and send turn embed with action buttons
        const turnEmbed = buildTurnEmbed(locale, state);
        const actionRows = buildPvPActionRow(locale, matchId, state.challengerClass, state.challengerMp, state.challengerAdvanced, state.challengerUltimateUsed);
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
        const submitted = new Set();
        let collectorDone = false;
        try {
            const collector = msg.createMessageComponentCollector({ time: ACTION_TIMEOUT_MS });
            await new Promise((resolve) => {
                collector.on("collect", async (btnInteraction) => {
                    const userId = btnInteraction.user.id;
                    if (userId !== state.challengerId && userId !== state.defenderId) {
                        await btnInteraction.reply({
                            content: (0, t_1.t)(locale, "pvp.turn.not_yours"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    if (submitted.has(userId)) {
                        await btnInteraction.reply({
                            content: (0, t_1.t)(locale, "pvp.turn.already_chosen"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
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
                    if (actionPart === "skill1" && playerMp < rpg_config_1.SKILL1_MP_COST)
                        finalAction = "attack";
                    if (actionPart === "skill2" && playerMp < rpg_config_1.SKILL2_MP_COST)
                        finalAction = "attack";
                    if (actionPart === "ultimate" && (playerUltUsed || playerMp < rpg_config_1.ULTIMATE_MP_COST || !playerAdvanced))
                        finalAction = "attack";
                    await pvp_service_1.default.submitAction(matchId, userId, finalAction);
                    submitted.add(userId);
                    await btnInteraction.reply({
                        content: (0, t_1.t)(locale, "pvp.turn.action_locked"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
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
        }
        catch {
            // Collector error — auto-defend for missing players
        }
        // Auto-defend for players who didn't submit
        if (!submitted.has(state.challengerId)) {
            await pvp_service_1.default.submitAction(matchId, state.challengerId, "defend");
        }
        if (!submitted.has(state.defenderId)) {
            await pvp_service_1.default.submitAction(matchId, state.defenderId, "defend");
        }
        // Resolve turn
        const result = await pvp_service_1.default.resolveTurn(matchId);
        if (result.matchOver) {
            // Build and show result
            const updatedState = await pvp_service_1.default.getMatch(matchId);
            const resultState = {
                ...state,
                challengerHp: result.challengerHp,
                defenderHp: result.defenderHp,
                challengerMp: result.challengerMp,
                defenderMp: result.defenderMp,
            };
            if (result.winnerId) {
                const loserId = result.winnerId === state.challengerId ? state.defenderId : state.challengerId;
                await pvp_service_1.default.endMatch(matchId, result.winnerId, loserId);
            }
            else {
                await pvp_service_1.default.endMatchDraw(state.challengerId, state.defenderId);
            }
            const revealEmbed = buildRevealEmbed(locale, state, result, turnNumber);
            const resultEmbed = buildResultEmbed(locale, resultState, result.winnerId, turnNumber);
            await interaction.editReply({
                embeds: [revealEmbed, resultEmbed],
                components: [],
            });
            await pvp_service_1.default.setCooldown(state.challengerId);
            await pvp_service_1.default.setCooldown(state.defenderId);
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
function buildCombinedActionRows(locale, matchId, state) {
    const attackBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_attack:${matchId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.attack"))
        .setEmoji("⚔️")
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const skill1Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_skill1:${matchId}`)
        .setLabel("Skill 1")
        .setEmoji("✨")
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const skill2Btn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_skill2:${matchId}`)
        .setLabel("Skill 2")
        .setEmoji("🔥")
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const defendBtn = new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_defend:${matchId}`)
        .setLabel((0, t_1.t)(locale, "dungeon.btn.defend"))
        .setEmoji("🛡️")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    // Show ultimate if either player has advanced class
    const hasAdvanced = state.challengerAdvanced !== null || state.defenderAdvanced !== null;
    if (hasAdvanced) {
        const ultimateBtn = new discord_js_1.ButtonBuilder()
            .setCustomId(`pvp_ultimate:${matchId}`)
            .setLabel("Ultimate")
            .setEmoji("💥")
            .setStyle(discord_js_1.ButtonStyle.Danger);
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, ultimateBtn);
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(defendBtn);
        return [row1, row2];
    }
    return [new discord_js_1.ActionRowBuilder().addComponents(attackBtn, skill1Btn, skill2Btn, defendBtn)];
}
// --- Subcommand: challenge ---
async function handleChallenge(interaction, locale) {
    await interaction.deferReply();
    const challenger = interaction.user;
    const defender = interaction.options.getUser("user", true);
    // Validate not self
    if (challenger.id === defender.id) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.self")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Validate not a bot
    if (defender.bot) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.self")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check cooldowns
    const [challengerCd, defenderCd] = await Promise.all([
        pvp_service_1.default.checkCooldown(challenger.id),
        pvp_service_1.default.checkCooldown(defender.id),
    ]);
    if (challengerCd > 0) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "pvp.challenge.cooldown", { time: (0, format_1.formatCooldown)(challengerCd) }))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    if (defenderCd > 0) {
        const embed = new discord_js_1.EmbedBuilder()
            .setDescription((0, t_1.t)(locale, "pvp.challenge.cooldown_opponent", { time: (0, format_1.formatCooldown)(defenderCd) }))
            .setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Check active matches
    const [challengerInMatch, defenderInMatch] = await Promise.all([
        pvp_service_1.default.isInMatch(challenger.id),
        pvp_service_1.default.isInMatch(defender.id),
    ]);
    if (challengerInMatch || defenderInMatch) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.in_match")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Validate both have characters and guild membership
    const [challengerChar, defenderChar] = await Promise.all([
        character_service_1.default.getCharacter(challenger.id),
        character_service_1.default.getCharacter(defender.id),
    ]);
    if (!challengerChar || !defenderChar) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.no_character")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    const [challengerMember, defenderMember] = await Promise.all([
        guild_service_1.default.getMember(challenger.id),
        guild_service_1.default.getMember(defender.id),
    ]);
    if (!challengerMember || !defenderMember) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.no_guild")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    // Send challenge embed
    const challengeEmbed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "pvp.challenge.title"))
        .setDescription((0, t_1.t)(locale, "pvp.challenge.desc", {
        defender: defender.id,
        challenger: challenger.id,
    }))
        .setColor(0xe67e22);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_accept:${challenger.id}`)
        .setLabel((0, t_1.t)(locale, "pvp.challenge.accept"))
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(`pvp_decline:${challenger.id}`)
        .setLabel((0, t_1.t)(locale, "pvp.challenge.decline"))
        .setStyle(discord_js_1.ButtonStyle.Danger));
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
            const declinedEmbed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "pvp.challenge.declined"))
                .setColor(0x95a5a6);
            await btnInteraction.update({ embeds: [declinedEmbed], components: [] });
            return;
        }
        // Accepted — create match
        await btnInteraction.update({
            embeds: [new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.accepted")).setColor(0x2ecc71)],
            components: [],
        });
        const matchState = await pvp_service_1.default.createMatch(challenger.id, defender.id, interaction.channelId, msg.id);
        // Start the turn loop
        await runTurnLoop(interaction, locale, matchState.matchId);
    }
    catch {
        // Timeout
        const timeoutEmbed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.timeout")).setColor(0x95a5a6);
        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
}
// --- Subcommand: stats ---
async function handleStats(interaction, locale) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const member = await guild_service_1.default.getMember(userId);
    if (!member) {
        const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "pvp.challenge.no_guild")).setColor(0xed4245);
        await reply_1.default.embedEdit(interaction, embed);
        return;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "pvp.stats.title", { username: interaction.user.username }))
        .setDescription([
        (0, t_1.t)(locale, "pvp.stats.rating", { rating: String(member.pvpRating) }),
        (0, t_1.t)(locale, "pvp.stats.record", { wins: String(member.pvpWins), losses: String(member.pvpLosses) }),
    ].join("\n"))
        .setColor(0x3498db)
        .setThumbnail(interaction.user.displayAvatarURL());
    await reply_1.default.embedEdit(interaction, embed);
}
// --- Main command ---
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("pvp")
        .setDescription("Player vs Player battles")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pvp.desc"))
        .addSubcommand((sub) => sub
        .setName("challenge")
        .setDescription("Challenge another player to a PvP battle")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pvp.challenge.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Player to challenge")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pvp.challenge.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("stats")
        .setDescription("View your PvP record and rating")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.pvp.stats.desc"))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        const subcommand = interaction.options.getSubcommand(true);
        try {
            if (subcommand === "challenge") {
                await handleChallenge(interaction, locale);
            }
            else if (subcommand === "stats") {
                await handleStats(interaction, locale);
            }
        }
        catch (error) {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] }).catch(() => { });
            }
            else {
                await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral }).catch(() => { });
            }
        }
    },
};
