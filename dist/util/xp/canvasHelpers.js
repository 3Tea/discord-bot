"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOUDS = exports.BLOSSOMS = exports.BOKEH = exports.STARS = exports.C = exports.H = exports.W = void 0;
exports.formatVoice = formatVoice;
exports.roundRect = roundRect;
exports.gradientH = gradientH;
exports.gradientV = gradientV;
exports.shadow = shadow;
exports.clearShadow = clearShadow;
exports.clampText = clampText;
exports.drawAnimeBackground = drawAnimeBackground;
exports.drawCircularImage = drawCircularImage;
exports.drawRankBadge = drawRankBadge;
exports.drawNameBlock = drawNameBlock;
exports.drawXPBar = drawXPBar;
exports.drawLevelBox = drawLevelBox;
exports.drawStatCard = drawStatCard;
exports.drawDivider = drawDivider;
exports.drawPremiumBadge = drawPremiumBadge;
const canvas_1 = require("@napi-rs/canvas");
const axios_1 = __importDefault(require("axios"));
const node_path_1 = __importDefault(require("node:path"));
// --- Register fonts ---
const FONTS_DIR = node_path_1.default.join(process.cwd(), "src/assets/fonts");
canvas_1.GlobalFonts.registerFromPath(node_path_1.default.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter Bold");
canvas_1.GlobalFonts.registerFromPath(node_path_1.default.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");
// --- Constants ---
exports.W = 934;
exports.H = 360;
exports.C = {
    bgDeep: "#0a0614",
    bgMid: "#120b22",
    bgTop: "#1a0e2e",
    pink: "#ff6b9d",
    purple: "#c44dff",
    gold: "#ffd700",
    muted: "#7a6899",
    dimmer: "#5a4878",
    panelFill: "rgba(255,255,255,0.04)",
    panelBorder: "rgba(255,255,255,0.07)",
    green: "#3ba55c",
    greenHi: "#57d87a",
};
// --- Pre-defined anime scene elements ---
// Stars: [x, y, radius, alpha]
exports.STARS = [
    [32, 24, 1.8, 0.9],
    [98, 42, 1.0, 0.6],
    [185, 15, 1.4, 0.85],
    [267, 58, 0.8, 0.5],
    [340, 28, 1.6, 0.88],
    [410, 66, 1.0, 0.55],
    [478, 12, 1.2, 0.78],
    [552, 48, 0.9, 0.5],
    [615, 22, 1.5, 0.85],
    [688, 55, 1.1, 0.6],
    [755, 18, 1.3, 0.8],
    [830, 40, 1.0, 0.65],
    [895, 30, 1.7, 0.9],
    [60, 90, 0.9, 0.45],
    [145, 105, 1.2, 0.7],
    [228, 85, 0.7, 0.4],
    [315, 100, 1.4, 0.75],
    [395, 88, 1.0, 0.55],
    [502, 110, 0.8, 0.42],
    [580, 95, 1.3, 0.7],
    [665, 78, 1.1, 0.62],
    [742, 105, 0.9, 0.48],
    [820, 88, 1.5, 0.82],
    [905, 70, 1.0, 0.52],
    [48, 145, 0.8, 0.35],
    [135, 160, 1.1, 0.58],
    [290, 140, 0.7, 0.32],
    [440, 155, 1.0, 0.5],
    [570, 135, 0.9, 0.42],
    [710, 158, 1.2, 0.6],
    [850, 142, 0.8, 0.38],
    [200, 32, 2.0, 0.95],
    [530, 52, 1.8, 0.88],
    [770, 38, 1.6, 0.82],
    [380, 125, 0.6, 0.3],
    [650, 115, 0.7, 0.35],
    [75, 68, 1.3, 0.72],
    [460, 40, 0.8, 0.45],
    [810, 110, 1.0, 0.55],
    [920, 52, 0.7, 0.4],
];
// Bokeh particles: [x, y, radius, alpha]
exports.BOKEH = [
    [120, 200, 10, 0.06],
    [350, 145, 14, 0.04],
    [580, 250, 8, 0.07],
    [780, 175, 12, 0.05],
    [250, 300, 9, 0.05],
    [650, 95, 11, 0.04],
    [450, 280, 13, 0.06],
    [870, 220, 9, 0.05],
    [50, 270, 7, 0.04],
    [700, 315, 12, 0.05],
    [180, 125, 8, 0.06],
    [520, 195, 15, 0.03],
];
// Cherry blossom petals: [x, y, rx, ry, rotation, alpha, colorIdx 0=pink 1=purple]
exports.BLOSSOMS = [
    [855, 38, 6, 14, 0.44, 0.2, 0],
    [800, 72, 5, 11, -0.26, 0.15, 1],
    [890, 110, 5, 12, 0.7, 0.14, 0],
    [825, 250, 6, 13, -0.52, 0.16, 1],
    [875, 218, 4, 10, 0.35, 0.12, 0],
    [55, 268, 5, 11, 0.17, 0.12, 1],
    [22, 202, 4, 9, -0.35, 0.11, 0],
    [760, 290, 5, 11, 1.2, 0.13, 0],
    [910, 280, 4, 9, 0.9, 0.11, 1],
    [730, 55, 4, 10, 0.6, 0.1, 0],
    [680, 300, 5, 12, -0.4, 0.14, 1],
    [150, 320, 4, 9, 0.25, 0.1, 0],
    [420, 30, 3, 8, -0.15, 0.08, 1],
    [300, 335, 5, 11, 0.8, 0.12, 0],
];
// Anime cloud clusters: [cx, cy, scaleX, scaleY, alpha]
exports.CLOUDS = [
    [620, 75, 1.2, 0.8, 0.06],
    [180, 110, 0.9, 0.7, 0.05],
    [830, 130, 0.7, 0.6, 0.04],
    [400, 55, 1.0, 0.7, 0.05],
    [750, 95, 0.8, 0.65, 0.04],
];
// --- Helpers ---
function formatVoice(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function gradientH(ctx, x, w, y, stops) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    for (const [pos, col] of stops)
        g.addColorStop(pos, col);
    return g;
}
function gradientV(ctx, y, h, x, stops) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    for (const [pos, col] of stops)
        g.addColorStop(pos, col);
    return g;
}
function shadow(ctx, color, blur, ox = 0, oy = 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = ox;
    ctx.shadowOffsetY = oy;
}
function clearShadow(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}
function clampText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth)
        return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "..").width > maxWidth)
        t = t.slice(0, -1);
    return t + "..";
}
// --- Anime background sub-renderers ---
function drawAnimeSky(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, exports.H);
    sky.addColorStop(0, "#050210");
    sky.addColorStop(0.25, "#0d0828");
    sky.addColorStop(0.45, "#1a0e3a");
    sky.addColorStop(0.65, "#2d1254");
    sky.addColorStop(0.82, "#4a1a5e");
    sky.addColorStop(0.92, "#7a2858");
    sky.addColorStop(1, "#c44068");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, exports.W, exports.H);
    // Warm horizon glow
    const glow = ctx.createRadialGradient(exports.W * 0.45, exports.H + 30, 10, exports.W * 0.45, exports.H + 30, 300);
    glow.addColorStop(0, "rgba(255,140,100,0.25)");
    glow.addColorStop(0.5, "rgba(255,100,140,0.1)");
    glow.addColorStop(1, "rgba(255,80,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, exports.W, exports.H);
}
function drawNebula(ctx) {
    const blobs = [
        [200, 80, 180, "rgba(196,77,255,0.06)"],
        [700, 120, 220, "rgba(255,107,157,0.05)"],
        [450, 200, 260, "rgba(140,60,220,0.04)"],
        [850, 60, 150, "rgba(100,140,255,0.04)"],
    ];
    for (const [cx, cy, r, color] of blobs) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, exports.W, exports.H);
    }
}
function drawStarField(ctx) {
    for (const [x, y, r, a] of exports.STARS) {
        ctx.save();
        ctx.globalAlpha = a;
        // Soft glow halo
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        glow.addColorStop(0, "rgba(255,255,255,0.3)");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
        // Bright core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
function drawCrescentMoon(ctx) {
    const mx = 780, my = 52, mr = 28;
    // Layered glow rings
    const glowLayers = [
        [60, 0.08],
        [40, 0.12],
        [25, 0.18],
    ];
    for (const [spread, alpha] of glowLayers) {
        const g = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr + spread);
        g.addColorStop(0, `rgba(255,230,200,${alpha})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(mx - mr - spread, my - mr - spread, (mr + spread) * 2, (mr + spread) * 2);
    }
    // Moon body
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.clip();
    const moonG = ctx.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr);
    moonG.addColorStop(0, "#fff8e8");
    moonG.addColorStop(0.5, "#ffe8c8");
    moonG.addColorStop(1, "#ffd8a8");
    ctx.fillStyle = moonG;
    ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    // Crescent shadow
    ctx.fillStyle = "#050210";
    ctx.beginPath();
    ctx.arc(mx + 14, my - 6, mr * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawAnimeCloud(ctx, cx, cy, sx, sy, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const parts = [
        [0, 0, 50, 25],
        [-35, -5, 35, 22],
        [30, -8, 40, 20],
        [-15, -15, 30, 18],
        [15, -12, 35, 20],
        [45, 5, 25, 18],
        [-50, 5, 28, 16],
    ];
    for (const [px, py, rx, ry] of parts) {
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
function drawMountainLayer(ctx, peaks, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, exports.H);
    for (let i = 0; i < peaks.length; i++) {
        const [px, py] = peaks[i];
        if (i === 0) {
            ctx.lineTo(px, py);
        }
        else {
            const prev = peaks[i - 1];
            const cpx = (prev[0] + px) / 2;
            const cpy = Math.min(prev[1], py) - 15;
            ctx.quadraticCurveTo(cpx, cpy, px, py);
        }
    }
    ctx.lineTo(exports.W, exports.H);
    ctx.closePath();
    ctx.fill();
}
function drawMountains(ctx) {
    // Far — lighter, atmospheric purple
    drawMountainLayer(ctx, [
        [0, exports.H - 65],
        [80, exports.H - 95],
        [180, exports.H - 120],
        [280, exports.H - 100],
        [380, exports.H - 135],
        [480, exports.H - 110],
        [580, exports.H - 140],
        [680, exports.H - 115],
        [780, exports.H - 130],
        [880, exports.H - 105],
        [exports.W, exports.H - 80],
    ], "rgba(30,15,55,0.7)");
    // Mid — darker
    drawMountainLayer(ctx, [
        [0, exports.H - 40],
        [100, exports.H - 72],
        [200, exports.H - 90],
        [320, exports.H - 65],
        [420, exports.H - 95],
        [540, exports.H - 75],
        [650, exports.H - 100],
        [760, exports.H - 80],
        [870, exports.H - 90],
        [exports.W, exports.H - 55],
    ], "rgba(18,8,35,0.8)");
    // Near — darkest silhouette
    drawMountainLayer(ctx, [
        [0, exports.H - 20],
        [120, exports.H - 50],
        [250, exports.H - 38],
        [370, exports.H - 55],
        [500, exports.H - 42],
        [620, exports.H - 60],
        [750, exports.H - 45],
        [880, exports.H - 55],
        [exports.W, exports.H - 30],
    ], "rgba(8,4,18,0.85)");
}
function drawTorii(ctx) {
    // Small torii gate silhouette on the tallest far mountain peak
    const tx = 580, ty = exports.H - 148;
    ctx.fillStyle = "rgba(15,6,30,0.8)";
    // Pillars
    ctx.fillRect(tx - 9, ty, 3, 20);
    ctx.fillRect(tx + 6, ty, 3, 20);
    // Top beam (wider, with slight upward curve at ends)
    ctx.beginPath();
    ctx.moveTo(tx - 16, ty + 1);
    ctx.quadraticCurveTo(tx, ty - 3, tx + 16, ty + 1);
    ctx.lineTo(tx + 16, ty + 4);
    ctx.quadraticCurveTo(tx, ty, tx - 16, ty + 4);
    ctx.closePath();
    ctx.fill();
    // Middle beam
    ctx.fillRect(tx - 9, ty + 8, 18, 2);
}
function drawSceneBlossoms(ctx) {
    const colors = [exports.C.pink, exports.C.purple];
    for (const [x, y, rx, ry, rot, a, ci] of exports.BLOSSOMS) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = colors[ci];
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
function drawBokehParticles(ctx) {
    for (const [x, y, r, a] of exports.BOKEH) {
        ctx.save();
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255,200,240,0.8)");
        g.addColorStop(0.5, "rgba(255,150,220,0.3)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
function drawReadabilityOverlay(ctx) {
    // Left-to-right darkening so text stays legible
    const overlay = ctx.createLinearGradient(0, 0, exports.W, 0);
    overlay.addColorStop(0, "rgba(5,2,16,0.75)");
    overlay.addColorStop(0.15, "rgba(8,4,20,0.65)");
    overlay.addColorStop(0.45, "rgba(12,6,28,0.5)");
    overlay.addColorStop(0.75, "rgba(15,8,32,0.35)");
    overlay.addColorStop(1, "rgba(20,10,40,0.25)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, exports.W, exports.H);
    // Bottom darkening for stat card area
    const bottom = ctx.createLinearGradient(0, exports.H - 120, 0, exports.H);
    bottom.addColorStop(0, "transparent");
    bottom.addColorStop(1, "rgba(5,2,16,0.4)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, exports.H - 120, exports.W, 120);
}
function drawAnimeBackground(ctx) {
    drawAnimeSky(ctx);
    drawNebula(ctx);
    drawStarField(ctx);
    drawCrescentMoon(ctx);
    for (const [cx, cy, sx, sy, a] of exports.CLOUDS)
        drawAnimeCloud(ctx, cx, cy, sx, sy, a);
    drawMountains(ctx);
    drawTorii(ctx);
    drawSceneBlossoms(ctx);
    drawBokehParticles(ctx);
    drawReadabilityOverlay(ctx);
}
// --- UI sub-renderers ---
function drawCircularFallback(ctx, cx, cy, r, fallbackChar) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, exports.C.pink);
    g.addColorStop(1, exports.C.purple);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(r * 0.65)}px "Inter Bold"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackChar.toUpperCase(), cx, cy);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}
async function drawCircularImage(ctx, imageURL, fallbackChar, cx, cy, radius) {
    const r = radius;
    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r + 20);
    glow.addColorStop(0, "rgba(255,107,157,0.12)");
    glow.addColorStop(1, "rgba(255,107,157,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
    ctx.fill();
    // Gradient ring
    shadow(ctx, "rgba(196,77,255,0.45)", 18);
    ctx.strokeStyle = gradientH(ctx, cx - r, r * 2, cy, [
        [0, exports.C.pink],
        [1, exports.C.purple],
    ]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    clearShadow(ctx);
    // Clip & draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (imageURL) {
        try {
            const { data } = await axios_1.default.get(imageURL, { responseType: "arraybuffer" });
            const img = await (0, canvas_1.loadImage)(Buffer.from(data));
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        }
        catch {
            drawCircularFallback(ctx, cx, cy, r, fallbackChar);
        }
    }
    else {
        drawCircularFallback(ctx, cx, cy, r, fallbackChar);
    }
    ctx.restore();
}
function drawRankBadge(ctx, label, cx, topY, colors) {
    ctx.font = '16px "Inter Bold"';
    const tw = ctx.measureText(label).width;
    const bw = tw + 28;
    const bh = 30;
    const bx = cx - bw / 2;
    // Badge bg
    ctx.fillStyle = "rgba(10,6,20,0.75)";
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.fill();
    // Gradient border
    ctx.strokeStyle = gradientH(ctx, bx, bw, topY, [
        [0, colors[0]],
        [1, colors[1]],
    ]);
    ctx.lineWidth = 1.2;
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.stroke();
    // Text
    shadow(ctx, `${colors[0]}88`, 6);
    ctx.fillStyle = colors[0];
    ctx.textAlign = "center";
    ctx.fillText(label, cx, topY + 21);
    ctx.textAlign = "left";
    clearShadow(ctx);
    return bh;
}
function drawNameBlock(ctx, username, subtitle, x, y, maxW) {
    // Username
    ctx.font = '44px "Inter Bold"';
    const name = clampText(ctx, username, maxW);
    shadow(ctx, "rgba(255,107,157,0.35)", 12);
    ctx.fillStyle = gradientH(ctx, x, maxW, y, [
        [0, exports.C.pink],
        [1, exports.C.purple],
    ]);
    ctx.fillText(name, x, y);
    clearShadow(ctx);
    // Subtitle
    ctx.font = '18px "Inter"';
    ctx.fillStyle = exports.C.muted;
    ctx.fillText(subtitle, x, y + 26);
    // Thin accent underline
    const nameW = ctx.measureText(name).width;
    const lineGrad = gradientH(ctx, x, nameW, y + 32, [
        [0, exports.C.pink],
        [0.7, exports.C.purple],
        [1, "rgba(196,77,255,0)"],
    ]);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(x, y + 32, nameW, 2);
}
function drawXPBar(ctx, xp, xpForNextLevel, percentage, x, y, barW) {
    const barH = 24;
    const r = barH / 2;
    // Label row
    ctx.font = '16px "Inter Bold"';
    ctx.fillStyle = exports.C.muted;
    ctx.fillText("EXPERIENCE", x, y);
    ctx.textAlign = "right";
    shadow(ctx, "rgba(255,107,157,0.5)", 6);
    ctx.fillStyle = exports.C.pink;
    ctx.fillText(`${percentage}%`, x + barW, y);
    clearShadow(ctx);
    ctx.textAlign = "left";
    const barY = y + 8;
    // Track
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, barY, barW, barH, r);
    ctx.fill();
    ctx.stroke();
    // Fill
    if (percentage > 0) {
        const fillW = Math.max(r * 2, (percentage / 100) * barW);
        ctx.save();
        roundRect(ctx, x, barY, barW, barH, r);
        ctx.clip();
        shadow(ctx, "rgba(255,107,157,0.55)", 10);
        ctx.fillStyle = gradientH(ctx, x, barW, barY, [
            [0, exports.C.pink],
            [1, exports.C.purple],
        ]);
        ctx.fillRect(x, barY, fillW, barH);
        // Shimmer highlight
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(x + fillW - 32, barY + 4, 24, barH - 8);
        clearShadow(ctx);
        ctx.restore();
        // Glow tip
        const tipX = x + fillW;
        const gTip = ctx.createRadialGradient(tipX, barY + r, 0, tipX, barY + r, 16);
        gTip.addColorStop(0, "rgba(255,107,157,0.45)");
        gTip.addColorStop(1, "rgba(255,107,157,0)");
        ctx.fillStyle = gTip;
        ctx.fillRect(tipX - 16, barY - 6, 32, barH + 12);
    }
    // XP sub labels
    const subY = barY + barH + 16;
    ctx.font = '15px "Inter"';
    ctx.fillStyle = exports.C.dimmer;
    ctx.fillText(`${xp.toLocaleString()} XP`, x, subY);
    ctx.textAlign = "right";
    ctx.fillText(`${xpForNextLevel.toLocaleString()} XP`, x + barW, subY);
    ctx.textAlign = "left";
}
function drawLevelBox(ctx, level, x, y, w, h) {
    // Panel
    ctx.fillStyle = exports.C.panelFill;
    ctx.strokeStyle = exports.C.panelBorder;
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    // "LEVEL" label
    ctx.font = '15px "Inter Bold"';
    ctx.fillStyle = exports.C.muted;
    ctx.textAlign = "center";
    ctx.fillText("LEVEL", x + w / 2, y + 24);
    // Number
    ctx.font = `56px "Inter Bold"`;
    shadow(ctx, "rgba(255,107,157,0.4)", 16);
    ctx.fillStyle = gradientV(ctx, y + 28, 54, x + w / 2, [
        [0, exports.C.pink],
        [1, exports.C.purple],
    ]);
    ctx.fillText(String(level), x + w / 2, y + 76);
    clearShadow(ctx);
    ctx.textAlign = "left";
}
function drawStatCard(ctx, label, value, x, y, w, h, accentColor) {
    // Panel bg
    ctx.fillStyle = exports.C.panelFill;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    // Outer panel border
    ctx.strokeStyle = `${accentColor}22`;
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();
    // Left accent bar
    const barGrad = gradientV(ctx, y, h, x, [
        [0, accentColor + "cc"],
        [1, accentColor + "44"],
    ]);
    ctx.fillStyle = barGrad;
    roundRect(ctx, x, y, 4, h, 2);
    ctx.fill();
    // Label
    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = exports.C.muted;
    ctx.fillText(label, x + 14, y + 22);
    // Value
    ctx.font = '28px "Inter Bold"';
    shadow(ctx, "rgba(255,255,255,0.15)", 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(value, x + 14, y + 54);
    clearShadow(ctx);
}
function drawDivider(ctx, x, y, w) {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
}
function drawPremiumBadge(ctx, badge, x, y) {
    if (!badge)
        return;
    const label = badge === "galaxy" ? "🌌 GALAXY" : "⭐ STAR";
    const colors = badge === "galaxy" ? ["#9b59b6", "#6a0dad"] : ["#f39c12", "#e67e22"];
    ctx.font = '12px "Inter Bold"';
    const tw = ctx.measureText(label).width;
    const bw = tw + 16;
    const bh = 22;
    const grad = ctx.createLinearGradient(x, y, x + bw, y);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    roundRect(ctx, x, y, bw, bh, 6);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + bw / 2, y + bh / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}
