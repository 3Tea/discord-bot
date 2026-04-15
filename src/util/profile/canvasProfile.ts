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
    achievementCount?: { unlocked: number; total: number };
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

// --- Internal helpers ---

type Ctx2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

interface TextBlockParams {
    ctx: Ctx2D;
    isGalaxy: boolean;
    contentX: number;
    contentW: number;
    textY: number;
    textAvail: number;
    prayStreak: number;
    questStreak: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    achievementCount?: { unlocked: number; total: number };
}

function drawStreakRow(ctx: Ctx2D, streakColor: string, contentX: number, contentW: number, textY: number, prayStreak: number, questStreak: number): void {
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText("PRAY STREAK", contentX, textY + 14);
    shadow(ctx, `${streakColor}88`, 6);
    ctx.fillStyle = streakColor;
    ctx.font = '18px "Inter Bold"';
    ctx.fillText(`${prayStreak}d`, contentX + 100, textY + 14);
    clearShadow(ctx);

    const questX = contentX + contentW / 2;
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText("QUEST STREAK", questX, textY + 14);
    shadow(ctx, `${streakColor}88`, 6);
    ctx.fillStyle = streakColor;
    ctx.font = '18px "Inter Bold"';
    ctx.fillText(`${questStreak}d`, questX + 112, textY + 14);
    clearShadow(ctx);
}

interface ActivityStats {
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

function drawActivityRow(ctx: Ctx2D, actColor: string, contentX: number, contentW: number, actY: number, stats: ActivityStats): void {
    const activities = [
        { label: `${stats.messageCount.toLocaleString()} MSG`, color: actColor },
        { label: `${formatVoice(stats.voiceMinutes)} VOICE`, color: actColor },
        { label: `${stats.reactionCount.toLocaleString()} REACT`, color: actColor },
    ];
    const segW = contentW / activities.length;
    ctx.font = '14px "Inter Bold"';
    for (let i = 0; i < activities.length; i++) {
        const { label, color } = activities[i];
        shadow(ctx, `${color}66`, 4);
        ctx.fillStyle = color;
        ctx.fillText(label, contentX + i * segW, actY);
        clearShadow(ctx);
    }
}

function drawAchievementRow(ctx: Ctx2D, achColor: string, contentX: number, achY: number, unlocked: number, total: number): void {
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText("\uD83C\uDFC6 ACHIEVEMENTS", contentX, achY);
    shadow(ctx, `${achColor}88`, 6);
    ctx.fillStyle = achColor;
    ctx.font = '18px "Inter Bold"';
    ctx.fillText(`${unlocked}/${total}`, contentX + 132, achY);
    clearShadow(ctx);
}

function drawTextBlock(p: TextBlockParams): void {
    if (p.textAvail < 16) return;

    const streakColor = p.isGalaxy ? GALAXY.stat1 : C.gold;
    const actColor = p.isGalaxy ? GALAXY.stat2 : C.pink;
    const achColor = p.isGalaxy ? GALAXY.stat3 : C.purple;

    drawStreakRow(p.ctx, streakColor, p.contentX, p.contentW, p.textY, p.prayStreak, p.questStreak);

    if (p.textAvail < 32) return;

    const ACT_Y = p.textY + 34;

    if (p.achievementCount) {
        drawAchievementRow(p.ctx, achColor, p.contentX, ACT_Y, p.achievementCount.unlocked, p.achievementCount.total);
    } else {
        drawActivityRow(p.ctx, actColor, p.contentX, p.contentW, ACT_Y, {
            messageCount: p.messageCount,
            voiceMinutes: p.voiceMinutes,
            reactionCount: p.reactionCount,
        });
    }
}

interface EconItem { label: string; value: string; color: string }

function buildEconItems(coin: number, gem: number, star: number, isGalaxy: boolean): EconItem[] {
    if (isGalaxy) {
        return [
            { label: "COIN", value: coin.toLocaleString(), color: GALAXY.stat1 },
            { label: "GEM",  value: gem.toLocaleString(),  color: GALAXY.stat2 },
            { label: "STAR", value: star.toLocaleString(), color: GALAXY.stat3 },
        ];
    }
    return [
        { label: "COIN", value: coin.toLocaleString(), color: C.gold   },
        { label: "GEM",  value: gem.toLocaleString(),  color: C.purple },
        { label: "STAR", value: star.toLocaleString(), color: C.pink   },
    ];
}

function drawBackground(ctx: Ctx2D, isGalaxy: boolean): void {
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    drawAnimeBackground(ctx);
    if (isGalaxy) {
        ctx.fillStyle = GALAXY.tint;
        ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    }
    const stripeG = gradientV(ctx, 0, PROFILE_H, 0, [
        [0, isGalaxy ? GALAXY.accentA : C.pink],
        [1, isGalaxy ? GALAXY.accentB : C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, PROFILE_H);
}

function drawCardBorder(ctx: Ctx2D, isGalaxy: boolean): void {
    if (isGalaxy) {
        shadow(ctx, GALAXY.borderGlow, 12);
        ctx.strokeStyle = "rgba(255,215,0,0.25)";
        ctx.lineWidth = 2;
        roundRect(ctx, 1, 1, PROFILE_W - 2, PROFILE_H - 2, 14);
        ctx.stroke();
        clearShadow(ctx);
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
    } else {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, PROFILE_W - 1, PROFILE_H - 1, 14);
        ctx.stroke();
        const bottomLine = gradientH(ctx, 0, PROFILE_W, PROFILE_H - 2, [
            [0, "rgba(255,107,157,0)"],
            [0.3, C.pink],
            [0.7, C.purple],
            [1, "rgba(196,77,255,0)"],
        ]);
        ctx.fillStyle = bottomLine;
        ctx.fillRect(0, PROFILE_H - 2, PROFILE_W, 2);
    }
}

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
        achievementCount,
    } = options;

    const isGalaxy = rankCardTheme === "galaxy";

    const canvas = createCanvas(PROFILE_W, PROFILE_H);
    const ctx = canvas.getContext("2d");

    // --- Clip card to rounded rect ---
    roundRect(ctx, 0, 0, PROFILE_W, PROFILE_H, 14);
    ctx.clip();

    // --- Background + accent stripe ---
    drawBackground(ctx, isGalaxy);

    // --- Layout constants ---
    const PAD = 28;
    const AV_R = 60;
    const AV_CX = PAD + AV_R + 8;
    const AV_CY = PROFILE_H / 2 - 10;
    const CONTENT_X = AV_CX + AV_R + 24;

    const LV_W = 108;
    const LV_H = 96;
    const LV_X = PROFILE_W - PAD - LV_W;
    const LV_Y = PAD;
    const CONTENT_W = LV_X - CONTENT_X - 16;

    const STAT_H = 68;
    const STAT_Y = PROFILE_H - PAD - STAT_H;
    const ECON_GAP = 10;
    const ECON_N = 3;
    const ECON_W = (CONTENT_W - (ECON_N - 1) * ECON_GAP) / ECON_N;

    // --- Avatar + badges ---
    await drawCircularImage(ctx, avatarURL, username[0], AV_CX, AV_CY, AV_R);
    const badgeStartY = AV_CY + AV_R + 10;
    drawRankBadge(ctx, `SERVER  #${serverRank || "—"}`, AV_CX, badgeStartY, [C.pink, C.purple]);
    if (premiumBadge) {
        drawPremiumBadge(ctx, premiumBadge, AV_CX - 33, badgeStartY + 38);
    }

    // --- Level box, name, XP ---
    drawLevelBox(ctx, level, LV_X, LV_Y, LV_W, LV_H);
    const NAME_Y = PAD + 36;
    drawNameBlock(ctx, username, `Joined ${joinDate}`, CONTENT_X, NAME_Y, CONTENT_W);
    drawDivider(ctx, CONTENT_X, NAME_Y + 44, CONTENT_W);
    const XP_Y = NAME_Y + 58;
    drawXPBar(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);

    // --- Economy stat cards ---
    const econItems = buildEconItems(coin, gem, star, isGalaxy);
    for (let i = 0; i < econItems.length; i++) {
        const { label, value, color } = econItems[i];
        drawStatCard(ctx, label, value, CONTENT_X + i * (ECON_W + ECON_GAP), STAT_Y, ECON_W, STAT_H, color);
    }

    // --- Activity & streak text block ---
    const TEXT_Y = XP_Y + 60;
    drawTextBlock({
        ctx, isGalaxy, contentX: CONTENT_X, contentW: CONTENT_W,
        textY: TEXT_Y, textAvail: STAT_Y - TEXT_Y - 4,
        prayStreak, questStreak, messageCount, voiceMinutes, reactionCount,
        achievementCount,
    });

    // --- Outer card border ---
    drawCardBorder(ctx, isGalaxy);

    return canvas.toBuffer("image/png");
}
