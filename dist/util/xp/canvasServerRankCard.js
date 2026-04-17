"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderServerRankCard = renderServerRankCard;
const canvas_1 = require("@napi-rs/canvas");
const canvasHelpers_1 = require("./canvasHelpers");
const calculator_1 = require("./calculator");
async function renderServerRankCard(options) {
    const { guildName, guildIconURL, totalXP, rank, totalServers, totalMessages, totalVoiceMinutes, totalReactions, activeMembers, periodStats, } = options;
    const level = (0, calculator_1.levelFromXP)(totalXP);
    const progress = (0, calculator_1.progressToNextLevel)(totalXP);
    const cardH = periodStats ? 400 : 360;
    const canvas = (0, canvas_1.createCanvas)(canvasHelpers_1.W, cardH);
    const ctx = canvas.getContext("2d");
    // --- Clip card to rounded rect ---
    (0, canvasHelpers_1.roundRect)(ctx, 0, 0, canvasHelpers_1.W, cardH, 14);
    ctx.clip();
    // --- Background ---
    ctx.fillStyle = canvasHelpers_1.C.bgDeep;
    ctx.fillRect(0, 0, canvasHelpers_1.W, cardH);
    (0, canvasHelpers_1.drawAnimeBackground)(ctx);
    // Accent stripe
    const stripeG = (0, canvasHelpers_1.gradientV)(ctx, 0, cardH, 0, [
        [0, canvasHelpers_1.C.pink],
        [1, canvasHelpers_1.C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, cardH);
    // --- Layout constants ---
    const PAD = 32;
    const AV_R = 72;
    const AV_CX = PAD + AV_R + 8;
    const AV_CY = cardH / 2 - 10;
    const CONTENT_X = AV_CX + AV_R + 28;
    const LV_W = 118;
    const LV_H = 110;
    const LV_X = canvasHelpers_1.W - PAD - LV_W;
    const LV_Y = PAD;
    const CONTENT_W = LV_X - CONTENT_X - 20;
    const STAT_Y = cardH - PAD - 78;
    const STAT_H = 78;
    const STAT_N = 4;
    const STAT_GAP = 12;
    const STAT_W = (CONTENT_W - (STAT_N - 1) * STAT_GAP) / STAT_N;
    // --- Server icon (circular) ---
    await (0, canvasHelpers_1.drawCircularImage)(ctx, guildIconURL, guildName[0] ?? "S", AV_CX, AV_CY, AV_R);
    // --- Rank badge ---
    const badgeStartY = AV_CY + AV_R + 12;
    const rankLabel = `RANK  #${rank || "—"} / ${totalServers}`;
    (0, canvasHelpers_1.drawRankBadge)(ctx, rankLabel, AV_CX, badgeStartY, [canvasHelpers_1.C.gold, "#ff8c00"]);
    // --- Level box (top right) ---
    (0, canvasHelpers_1.drawLevelBox)(ctx, level, LV_X, LV_Y, LV_W, LV_H);
    // --- Name block ---
    const NAME_Y = PAD + 40;
    (0, canvasHelpers_1.drawNameBlock)(ctx, guildName, "Server", CONTENT_X, NAME_Y, CONTENT_W);
    // --- Divider ---
    (0, canvasHelpers_1.drawDivider)(ctx, CONTENT_X, NAME_Y + 48, CONTENT_W);
    // --- XP bar ---
    const XP_Y = NAME_Y + 64;
    (0, canvasHelpers_1.drawXPBar)(ctx, totalXP, (0, calculator_1.xpForLevel)(level + 1), progress.percentage, CONTENT_X, XP_Y, CONTENT_W);
    // --- Stat cards ---
    const statItems = [
        { label: "MESSAGES", value: totalMessages.toLocaleString(), color: canvasHelpers_1.C.pink },
        { label: "VOICE", value: (0, canvasHelpers_1.formatVoice)(totalVoiceMinutes), color: canvasHelpers_1.C.purple },
        { label: "REACTIONS", value: totalReactions.toLocaleString(), color: canvasHelpers_1.C.pink },
        { label: "MEMBERS", value: activeMembers.toLocaleString(), color: canvasHelpers_1.C.gold },
    ];
    for (let i = 0; i < statItems.length; i++) {
        const { label, value, color } = statItems[i];
        const sx = CONTENT_X + i * (STAT_W + STAT_GAP);
        (0, canvasHelpers_1.drawStatCard)(ctx, label, value, sx, STAT_Y, STAT_W, STAT_H, color);
    }
    // --- Period stat cards ---
    if (periodStats) {
        const PERIOD_H = 60;
        const PERIOD_Y = STAT_Y - PERIOD_H - 12;
        const PERIOD_N = 3;
        const PERIOD_GAP = 12;
        const PERIOD_W = (CONTENT_W - (PERIOD_N - 1) * PERIOD_GAP) / PERIOD_N;
        const periodItems = [
            { label: "TODAY", value: `+${periodStats.daily.toLocaleString()}`, color: canvasHelpers_1.C.pink },
            { label: "THIS WEEK", value: `+${periodStats.weekly.toLocaleString()}`, color: canvasHelpers_1.C.purple },
            { label: "THIS MONTH", value: `+${periodStats.monthly.toLocaleString()}`, color: canvasHelpers_1.C.gold },
        ];
        for (let i = 0; i < periodItems.length; i++) {
            const { label, value, color } = periodItems[i];
            const sx = CONTENT_X + i * (PERIOD_W + PERIOD_GAP);
            (0, canvasHelpers_1.drawStatCard)(ctx, label, value, sx, PERIOD_Y, PERIOD_W, PERIOD_H, color);
        }
    }
    // --- Outer card border ---
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    (0, canvasHelpers_1.roundRect)(ctx, 0.5, 0.5, canvasHelpers_1.W - 1, cardH - 1, 14);
    ctx.stroke();
    return canvas.toBuffer("image/png");
}
