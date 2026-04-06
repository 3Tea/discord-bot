import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import path from "node:path";

// --- Register fonts ---
const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter Bold");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");

// --- Canvas type alias ---
type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

// --- Constants ---
const W = 934;
const H = 360;

const C = {
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
} as const;

// --- Pre-defined anime scene elements ---

// Stars: [x, y, radius, alpha]
const STARS: readonly [number, number, number, number][] = [
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
const BOKEH: readonly [number, number, number, number][] = [
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
const BLOSSOMS: readonly [number, number, number, number, number, number, number][] = [
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
const CLOUDS: readonly [number, number, number, number, number][] = [
    [620, 75, 1.2, 0.8, 0.06],
    [180, 110, 0.9, 0.7, 0.05],
    [830, 130, 0.7, 0.6, 0.04],
    [400, 55, 1.0, 0.7, 0.05],
    [750, 95, 0.8, 0.65, 0.04],
];

// --- Helpers ---

type Ctx2D = Ctx;

function formatVoice(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
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

function gradientH(ctx: Ctx2D, x: number, w: number, y: number, stops: [number, string][]) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    return g;
}

function gradientV(ctx: Ctx2D, y: number, h: number, x: number, stops: [number, string][]) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    return g;
}

function shadow(ctx: Ctx2D, color: string, blur: number, ox = 0, oy = 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = ox;
    ctx.shadowOffsetY = oy;
}

function clearShadow(ctx: Ctx2D) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function clampText(ctx: Ctx2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "..").width > maxWidth) t = t.slice(0, -1);
    return t + "..";
}

// --- Anime background sub-renderers ---

function drawAnimeSky(ctx: Ctx2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#050210");
    sky.addColorStop(0.25, "#0d0828");
    sky.addColorStop(0.45, "#1a0e3a");
    sky.addColorStop(0.65, "#2d1254");
    sky.addColorStop(0.82, "#4a1a5e");
    sky.addColorStop(0.92, "#7a2858");
    sky.addColorStop(1, "#c44068");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Warm horizon glow
    const glow = ctx.createRadialGradient(W * 0.45, H + 30, 10, W * 0.45, H + 30, 300);
    glow.addColorStop(0, "rgba(255,140,100,0.25)");
    glow.addColorStop(0.5, "rgba(255,100,140,0.1)");
    glow.addColorStop(1, "rgba(255,80,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
}

function drawNebula(ctx: Ctx2D): void {
    const blobs: [number, number, number, string][] = [
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
        ctx.fillRect(0, 0, W, H);
    }
}

function drawStarField(ctx: Ctx2D): void {
    for (const [x, y, r, a] of STARS) {
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

function drawCrescentMoon(ctx: Ctx2D): void {
    const mx = 780,
        my = 52,
        mr = 28;

    // Layered glow rings
    const glowLayers: [number, number][] = [
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

function drawAnimeCloud(ctx: Ctx2D, cx: number, cy: number, sx: number, sy: number, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);

    const parts: [number, number, number, number][] = [
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

function drawMountainLayer(ctx: Ctx2D, peaks: [number, number][], color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);

    for (let i = 0; i < peaks.length; i++) {
        const [px, py] = peaks[i];
        if (i === 0) {
            ctx.lineTo(px, py);
        } else {
            const prev = peaks[i - 1];
            const cpx = (prev[0] + px) / 2;
            const cpy = Math.min(prev[1], py) - 15;
            ctx.quadraticCurveTo(cpx, cpy, px, py);
        }
    }

    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
}

function drawMountains(ctx: Ctx2D): void {
    // Far — lighter, atmospheric purple
    drawMountainLayer(
        ctx,
        [
            [0, H - 65],
            [80, H - 95],
            [180, H - 120],
            [280, H - 100],
            [380, H - 135],
            [480, H - 110],
            [580, H - 140],
            [680, H - 115],
            [780, H - 130],
            [880, H - 105],
            [W, H - 80],
        ],
        "rgba(30,15,55,0.7)"
    );

    // Mid — darker
    drawMountainLayer(
        ctx,
        [
            [0, H - 40],
            [100, H - 72],
            [200, H - 90],
            [320, H - 65],
            [420, H - 95],
            [540, H - 75],
            [650, H - 100],
            [760, H - 80],
            [870, H - 90],
            [W, H - 55],
        ],
        "rgba(18,8,35,0.8)"
    );

    // Near — darkest silhouette
    drawMountainLayer(
        ctx,
        [
            [0, H - 20],
            [120, H - 50],
            [250, H - 38],
            [370, H - 55],
            [500, H - 42],
            [620, H - 60],
            [750, H - 45],
            [880, H - 55],
            [W, H - 30],
        ],
        "rgba(8,4,18,0.85)"
    );
}

function drawTorii(ctx: Ctx2D): void {
    // Small torii gate silhouette on the tallest far mountain peak
    const tx = 580,
        ty = H - 148;
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

function drawSceneBlossoms(ctx: Ctx2D): void {
    const colors = [C.pink, C.purple];
    for (const [x, y, rx, ry, rot, a, ci] of BLOSSOMS) {
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

function drawBokehParticles(ctx: Ctx2D): void {
    for (const [x, y, r, a] of BOKEH) {
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

function drawReadabilityOverlay(ctx: Ctx2D): void {
    // Left-to-right darkening so text stays legible
    const overlay = ctx.createLinearGradient(0, 0, W, 0);
    overlay.addColorStop(0, "rgba(5,2,16,0.75)");
    overlay.addColorStop(0.15, "rgba(8,4,20,0.65)");
    overlay.addColorStop(0.45, "rgba(12,6,28,0.5)");
    overlay.addColorStop(0.75, "rgba(15,8,32,0.35)");
    overlay.addColorStop(1, "rgba(20,10,40,0.25)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // Bottom darkening for stat card area
    const bottom = ctx.createLinearGradient(0, H - 120, 0, H);
    bottom.addColorStop(0, "transparent");
    bottom.addColorStop(1, "rgba(5,2,16,0.4)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H - 120, W, 120);
}

function drawAnimeBackground(ctx: Ctx2D): void {
    drawAnimeSky(ctx);
    drawNebula(ctx);
    drawStarField(ctx);
    drawCrescentMoon(ctx);
    for (const [cx, cy, sx, sy, a] of CLOUDS) drawAnimeCloud(ctx, cx, cy, sx, sy, a);
    drawMountains(ctx);
    drawTorii(ctx);
    drawSceneBlossoms(ctx);
    drawBokehParticles(ctx);
    drawReadabilityOverlay(ctx);
}

// --- UI sub-renderers ---


async function drawAvatar(
    ctx: Ctx2D,
    avatarURL: string | null,
    username: string,
    cx: number,
    cy: number,
    radius: number
): Promise<void> {
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
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    clearShadow(ctx);

    // Clip & draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (avatarURL) {
        try {
            const { data } = await axios.get(avatarURL, { responseType: "arraybuffer" });
            const img = await loadImage(Buffer.from(data));
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        } catch {
            drawAvatarFallback(ctx, cx, cy, r, username);
        }
    } else {
        drawAvatarFallback(ctx, cx, cy, r, username);
    }
    ctx.restore();

    // Online status dot
    const dotX = cx + r * Math.cos(Math.PI * 0.75);
    const dotY = cy + r * Math.sin(Math.PI * 0.75);
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
}

function drawAvatarFallback(ctx: Ctx2D, cx: number, cy: number, r: number, username: string): void {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, C.pink);
    g.addColorStop(1, C.purple);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(r * 0.65)}px "Inter Bold"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(username[0].toUpperCase(), cx, cy);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawRankBadge(ctx: Ctx2D, label: string, cx: number, topY: number, colors: [string, string]): number {
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

function drawNameBlock(
    ctx: Ctx2D,
    username: string,
    discriminator: string | undefined,
    x: number,
    y: number,
    maxW: number
): void {
    // Username
    ctx.font = '44px "Inter Bold"';
    const name = clampText(ctx, username, maxW);
    shadow(ctx, "rgba(255,107,157,0.35)", 12);
    ctx.fillStyle = gradientH(ctx, x, maxW, y, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.fillText(name, x, y);
    clearShadow(ctx);

    // Subtitle
    const sub = discriminator ? `${discriminator}` : "Member";
    ctx.font = '18px "Inter"';
    ctx.fillStyle = C.muted;
    ctx.fillText(sub, x, y + 26);

    // Thin accent underline
    const nameW = ctx.measureText(name).width;
    const lineGrad = gradientH(ctx, x, nameW, y + 32, [
        [0, C.pink],
        [0.7, C.purple],
        [1, "rgba(196,77,255,0)"],
    ]);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(x, y + 32, nameW, 2);
}

function drawXPBar(
    ctx: Ctx2D,
    xp: number,
    xpForNextLevel: number,
    percentage: number,
    x: number,
    y: number,
    barW: number
): void {
    const barH = 24;
    const r = barH / 2;

    // Label row
    ctx.font = '16px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText("EXPERIENCE", x, y);

    ctx.textAlign = "right";
    shadow(ctx, "rgba(255,107,157,0.5)", 6);
    ctx.fillStyle = C.pink;
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
            [0, C.pink],
            [1, C.purple],
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
    ctx.fillStyle = C.dimmer;
    ctx.fillText(`${xp.toLocaleString()} XP`, x, subY);
    ctx.textAlign = "right";
    ctx.fillText(`${xpForNextLevel.toLocaleString()} XP`, x + barW, subY);
    ctx.textAlign = "left";
}

function drawLevelBox(ctx: Ctx2D, level: number, x: number, y: number, w: number, h: number): void {
    // Panel
    ctx.fillStyle = C.panelFill;
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    // "LEVEL" label
    ctx.font = '15px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.textAlign = "center";
    ctx.fillText("LEVEL", x + w / 2, y + 24);

    // Number
    ctx.font = `56px "Inter Bold"`;
    shadow(ctx, "rgba(255,107,157,0.4)", 16);
    ctx.fillStyle = gradientV(ctx, y + 28, 54, x + w / 2, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.fillText(String(level), x + w / 2, y + 76);
    clearShadow(ctx);

    ctx.textAlign = "left";
}

function drawStatCard(
    ctx: Ctx2D,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: string
): void {
    // Panel bg
    ctx.fillStyle = C.panelFill;
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
    ctx.fillStyle = C.muted;
    ctx.fillText(label, x + 14, y + 22);

    // Value
    ctx.font = '28px "Inter Bold"';
    shadow(ctx, "rgba(255,255,255,0.15)", 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(value, x + 14, y + 54);
    clearShadow(ctx);
}

function drawDivider(ctx: Ctx2D, x: number, y: number, w: number): void {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
}

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
}

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
    } = options;

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
    // Extend accent stripe to full card height
    const stripeG = gradientV(ctx, 0, cardH, 0, [
        [0, C.pink],
        [1, C.purple],
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
    await drawAvatar(ctx, avatarURL, username, AV_CX, AV_CY, AV_R);

    // Dual rank badges (below avatar)
    const badgeStartY = AV_CY + AV_R + 12;
    const serverLabel = `SERVER  #${rank || "—"}`;
    const globalLabel = `GLOBAL  #${globalRank || "—"}`;
    const badgeH = drawRankBadge(ctx, serverLabel, AV_CX, badgeStartY, [C.pink, C.purple]);
    drawRankBadge(ctx, globalLabel, AV_CX, badgeStartY + badgeH + 6, [C.gold, "#ff8c00"]);

    // --- Level box (top right) ---
    drawLevelBox(ctx, level, LV_X, LV_Y, LV_W, LV_H);

    // --- Name block ---
    const NAME_Y = PAD + 40;
    drawNameBlock(ctx, username, discriminator, CONTENT_X, NAME_Y, CONTENT_W);

    // --- Divider between name and XP ---
    drawDivider(ctx, CONTENT_X, NAME_Y + 48, CONTENT_W);

    // --- XP bar ---
    const XP_Y = NAME_Y + 64;
    drawXPBar(ctx, xp, xpForNextLevel, percentage, CONTENT_X, XP_Y, CONTENT_W);

    // --- Stat cards ---
    const statItems: { label: string; value: string; color: string }[] = [
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

        const periodItems: { label: string; value: string; color: string }[] = [
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
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, W - 1, cardH - 1, 14);
    ctx.stroke();

    return canvas.toBuffer("image/png");
}
