import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";

// --- Register fonts on module load ---
const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter Bold");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");

// --- Load background images on module load ---
const BG_DIR = path.join(process.cwd(), "src/assets/backgrounds");
const backgroundFiles: string[] = [];

try {
    const files = fs.readdirSync(BG_DIR);
    for (const file of files) {
        if (/\.(jpg|jpeg|png)$/i.test(file)) {
            backgroundFiles.push(path.join(BG_DIR, file));
        }
    }
} catch {
    // Folder doesn't exist or can't be read — use gradient fallback
}

function getRandomBackground(): string | null {
    if (backgroundFiles.length === 0) return null;
    return backgroundFiles[Math.floor(Math.random() * backgroundFiles.length)];
}

// --- Constants ---
const WIDTH = 934;
const HEIGHT = 350;

const COLORS = {
    bgStart: "#2d1b4e",
    bgMid: "#1a1035",
    bgEnd: "#0d0a1a",
    accentPink: "#ff6b9d",
    accentPurple: "#c44dff",
    textMuted: "#8a7aaa",
    gold: "#ffd700",
    barBg: "rgba(255, 107, 157, 0.15)",
    petal: "#ff6b9d",
} as const;

// --- Sakura petal positions (pre-defined for consistency) ---
const PETALS = [
    { x: 820, y: 30, rx: 6, ry: 14, rot: 0.3, opacity: 0.35 },
    { x: 750, y: 60, rx: 4, ry: 9, rot: 1.2, opacity: 0.2 },
    { x: 880, y: 90, rx: 5, ry: 12, rot: 0.8, opacity: 0.3 },
    { x: 700, y: 140, rx: 7, ry: 15, rot: 2.1, opacity: 0.15 },
    { x: 860, y: 180, rx: 4, ry: 10, rot: 1.5, opacity: 0.25 },
    { x: 780, y: 250, rx: 6, ry: 13, rot: 0.5, opacity: 0.3 },
    { x: 900, y: 280, rx: 5, ry: 11, rot: 1.8, opacity: 0.2 },
    { x: 650, y: 300, rx: 4, ry: 8, rot: 2.5, opacity: 0.18 },
    { x: 100, y: 280, rx: 5, ry: 11, rot: 1.0, opacity: 0.15 },
    { x: 50, y: 180, rx: 4, ry: 9, rot: 2.2, opacity: 0.12 },
    { x: 200, y: 320, rx: 6, ry: 13, rot: 0.7, opacity: 0.2 },
    { x: 550, y: 40, rx: 3, ry: 7, rot: 1.9, opacity: 0.15 },
    { x: 450, y: 310, rx: 5, ry: 10, rot: 0.4, opacity: 0.18 },
];

// --- Helper functions ---

function formatVoiceTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void {
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

// --- Type alias for canvas context ---
type CanvasRenderingContext2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

// --- Main render function ---

export interface RankCardOptions {
    username: string;
    avatarURL: string | null;
    level: number;
    rank: number;
    xp: number;
    xpForNextLevel: number;
    percentage: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

export async function renderRankCard(options: RankCardOptions): Promise<Buffer> {
    const {
        username, avatarURL, level, rank, xp, xpForNextLevel,
        percentage, messageCount, voiceMinutes, reactionCount,
    } = options;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    // --- Background ---
    drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
    ctx.clip();

    const bgImagePath = getRandomBackground();
    if (bgImagePath) {
        // Draw background image (cover fit)
        try {
            const bgImg = await loadImage(fs.readFileSync(bgImagePath));
            const scale = Math.max(WIDTH / bgImg.width, HEIGHT / bgImg.height);
            const scaledW = bgImg.width * scale;
            const scaledH = bgImg.height * scale;
            const offsetX = (WIDTH - scaledW) / 2;
            const offsetY = (HEIGHT - scaledH) / 2;
            ctx.drawImage(bgImg, offsetX, offsetY, scaledW, scaledH);

            // Dark overlay — stronger on left for avatar readability
            const overlay = ctx.createLinearGradient(0, 0, WIDTH, 0);
            overlay.addColorStop(0, "rgba(13, 10, 26, 0.82)");
            overlay.addColorStop(0.3, "rgba(26, 16, 53, 0.65)");
            overlay.addColorStop(1, "rgba(45, 27, 78, 0.5)");
            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        } catch {
            // Image load failed — fall through to gradient
            drawGradientBackground(ctx);
        }
    } else {
        drawGradientBackground(ctx);
    }

    // --- Sakura petals ---
    for (const petal of PETALS) {
        ctx.save();
        ctx.globalAlpha = petal.opacity;
        ctx.fillStyle = COLORS.petal;
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.rx, petal.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Content panel with border ---
    const panelX = 25;
    const panelY = 20;
    const panelW = WIDTH - 50;
    const panelH = HEIGHT - 40;
    ctx.fillStyle = "rgba(13, 10, 26, 0.55)";
    drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 107, 157, 0.15)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    // --- Shadow helpers ---
    const setShadow = () => { ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1; };
    const clearShadow = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };

    // --- Avatar (centered vertically in panel, with badge below) ---
    const avatarSize = 105;
    const avatarRadius = avatarSize / 2;
    const badgeH = 28;
    const avatarX = 50;
    const avatarY = panelY + (panelH - avatarSize - badgeH - 6) / 2;
    const avatarCX = avatarX + avatarRadius;
    const avatarCY = avatarY + avatarRadius;

    // Gradient ring
    ctx.save();
    ctx.shadowColor = "rgba(196, 77, 255, 0.5)";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarRadius + 4, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    ringGrad.addColorStop(0, COLORS.accentPink);
    ringGrad.addColorStop(1, COLORS.accentPurple);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Avatar image
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (avatarURL) {
        try {
            const { data } = await axios.get(avatarURL, { responseType: "arraybuffer" });
            const img = await loadImage(Buffer.from(data));
            ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        } catch { drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, username); }
    } else { drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, username); }
    ctx.restore();

    // Level badge (centered below avatar)
    const badgeText = `LV ${level}`;
    ctx.font = '14px "Inter Bold"';
    const badgeWidth = ctx.measureText(badgeText).width + 22;
    const badgeX = avatarCX - badgeWidth / 2;
    const badgeY = avatarY + avatarSize + 6;
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY);
    badgeGrad.addColorStop(0, COLORS.accentPink);
    badgeGrad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = badgeGrad;
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeH, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '14px "Inter Bold"';
    ctx.textAlign = "center";
    ctx.fillText(badgeText, avatarCX, badgeY + 19);
    ctx.textAlign = "left";

    // --- Right content area ---
    const textX = 185;
    const contentRight = WIDTH - 50;
    const contentWidth = contentRight - textX;
    const maxNameWidth = contentWidth - 110;

    // --- 3 zones evenly spaced in panel ---
    // Zone 1 (top):    Username + Rank
    // Zone 2 (middle): XP + Progress bar
    // Zone 3 (bottom): Stats

    const zone1Y = panelY + 50;
    const zone2Y = panelY + 120;
    const statsLabelY = panelY + panelH - 65;
    const statsValueY = statsLabelY + 25;

    // --- Zone 1: Username + Rank ---
    setShadow();
    ctx.font = '30px "Inter Bold"';
    let displayName = username;
    while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== username) displayName += "..";
    const nameGrad = ctx.createLinearGradient(textX, zone1Y - 20, textX + maxNameWidth, zone1Y);
    nameGrad.addColorStop(0, COLORS.accentPink);
    nameGrad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = nameGrad;
    ctx.fillText(displayName, textX, zone1Y);
    clearShadow();

    // Rank top-right
    setShadow();
    ctx.textAlign = "right";
    ctx.font = '12px "Inter Bold"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText("RANK", contentRight, panelY + 35);
    ctx.font = '32px "Inter Bold"';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`#${rank || "—"}`, contentRight, panelY + 65);
    ctx.textAlign = "left";
    clearShadow();

    // --- Zone 2: XP + Progress bar ---
    setShadow();
    ctx.font = '15px "Inter Bold"';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`, textX, zone2Y);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.accentPink;
    ctx.fillText(`${percentage}%`, textX + contentWidth, zone2Y);
    ctx.textAlign = "left";
    clearShadow();

    const barY = zone2Y + 12;
    const barHeight = 20;
    const barRadius = 10;

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    drawRoundedRect(ctx, textX, barY, contentWidth, barHeight, barRadius);
    ctx.fill();

    if (percentage > 0) {
        const fillWidth = Math.max(barRadius * 2, (percentage / 100) * contentWidth);
        ctx.save();
        ctx.shadowColor = "rgba(255, 107, 157, 0.5)";
        ctx.shadowBlur = 8;
        const barGrad = ctx.createLinearGradient(textX, barY, textX + contentWidth, barY);
        barGrad.addColorStop(0, COLORS.accentPink);
        barGrad.addColorStop(1, COLORS.accentPurple);
        ctx.fillStyle = barGrad;
        drawRoundedRect(ctx, textX, barY, fillWidth, barHeight, barRadius);
        ctx.fill();
        ctx.restore();
    }

    // --- Divider ---
    const dividerY = barY + barHeight + 22;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textX, dividerY);
    ctx.lineTo(contentRight, dividerY);
    ctx.stroke();

    // --- Zone 3: Stats (anchored to panel bottom) ---
    const colW = contentWidth / 3;

    const drawStat = (label: string, value: string, colIndex: number) => {
        const cx = textX + colW * colIndex + colW / 2;
        setShadow();
        ctx.textAlign = "center";
        ctx.font = '12px "Inter Bold"';
        ctx.fillStyle = COLORS.accentPink;
        ctx.fillText(label, cx, statsLabelY);
        ctx.font = '22px "Inter Bold"';
        ctx.fillStyle = "#ffffff";
        ctx.fillText(value, cx, statsValueY);
        ctx.textAlign = "left";
        clearShadow();
    };

    drawStat("MESSAGES", messageCount.toLocaleString(), 0);
    drawStat("VOICE", formatVoiceTime(voiceMinutes), 1);
    drawStat("REACTIONS", reactionCount.toLocaleString(), 2);

    // --- Return PNG buffer ---
    return canvas.toBuffer("image/png");
}

function drawGradientBackground(ctx: CanvasRenderingContext2D): void {
    const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bgGrad.addColorStop(0, COLORS.bgStart);
    bgGrad.addColorStop(0.5, COLORS.bgMid);
    bgGrad.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawAvatarFallback(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    username: string
): void {
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, COLORS.accentPink);
    grad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = "#ffffff";
    ctx.font = '32px "Inter Bold"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(username[0].toUpperCase(), x + size / 2, y + size / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}
