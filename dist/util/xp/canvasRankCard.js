"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRankCard = renderRankCard;
const canvas_1 = require("@napi-rs/canvas");
const canvasHelpers_1 = require("./canvasHelpers");
// Galaxy theme accent colors
const GALAXY = {
    accentA: "#ffd700", // gold
    accentB: "#6a0dad", // deep purple
    stat1: "#ffd700", // gold
    stat2: "#00d4ff", // cyan
    stat3: "#c44dff", // purple
    stat4: "#ffd700", // gold
    borderGlow: "rgba(255,215,0,0.15)",
    tint: "rgba(106,13,173,0.08)",
};
async function renderRankCard(options) {
    const { username, discriminator, avatarURL, level, rank, globalRank, xp, xpForNextLevel, percentage, messageCount, voiceMinutes, reactionCount, totalXP = xp, periodStats, premiumBadge = null, rankCardTheme = "standard", } = options;
    const isGalaxy = rankCardTheme === "galaxy";
    // Taller canvas when period stats are present
    const cardH = periodStats ? 400 : canvasHelpers_1.H;
    const canvas = (0, canvas_1.createCanvas)(canvasHelpers_1.W, cardH);
    const ctx = canvas.getContext("2d");
    // --- Clip card to rounded rect ---
    (0, canvasHelpers_1.roundRect)(ctx, 0, 0, canvasHelpers_1.W, cardH, 14);
    ctx.clip();
    // --- Background ---
    // Fill entire canvas with deep background color first (handles taller card)
    ctx.fillStyle = canvasHelpers_1.C.bgDeep;
    ctx.fillRect(0, 0, canvasHelpers_1.W, cardH);
    (0, canvasHelpers_1.drawAnimeBackground)(ctx);
    // Galaxy theme: subtle gold tint overlay
    if (isGalaxy) {
        ctx.fillStyle = GALAXY.tint;
        ctx.fillRect(0, 0, canvasHelpers_1.W, cardH);
    }
    // Extend accent stripe to full card height
    const stripeG = (0, canvasHelpers_1.gradientV)(ctx, 0, cardH, 0, [
        [0, isGalaxy ? GALAXY.accentA : canvasHelpers_1.C.pink],
        [1, isGalaxy ? GALAXY.accentB : canvasHelpers_1.C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, cardH);
    // --- Layout constants ---
    const PAD = 32; // outer padding
    const AV_R = 72; // avatar radius
    const AV_CX = PAD + AV_R + 8; // avatar center X
    const AV_CY = cardH / 2 - 10; // avatar center Y
    const CONTENT_X = AV_CX + AV_R + 28; // right content start X
    const LV_W = 118;
    const LV_H = 110;
    const LV_X = canvasHelpers_1.W - PAD - LV_W;
    const LV_Y = PAD;
    const CONTENT_W = LV_X - CONTENT_X - 20; // usable width for text/bar
    const STAT_Y = cardH - PAD - 78;
    const STAT_H = 78;
    const STAT_N = 4; // Messages, Voice, Reactions, Total XP
    const STAT_GAP = 12;
    const STAT_W = (CONTENT_W - (STAT_N - 1) * STAT_GAP) / STAT_N;
    // --- Avatar ---
    await (0, canvasHelpers_1.drawCircularImage)(ctx, avatarURL, username[0], AV_CX, AV_CY, AV_R);
    // Online status dot
    const dotX = AV_CX + AV_R * Math.cos(Math.PI * 0.75);
    const dotY = AV_CY + AV_R * Math.sin(Math.PI * 0.75);
    // Ring behind dot
    ctx.fillStyle = canvasHelpers_1.C.bgDeep;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
    ctx.fill();
    // Green dot
    (0, canvasHelpers_1.shadow)(ctx, "rgba(59,165,92,0.6)", 8);
    ctx.fillStyle = canvasHelpers_1.C.green;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fill();
    (0, canvasHelpers_1.clearShadow)(ctx);
    // Highlight
    ctx.fillStyle = canvasHelpers_1.C.greenHi;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(dotX - 2.5, dotY - 2.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Dual rank badges (below avatar)
    const badgeStartY = AV_CY + AV_R + 12;
    const serverLabel = `SERVER  #${rank || "—"}`;
    const globalLabel = `GLOBAL  #${globalRank || "—"}`;
    const badgeH = (0, canvasHelpers_1.drawRankBadge)(ctx, serverLabel, AV_CX, badgeStartY, [canvasHelpers_1.C.pink, canvasHelpers_1.C.purple]);
    (0, canvasHelpers_1.drawRankBadge)(ctx, globalLabel, AV_CX, badgeStartY + badgeH + 6, [canvasHelpers_1.C.gold, "#ff8c00"]);
    // Premium badge
    if (premiumBadge) {
        (0, canvasHelpers_1.drawPremiumBadge)(ctx, premiumBadge, AV_CX - 35, badgeStartY + badgeH + 6 + 30 + 8);
    }
    // --- Level box (top right) ---
    (0, canvasHelpers_1.drawLevelBox)(ctx, level, LV_X, LV_Y, LV_W, LV_H);
    // --- Name block ---
    const NAME_Y = PAD + 40;
    (0, canvasHelpers_1.drawNameBlock)(ctx, username, discriminator ?? "Member", CONTENT_X, NAME_Y, CONTENT_W);
    // --- Divider between name and XP ---
    (0, canvasHelpers_1.drawDivider)(ctx, CONTENT_X, NAME_Y + 48, CONTENT_W);
    // --- XP bar ---
    const XP_Y = NAME_Y + 64;
    (0, canvasHelpers_1.drawXPBar)(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);
    // --- Stat cards ---
    const statItems = isGalaxy
        ? [
            { label: "MESSAGES", value: messageCount.toLocaleString(), color: GALAXY.stat1 },
            { label: "VOICE", value: (0, canvasHelpers_1.formatVoice)(voiceMinutes), color: GALAXY.stat2 },
            { label: "REACTIONS", value: reactionCount.toLocaleString(), color: GALAXY.stat3 },
            { label: "TOTAL XP", value: totalXP.toLocaleString(), color: GALAXY.stat4 },
        ]
        : [
            { label: "MESSAGES", value: messageCount.toLocaleString(), color: canvasHelpers_1.C.pink },
            { label: "VOICE", value: (0, canvasHelpers_1.formatVoice)(voiceMinutes), color: canvasHelpers_1.C.purple },
            { label: "REACTIONS", value: reactionCount.toLocaleString(), color: canvasHelpers_1.C.pink },
            { label: "TOTAL XP", value: totalXP.toLocaleString(), color: canvasHelpers_1.C.gold },
        ];
    for (let i = 0; i < statItems.length; i++) {
        const { label, value, color } = statItems[i];
        const sx = CONTENT_X + i * (STAT_W + STAT_GAP);
        (0, canvasHelpers_1.drawStatCard)(ctx, label, value, sx, STAT_Y, STAT_W, STAT_H, color);
    }
    // --- Period stat cards (second row, above existing stats) ---
    if (periodStats) {
        const PERIOD_H = 60;
        const PERIOD_Y = STAT_Y - PERIOD_H - 12;
        const PERIOD_N = 3;
        const PERIOD_GAP = 12;
        const PERIOD_W = (CONTENT_W - (PERIOD_N - 1) * PERIOD_GAP) / PERIOD_N;
        const periodItems = isGalaxy
            ? [
                { label: "TODAY", value: `+${periodStats.daily.toLocaleString()}`, color: GALAXY.stat1 },
                { label: "THIS WEEK", value: `+${periodStats.weekly.toLocaleString()}`, color: GALAXY.stat2 },
                { label: "THIS MONTH", value: `+${periodStats.monthly.toLocaleString()}`, color: GALAXY.stat4 },
            ]
            : [
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
    if (isGalaxy) {
        // Galaxy: golden glow border
        (0, canvasHelpers_1.shadow)(ctx, GALAXY.borderGlow, 12);
        ctx.strokeStyle = "rgba(255,215,0,0.25)";
        ctx.lineWidth = 2;
        (0, canvasHelpers_1.roundRect)(ctx, 1, 1, canvasHelpers_1.W - 2, cardH - 2, 14);
        ctx.stroke();
        (0, canvasHelpers_1.clearShadow)(ctx);
    }
    else {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        (0, canvasHelpers_1.roundRect)(ctx, 0.5, 0.5, canvasHelpers_1.W - 1, cardH - 1, 14);
        ctx.stroke();
    }
    return canvas.toBuffer("image/png");
}
