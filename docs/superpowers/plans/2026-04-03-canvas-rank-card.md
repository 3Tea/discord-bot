# Canvas Rank Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-based enhanced embed rank card with a canvas-rendered PNG image (Anime Sakura theme).

**Architecture:** New `canvasRankCard.ts` module renders a 934x350 PNG using `@napi-rs/canvas`. The `/rank` command sends the image as an attachment, falling back to the existing embed on error. Bundled Inter font for consistent rendering.

**Tech Stack:** TypeScript, `@napi-rs/canvas`, Discord.js v14 `AttachmentBuilder`

**Spec:** `docs/superpowers/specs/2026-04-03-canvas-rank-card-design.md`

---

## File Structure

```
src/
  assets/
    fonts/
      Inter-Bold.ttf          # NEW: Bundled font (bold, for username/level)
      Inter-Regular.ttf        # NEW: Bundled font (regular, for stats/XP)
  util/
    xp/
      canvasRankCard.ts        # NEW: Canvas rendering logic
      rankCard.ts              # UNCHANGED: buildRankEmbed kept as fallback
  commands/slash/
    rank.ts                    # MODIFY: use canvas, fallback to embed
```

---

### Task 1: Install dependency and bundle fonts

**Files:**
- Modify: `package.json`
- Create: `src/assets/fonts/Inter-Bold.ttf`
- Create: `src/assets/fonts/Inter-Regular.ttf`

- [ ] **Step 1: Install @napi-rs/canvas**

Run: `npm install @napi-rs/canvas`
Expected: Package added to `package.json` dependencies

- [ ] **Step 2: Download Inter font files**

```bash
mkdir -p src/assets/fonts
curl -L -o src/assets/fonts/Inter-Bold.ttf "https://github.com/rsms/inter/raw/master/fonts/Inter-Bold.ttf"
curl -L -o src/assets/fonts/Inter-Regular.ttf "https://github.com/rsms/inter/raw/master/fonts/Inter-Regular.ttf"
```

Verify both files exist and are > 100KB:
```bash
ls -la src/assets/fonts/
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/assets/fonts/
git commit -m "feat(xp): add @napi-rs/canvas dependency and Inter font files"
```

---

### Task 2: Canvas rank card renderer

**Files:**
- Create: `src/util/xp/canvasRankCard.ts`

- [ ] **Step 1: Create the canvas rank card module**

Create `src/util/xp/canvasRankCard.ts`:

```typescript
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import path from "node:path";

// --- Register fonts on module load ---
const FONTS_DIR = path.join(__dirname, "../../assets/fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter Bold");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");

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

    // --- Background gradient ---
    const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bgGrad.addColorStop(0, COLORS.bgStart);
    bgGrad.addColorStop(0.5, COLORS.bgMid);
    bgGrad.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
    ctx.fill();
    ctx.clip();

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
    const avatarX = 60;
    const avatarY = HEIGHT / 2 - 40;
    const avatarSize = 80;
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
    const textX = 170;
    const nameY = 100;

    ctx.font = '24px "Inter Bold"';
    const nameGrad = ctx.createLinearGradient(textX, nameY - 20, textX + 200, nameY);
    nameGrad.addColorStop(0, COLORS.accentPink);
    nameGrad.addColorStop(1, COLORS.accentPurple);
    ctx.fillStyle = nameGrad;
    ctx.fillText(username, textX, nameY);

    // --- Rank (right side) ---
    ctx.font = '16px "Inter"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = "right";
    ctx.fillText("Rank", WIDTH - 80, 90);

    ctx.font = '28px "Inter Bold"';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`#${rank || "—"}`, WIDTH - 80, 122);
    ctx.textAlign = "left";

    // --- XP text ---
    ctx.font = '14px "Inter"';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`${xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`, textX, 145);

    // --- Progress bar ---
    const barX = textX;
    const barY = 165;
    const barWidth = 580;
    const barHeight = 16;
    const barRadius = 8;

    // Bar background
    ctx.fillStyle = COLORS.barBg;
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();

    // Bar fill
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

    // Percentage text on bar
    ctx.font = '11px "Inter Bold"';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${percentage}%`, barX + fillWidth - 35, barY + 12);

    // --- Stats line ---
    const statsY = 240;
    ctx.font = '15px "Inter"';
    ctx.fillStyle = COLORS.textMuted;
    const statsText = `💬 ${messageCount.toLocaleString()}    🎤 ${formatVoiceTime(voiceMinutes)}    ❤️ ${reactionCount.toLocaleString()}`;
    ctx.fillText(statsText, textX, statsY);

    // --- Return PNG buffer ---
    return canvas.toBuffer("image/png");
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/canvasRankCard.ts
git commit -m "feat(xp): add canvas rank card renderer with Anime Sakura theme"
```

---

### Task 3: Update /rank command to use canvas

**Files:**
- Modify: `src/commands/slash/rank.ts`

- [ ] **Step 1: Update rank.ts to use canvas with embed fallback**

Replace the entire content of `src/commands/slash/rank.ts` with:

```typescript
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildRankEmbed } from "../../util/xp/rankCard";
import { renderRankCard } from "../../util/xp/canvasRankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .addUserOption((option) =>
            option.setName("user").setDescription("User to check rank for")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const member = await MemberXPModel.findOne({
                guildId,
                userId: target.id,
            });

            // Calculate rank position
            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }

            const progress = progressToNextLevel(member?.xp ?? 0);

            // Try canvas render, fallback to embed
            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await renderRankCard({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: xpForLevel(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildRankEmbed(member, target.username, rank);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply("Không thể tải rank card. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/rank.ts
git commit -m "feat(xp): update /rank to use canvas rank card with embed fallback"
```
