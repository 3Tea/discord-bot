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
    gradientH,
    gradientV,
    roundRect,
    shadow,
} from "../xp/canvasHelpers";

// --- Public API ---

export interface ProfileCanvasOptions {
    username: string;
    avatarURL: string | null;
    level: number;
    xp: number;
    xpForNextLevel: number;
    percentage: number;
    serverRank: number;
    coin: number;
    gem: number;
    star: number;
    prayStreak: number;
    questStreak: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    joinDate: string;
    premiumBadge: string | null;
    rankCardTheme?: string;
}

// --- Galaxy theme accent colors (mirrors canvasRankCard.ts) ---
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

// Canvas dimensions for profile card
const PROFILE_W = 934;
const PROFILE_H = 282;

export async function renderProfileCard(options: ProfileCanvasOptions): Promise<Buffer> {
    const {
        username,
        avatarURL,
        level,
        xp,
        xpForNextLevel,
        percentage,
        serverRank,
        coin,
        gem,
        star,
        prayStreak,
        questStreak,
        messageCount,
        voiceMinutes,
        reactionCount,
        joinDate,
        premiumBadge = null,
        rankCardTheme = "standard",
    } = options;

    const isGalaxy = rankCardTheme === "galaxy";

    const canvas = createCanvas(PROFILE_W, PROFILE_H);
    const ctx = canvas.getContext("2d");

    // --- Clip card to rounded rect ---
    roundRect(ctx, 0, 0, PROFILE_W, PROFILE_H, 14);
    ctx.clip();

    // --- Background ---
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    drawAnimeBackground(ctx);

    // Galaxy theme: subtle gold tint overlay
    if (isGalaxy) {
        ctx.fillStyle = GALAXY.tint;
        ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    }

    // Left accent stripe
    const stripeG = gradientV(ctx, 0, PROFILE_H, 0, [
        [0, isGalaxy ? GALAXY.accentA : C.pink],
        [1, isGalaxy ? GALAXY.accentB : C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, PROFILE_H);

    // --- Layout constants ---
    const PAD = 28;
    const AV_R = 60; // avatar radius — slightly smaller to fit 282px height
    const AV_CX = PAD + AV_R + 8;
    const AV_CY = PROFILE_H / 2 - 10;
    const CONTENT_X = AV_CX + AV_R + 24;

    const LV_W = 108;
    const LV_H = 96;
    const LV_X = PROFILE_W - PAD - LV_W;
    const LV_Y = PAD;

    const CONTENT_W = LV_X - CONTENT_X - 16;

    // Bottom stat row layout
    const STAT_H = 68;
    const STAT_Y = PROFILE_H - PAD - STAT_H;

    // Three economy stat cards: coin, gem, star
    const ECON_N = 3;
    const ECON_GAP = 10;
    const ECON_W = (CONTENT_W - (ECON_N - 1) * ECON_GAP) / ECON_N;

    // --- Avatar ---
    await drawCircularImage(ctx, avatarURL, username[0], AV_CX, AV_CY, AV_R);

    // Rank badge below avatar
    const badgeStartY = AV_CY + AV_R + 10;
    const serverLabel = `SERVER  #${serverRank || "—"}`;
    drawRankBadge(ctx, serverLabel, AV_CX, badgeStartY, [C.pink, C.purple]);

    // Premium badge below rank badge
    if (premiumBadge) {
        drawPremiumBadge(ctx, premiumBadge, AV_CX - 33, badgeStartY + 30 + 8);
    }

    // --- Level box (top right) ---
    drawLevelBox(ctx, level, LV_X, LV_Y, LV_W, LV_H);

    // --- Name block ---
    const NAME_Y = PAD + 36;
    // Subtitle shows join date
    drawNameBlock(ctx, username, `Joined ${joinDate}`, CONTENT_X, NAME_Y, CONTENT_W);

    // --- Divider between name and XP ---
    drawDivider(ctx, CONTENT_X, NAME_Y + 44, CONTENT_W);

    // --- XP bar ---
    const XP_Y = NAME_Y + 58;
    drawXPBar(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);

    // --- Economy stat cards (coin, gem, star) ---
    const econItems: { label: string; value: string; color: string }[] = isGalaxy
        ? [
              { label: "COIN", value: coin.toLocaleString(), color: GALAXY.stat1 },
              { label: "GEM", value: gem.toLocaleString(), color: GALAXY.stat2 },
              { label: "STAR", value: star.toLocaleString(), color: GALAXY.stat3 },
          ]
        : [
              { label: "COIN", value: coin.toLocaleString(), color: C.gold },
              { label: "GEM", value: gem.toLocaleString(), color: C.purple },
              { label: "STAR", value: star.toLocaleString(), color: C.pink },
          ];

    for (let i = 0; i < econItems.length; i++) {
        const { label, value, color } = econItems[i];
        const sx = CONTENT_X + i * (ECON_W + ECON_GAP);
        drawStatCard(ctx, label, value, sx, STAT_Y, ECON_W, STAT_H, color);
    }

    // --- Activity & streak text block (right of avatar, below XP bar) ---
    // Placed in the remaining vertical space between XP bar sub-labels and stat cards
    const TEXT_Y = XP_Y + 60; // below XP sub-labels
    const TEXT_AVAIL = STAT_Y - TEXT_Y - 4;
    if (TEXT_AVAIL >= 16) {
        ctx.font = '14px "Inter Bold"';
        ctx.fillStyle = C.muted;

        const streakColor = isGalaxy ? GALAXY.stat1 : C.gold;
        const actColor = isGalaxy ? GALAXY.stat2 : C.pink;

        // Pray streak
        ctx.fillText("PRAY STREAK", CONTENT_X, TEXT_Y + 14);
        shadow(ctx, `${streakColor}88`, 6);
        ctx.fillStyle = streakColor;
        ctx.font = '18px "Inter Bold"';
        ctx.fillText(`${prayStreak}d`, CONTENT_X + 100, TEXT_Y + 14);
        clearShadow(ctx);

        // Quest streak (offset to the right)
        const QUEST_X = CONTENT_X + CONTENT_W / 2;
        ctx.font = '14px "Inter Bold"';
        ctx.fillStyle = C.muted;
        ctx.fillText("QUEST STREAK", QUEST_X, TEXT_Y + 14);
        shadow(ctx, `${streakColor}88`, 6);
        ctx.fillStyle = streakColor;
        ctx.font = '18px "Inter Bold"';
        ctx.fillText(`${questStreak}d`, QUEST_X + 112, TEXT_Y + 14);
        clearShadow(ctx);

        // Activity row: messages, voice, reactions
        if (TEXT_AVAIL >= 32) {
            const ACT_Y = TEXT_Y + 34;
            const activities = [
                { label: `${messageCount.toLocaleString()} MSG`, color: actColor },
                { label: `${formatVoice(voiceMinutes)} VOICE`, color: actColor },
                { label: `${reactionCount.toLocaleString()} REACT`, color: actColor },
            ];

            const actSegW = CONTENT_W / activities.length;
            ctx.font = '14px "Inter Bold"';
            for (let i = 0; i < activities.length; i++) {
                const { label, color } = activities[i];
                const ax = CONTENT_X + i * actSegW;
                shadow(ctx, `${color}66`, 4);
                ctx.fillStyle = color;
                ctx.fillText(label, ax, ACT_Y);
                clearShadow(ctx);
            }
        }
    }

    // --- Outer card border ---
    if (isGalaxy) {
        // Galaxy: golden glow border
        shadow(ctx, GALAXY.borderGlow, 12);
        ctx.strokeStyle = "rgba(255,215,0,0.25)";
        ctx.lineWidth = 2;
        roundRect(ctx, 1, 1, PROFILE_W - 2, PROFILE_H - 2, 14);
        ctx.stroke();
        clearShadow(ctx);
    } else {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, PROFILE_W - 1, PROFILE_H - 1, 14);
        ctx.stroke();
    }

    // Galaxy: extra corner glow accents
    if (isGalaxy) {
        const cornerGlow = (cx: number, cy: number): void => {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
            g.addColorStop(0, "rgba(255,215,0,0.08)");
            g.addColorStop(1, "rgba(255,215,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(cx - 40, cy - 40, 80, 80);
        };
        cornerGlow(0, 0);
        cornerGlow(PROFILE_W, 0);
        cornerGlow(0, PROFILE_H);
        cornerGlow(PROFILE_W, PROFILE_H);
    }

    // --- Themed accent underline for bottom border (non-Galaxy) ---
    if (!isGalaxy) {
        const bottomLine = gradientH(ctx, 0, PROFILE_W, PROFILE_H - 2, [
            [0, "rgba(255,107,157,0)"],
            [0.3, C.pink],
            [0.7, C.purple],
            [1, "rgba(196,77,255,0)"],
        ]);
        ctx.fillStyle = bottomLine;
        ctx.fillRect(0, PROFILE_H - 2, PROFILE_W, 2);
    }

    return canvas.toBuffer("image/png");
}
