"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProfileCard = renderProfileCard;
const canvas_1 = require("@napi-rs/canvas");
const canvasHelpers_1 = require("../xp/canvasHelpers");
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
};
// Canvas dimensions for profile card
const PROFILE_W = 934;
const PROFILE_H = 282;
function drawStreakRow(ctx, streakColor, contentX, contentW, textY, prayStreak, questStreak) {
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = canvasHelpers_1.C.muted;
    ctx.fillText("PRAY STREAK", contentX, textY + 14);
    (0, canvasHelpers_1.shadow)(ctx, `${streakColor}88`, 6);
    ctx.fillStyle = streakColor;
    ctx.font = '18px "Inter Bold"';
    ctx.fillText(`${prayStreak}d`, contentX + 100, textY + 14);
    (0, canvasHelpers_1.clearShadow)(ctx);
    const questX = contentX + contentW / 2;
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = canvasHelpers_1.C.muted;
    ctx.fillText("QUEST STREAK", questX, textY + 14);
    (0, canvasHelpers_1.shadow)(ctx, `${streakColor}88`, 6);
    ctx.fillStyle = streakColor;
    ctx.font = '18px "Inter Bold"';
    ctx.fillText(`${questStreak}d`, questX + 112, textY + 14);
    (0, canvasHelpers_1.clearShadow)(ctx);
}
function drawActivityRow(p) {
    const items = [
        { label: `${p.stats.messageCount.toLocaleString()} MSG`, color: p.actColor },
        { label: `${(0, canvasHelpers_1.formatVoice)(p.stats.voiceMinutes)} VOICE`, color: p.actColor },
        { label: `${p.stats.reactionCount.toLocaleString()} REACT`, color: p.actColor },
    ];
    if (p.achievementCount) {
        items.push({
            label: `\uD83C\uDFC6 ${p.achievementCount.unlocked}/${p.achievementCount.total}`,
            color: p.achColor,
        });
    }
    const segW = p.contentW / items.length;
    p.ctx.font = '14px "Inter Bold"';
    for (let i = 0; i < items.length; i++) {
        const { label, color } = items[i];
        (0, canvasHelpers_1.shadow)(p.ctx, `${color}66`, 4);
        p.ctx.fillStyle = color;
        p.ctx.fillText(label, p.contentX + i * segW, p.actY);
        (0, canvasHelpers_1.clearShadow)(p.ctx);
    }
}
function drawTextBlock(p) {
    if (p.textAvail < 16)
        return;
    const streakColor = p.isGalaxy ? GALAXY.stat1 : canvasHelpers_1.C.gold;
    const actColor = p.isGalaxy ? GALAXY.stat2 : canvasHelpers_1.C.pink;
    const achColor = p.isGalaxy ? GALAXY.stat3 : canvasHelpers_1.C.purple;
    drawStreakRow(p.ctx, streakColor, p.contentX, p.contentW, p.textY, p.prayStreak, p.questStreak);
    if (p.textAvail < 32)
        return;
    const ACT_Y = p.textY + 34;
    drawActivityRow({
        ctx: p.ctx,
        actColor,
        achColor,
        contentX: p.contentX,
        contentW: p.contentW,
        actY: ACT_Y,
        stats: { messageCount: p.messageCount, voiceMinutes: p.voiceMinutes, reactionCount: p.reactionCount },
        achievementCount: p.achievementCount,
    });
}
function buildEconItems(coin, gem, star, isGalaxy) {
    if (isGalaxy) {
        return [
            { label: "COIN", value: coin.toLocaleString(), color: GALAXY.stat1 },
            { label: "GEM", value: gem.toLocaleString(), color: GALAXY.stat2 },
            { label: "STAR", value: star.toLocaleString(), color: GALAXY.stat3 },
        ];
    }
    return [
        { label: "COIN", value: coin.toLocaleString(), color: canvasHelpers_1.C.gold },
        { label: "GEM", value: gem.toLocaleString(), color: canvasHelpers_1.C.purple },
        { label: "STAR", value: star.toLocaleString(), color: canvasHelpers_1.C.pink },
    ];
}
function drawBackground(ctx, isGalaxy) {
    ctx.fillStyle = canvasHelpers_1.C.bgDeep;
    ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    (0, canvasHelpers_1.drawAnimeBackground)(ctx);
    if (isGalaxy) {
        ctx.fillStyle = GALAXY.tint;
        ctx.fillRect(0, 0, PROFILE_W, PROFILE_H);
    }
    const stripeG = (0, canvasHelpers_1.gradientV)(ctx, 0, PROFILE_H, 0, [
        [0, isGalaxy ? GALAXY.accentA : canvasHelpers_1.C.pink],
        [1, isGalaxy ? GALAXY.accentB : canvasHelpers_1.C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, PROFILE_H);
}
function drawCardBorder(ctx, isGalaxy) {
    if (isGalaxy) {
        (0, canvasHelpers_1.shadow)(ctx, GALAXY.borderGlow, 12);
        ctx.strokeStyle = "rgba(255,215,0,0.25)";
        ctx.lineWidth = 2;
        (0, canvasHelpers_1.roundRect)(ctx, 1, 1, PROFILE_W - 2, PROFILE_H - 2, 14);
        ctx.stroke();
        (0, canvasHelpers_1.clearShadow)(ctx);
        const cornerGlow = (cx, cy) => {
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
    else {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        (0, canvasHelpers_1.roundRect)(ctx, 0.5, 0.5, PROFILE_W - 1, PROFILE_H - 1, 14);
        ctx.stroke();
        const bottomLine = (0, canvasHelpers_1.gradientH)(ctx, 0, PROFILE_W, PROFILE_H - 2, [
            [0, "rgba(255,107,157,0)"],
            [0.3, canvasHelpers_1.C.pink],
            [0.7, canvasHelpers_1.C.purple],
            [1, "rgba(196,77,255,0)"],
        ]);
        ctx.fillStyle = bottomLine;
        ctx.fillRect(0, PROFILE_H - 2, PROFILE_W, 2);
    }
}
async function renderProfileCard(options) {
    const { username, avatarURL, level, xp, xpForNextLevel, percentage, serverRank, coin, gem, star, prayStreak, questStreak, messageCount, voiceMinutes, reactionCount, joinDate, premiumBadge = null, rankCardTheme = "standard", achievementCount, } = options;
    const isGalaxy = rankCardTheme === "galaxy";
    const canvas = (0, canvas_1.createCanvas)(PROFILE_W, PROFILE_H);
    const ctx = canvas.getContext("2d");
    // --- Clip card to rounded rect ---
    (0, canvasHelpers_1.roundRect)(ctx, 0, 0, PROFILE_W, PROFILE_H, 14);
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
    await (0, canvasHelpers_1.drawCircularImage)(ctx, avatarURL, username[0], AV_CX, AV_CY, AV_R);
    const badgeStartY = AV_CY + AV_R + 10;
    (0, canvasHelpers_1.drawRankBadge)(ctx, `SERVER  #${serverRank || "—"}`, AV_CX, badgeStartY, [canvasHelpers_1.C.pink, canvasHelpers_1.C.purple]);
    if (premiumBadge) {
        (0, canvasHelpers_1.drawPremiumBadge)(ctx, premiumBadge, AV_CX - 33, badgeStartY + 38);
    }
    // --- Level box, name, XP ---
    (0, canvasHelpers_1.drawLevelBox)(ctx, level, LV_X, LV_Y, LV_W, LV_H);
    const NAME_Y = PAD + 36;
    (0, canvasHelpers_1.drawNameBlock)(ctx, username, `Joined ${joinDate}`, CONTENT_X, NAME_Y, CONTENT_W);
    (0, canvasHelpers_1.drawDivider)(ctx, CONTENT_X, NAME_Y + 44, CONTENT_W);
    const XP_Y = NAME_Y + 58;
    (0, canvasHelpers_1.drawXPBar)(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);
    // --- Economy stat cards ---
    const econItems = buildEconItems(coin, gem, star, isGalaxy);
    for (let i = 0; i < econItems.length; i++) {
        const { label, value, color } = econItems[i];
        (0, canvasHelpers_1.drawStatCard)(ctx, label, value, CONTENT_X + i * (ECON_W + ECON_GAP), STAT_Y, ECON_W, STAT_H, color);
    }
    // --- Activity & streak text block ---
    const TEXT_Y = XP_Y + 60;
    drawTextBlock({
        ctx,
        isGalaxy,
        contentX: CONTENT_X,
        contentW: CONTENT_W,
        textY: TEXT_Y,
        textAvail: STAT_Y - TEXT_Y - 4,
        prayStreak,
        questStreak,
        messageCount,
        voiceMinutes,
        reactionCount,
        achievementCount,
    });
    // --- Outer card border ---
    drawCardBorder(ctx, isGalaxy);
    return canvas.toBuffer("image/png");
}
