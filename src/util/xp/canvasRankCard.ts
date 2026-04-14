import { createCanvas } from "@napi-rs/canvas";
import {
    C,
    clearShadow,
    drawAnimeBackground,
    drawCircularImage,
    drawDivider,
    drawLevelBox,
    drawNameBlock,
    drawPremiumBadge,
    drawRankBadge,
    drawStatCard,
    drawXPBar,
    formatVoice,
    gradientV,
    H,
    roundRect,
    shadow,
    W,
} from "./canvasHelpers";

// --- Public API ---

export interface RankCardOptions {
    username: string;
    discriminator?: string;
    avatarURL: string | null;
    level: number;
    rank: number;
    globalRank: number;
    xp: number;
    xpForNextLevel: number;
    percentage: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    totalXP?: number;
    periodStats?: { daily: number; weekly: number; monthly: number };
    premiumBadge?: string | null;
    rankCardTheme?: string;
}

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
} as const;

export async function renderRankCard(options: RankCardOptions): Promise<Buffer> {
    const {
        username,
        discriminator,
        avatarURL,
        level,
        rank,
        globalRank,
        xp,
        xpForNextLevel,
        percentage,
        messageCount,
        voiceMinutes,
        reactionCount,
        totalXP = xp,
        periodStats,
        premiumBadge = null,
        rankCardTheme = "standard",
    } = options;

    const isGalaxy = rankCardTheme === "galaxy";

    // Taller canvas when period stats are present
    const cardH = periodStats ? 400 : H;
    const canvas = createCanvas(W, cardH);
    const ctx = canvas.getContext("2d");

    // --- Clip card to rounded rect ---
    roundRect(ctx, 0, 0, W, cardH, 14);
    ctx.clip();

    // --- Background ---
    // Fill entire canvas with deep background color first (handles taller card)
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, W, cardH);
    drawAnimeBackground(ctx);

    // Galaxy theme: subtle gold tint overlay
    if (isGalaxy) {
        ctx.fillStyle = GALAXY.tint;
        ctx.fillRect(0, 0, W, cardH);
    }

    // Extend accent stripe to full card height
    const stripeG = gradientV(ctx, 0, cardH, 0, [
        [0, isGalaxy ? GALAXY.accentA : C.pink],
        [1, isGalaxy ? GALAXY.accentB : C.purple],
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
    const LV_X = W - PAD - LV_W;
    const LV_Y = PAD;

    const CONTENT_W = LV_X - CONTENT_X - 20; // usable width for text/bar

    const STAT_Y = cardH - PAD - 78;
    const STAT_H = 78;
    const STAT_N = 4; // Messages, Voice, Reactions, Total XP
    const STAT_GAP = 12;
    const STAT_W = (CONTENT_W - (STAT_N - 1) * STAT_GAP) / STAT_N;

    // --- Avatar ---
    await drawCircularImage(ctx, avatarURL, username[0], AV_CX, AV_CY, AV_R);

    // Online status dot
    const dotX = AV_CX + AV_R * Math.cos(Math.PI * 0.75);
    const dotY = AV_CY + AV_R * Math.sin(Math.PI * 0.75);
    // Ring behind dot
    ctx.fillStyle = C.bgDeep;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
    ctx.fill();
    // Green dot
    shadow(ctx, "rgba(59,165,92,0.6)", 8);
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fill();
    clearShadow(ctx);
    // Highlight
    ctx.fillStyle = C.greenHi;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(dotX - 2.5, dotY - 2.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Dual rank badges (below avatar)
    const badgeStartY = AV_CY + AV_R + 12;
    const serverLabel = `SERVER  #${rank || "—"}`;
    const globalLabel = `GLOBAL  #${globalRank || "—"}`;
    const badgeH = drawRankBadge(ctx, serverLabel, AV_CX, badgeStartY, [C.pink, C.purple]);
    drawRankBadge(ctx, globalLabel, AV_CX, badgeStartY + badgeH + 6, [C.gold, "#ff8c00"]);

    // Premium badge
    if (premiumBadge) {
        drawPremiumBadge(ctx, premiumBadge, AV_CX - 35, badgeStartY + badgeH + 6 + 30 + 8);
    }

    // --- Level box (top right) ---
    drawLevelBox(ctx, level, LV_X, LV_Y, LV_W, LV_H);

    // --- Name block ---
    const NAME_Y = PAD + 40;
    drawNameBlock(ctx, username, discriminator ?? "Member", CONTENT_X, NAME_Y, CONTENT_W);

    // --- Divider between name and XP ---
    drawDivider(ctx, CONTENT_X, NAME_Y + 48, CONTENT_W);

    // --- XP bar ---
    const XP_Y = NAME_Y + 64;
    drawXPBar(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);

    // --- Stat cards ---
    const statItems: { label: string; value: string; color: string }[] = isGalaxy
        ? [
              { label: "MESSAGES", value: messageCount.toLocaleString(), color: GALAXY.stat1 },
              { label: "VOICE", value: formatVoice(voiceMinutes), color: GALAXY.stat2 },
              { label: "REACTIONS", value: reactionCount.toLocaleString(), color: GALAXY.stat3 },
              { label: "TOTAL XP", value: totalXP.toLocaleString(), color: GALAXY.stat4 },
          ]
        : [
              { label: "MESSAGES", value: messageCount.toLocaleString(), color: C.pink },
              { label: "VOICE", value: formatVoice(voiceMinutes), color: C.purple },
              { label: "REACTIONS", value: reactionCount.toLocaleString(), color: C.pink },
              { label: "TOTAL XP", value: totalXP.toLocaleString(), color: C.gold },
          ];

    for (let i = 0; i < statItems.length; i++) {
        const { label, value, color } = statItems[i];
        const sx = CONTENT_X + i * (STAT_W + STAT_GAP);
        drawStatCard(ctx, label, value, sx, STAT_Y, STAT_W, STAT_H, color);
    }

    // --- Period stat cards (second row, above existing stats) ---
    if (periodStats) {
        const PERIOD_H = 60;
        const PERIOD_Y = STAT_Y - PERIOD_H - 12;
        const PERIOD_N = 3;
        const PERIOD_GAP = 12;
        const PERIOD_W = (CONTENT_W - (PERIOD_N - 1) * PERIOD_GAP) / PERIOD_N;

        const periodItems: { label: string; value: string; color: string }[] = isGalaxy
            ? [
                  { label: "TODAY", value: `+${periodStats.daily.toLocaleString()}`, color: GALAXY.stat1 },
                  { label: "THIS WEEK", value: `+${periodStats.weekly.toLocaleString()}`, color: GALAXY.stat2 },
                  { label: "THIS MONTH", value: `+${periodStats.monthly.toLocaleString()}`, color: GALAXY.stat4 },
              ]
            : [
                  { label: "TODAY", value: `+${periodStats.daily.toLocaleString()}`, color: C.pink },
                  { label: "THIS WEEK", value: `+${periodStats.weekly.toLocaleString()}`, color: C.purple },
                  { label: "THIS MONTH", value: `+${periodStats.monthly.toLocaleString()}`, color: C.gold },
              ];

        for (let i = 0; i < periodItems.length; i++) {
            const { label, value, color } = periodItems[i];
            const sx = CONTENT_X + i * (PERIOD_W + PERIOD_GAP);
            drawStatCard(ctx, label, value, sx, PERIOD_Y, PERIOD_W, PERIOD_H, color);
        }
    }

    // --- Outer card border ---
    if (isGalaxy) {
        // Galaxy: golden glow border
        shadow(ctx, GALAXY.borderGlow, 12);
        ctx.strokeStyle = "rgba(255,215,0,0.25)";
        ctx.lineWidth = 2;
        roundRect(ctx, 1, 1, W - 2, cardH - 2, 14);
        ctx.stroke();
        clearShadow(ctx);
    } else {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, W - 1, cardH - 1, 14);
        ctx.stroke();
    }

    return canvas.toBuffer("image/png");
}
