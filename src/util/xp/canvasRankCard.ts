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

            // Dark overlay for readability
            const overlay = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
            overlay.addColorStop(0, "rgba(45, 27, 78, 0.75)");
            overlay.addColorStop(0.5, "rgba(26, 16, 53, 0.8)");
            overlay.addColorStop(1, "rgba(13, 10, 26, 0.85)");
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

    // --- Avatar ---
    const avatarX = 40;
    const avatarY = HEIGHT / 2 - 50;
    const avatarSize = 100;
    const avatarRadius = avatarSize / 2;

    // Glow
    ctx.save();
    ctx.shadowColor = "rgba(196, 77, 255, 0.4)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bgMid;
    ctx.fill();
    ctx.restore();

    // Avatar image or fallback
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (avatarURL) {
        try {
            const { data } = await axios.get(avatarURL, { responseType: "arraybuffer" });
            const img = await loadImage(Buffer.from(data));
            ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        } catch {
            // Fallback: gradient circle with initial
            drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, username);
        }
    } else {
        drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, username);
    }
    ctx.restore();

    // --- Level badge ---
    const badgeText = `LV ${level}`;
    ctx.font = '14px "Inter Bold"';
    const badgeWidth = ctx.measureText(badgeText).width + 16;
    const badgeX = avatarX + avatarSize - badgeWidth / 2;
    const badgeY = avatarY + avatarSize - 8;

    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY);
    badgeGrad.addColorStop(0, COLORS.accentPink);
    badgeGrad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = badgeGrad;
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 22, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = '14px "Inter Bold"';
    ctx.fillText(badgeText, badgeX + 8, badgeY + 16);

    // --- Username (gradient text) ---
    const textX = 180;
    const nameY = 95;

    ctx.font = '26px "Inter Bold"';
    const nameGrad = ctx.createLinearGradient(textX, nameY - 20, textX + 250, nameY);
    nameGrad.addColorStop(0, COLORS.accentPink);
    nameGrad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = nameGrad;
    ctx.fillText(username, textX, nameY);

    // --- Rank (right side) ---
    ctx.font = '16px "Inter"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = "right";
    ctx.fillText("Rank", WIDTH - 60, 90);

    ctx.font = '30px "Inter Bold"';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`#${rank || "—"}`, WIDTH - 60, 125);
    ctx.textAlign = "left";

    // --- XP text ---
    const contentWidth = WIDTH - textX - 80;
    ctx.font = '14px "Inter"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`${xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`, textX, 140);

    // --- Progress bar ---
    const barX = textX;
    const barY = 160;
    const barWidth = contentWidth;
    const barHeight = 18;
    const barRadius = 9;

    // Bar background
    ctx.fillStyle = COLORS.barBg;
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();

    // Bar fill (skip if 0%)
    if (percentage > 0) {
        const fillWidth = Math.max(barRadius * 2, (percentage / 100) * barWidth);
        ctx.save();
        ctx.shadowColor = "rgba(255, 107, 157, 0.5)";
        ctx.shadowBlur = 8;
        const barGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        barGrad.addColorStop(0, COLORS.accentPink);
        barGrad.addColorStop(1, COLORS.accentPurple);
        ctx.fillStyle = barGrad;
        drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
        ctx.fill();
        ctx.restore();
    }

    // Percentage text (right of bar)
    ctx.font = '13px "Inter Bold"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = "right";
    ctx.fillText(`${percentage}%`, barX + barWidth, barY - 5);
    ctx.textAlign = "left";

    // --- Stats line (text labels instead of emoji) ---
    const statsY = 220;
    ctx.font = '14px "Inter"';
    ctx.fillStyle = COLORS.textMuted;

    // Messages
    ctx.fillStyle = COLORS.accentPink;
    ctx.font = '14px "Inter Bold"';
    ctx.fillText("MSG", textX, statsY);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px "Inter"';
    ctx.fillText(messageCount.toLocaleString(), textX + 40, statsY);

    // Voice
    const voiceX = textX + 140;
    ctx.fillStyle = COLORS.accentPink;
    ctx.font = '14px "Inter Bold"';
    ctx.fillText("VOICE", voiceX, statsY);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px "Inter"';
    ctx.fillText(formatVoiceTime(voiceMinutes), voiceX + 55, statsY);

    // Reactions
    const reactX = textX + 310;
    ctx.fillStyle = COLORS.accentPink;
    ctx.font = '14px "Inter Bold"';
    ctx.fillText("REACT", reactX, statsY);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px "Inter"';
    ctx.fillText(reactionCount.toLocaleString(), reactX + 58, statsY);

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
