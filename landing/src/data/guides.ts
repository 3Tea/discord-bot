export interface GuideMeta {
  slug: string;
  label: string;
  color: string;
  bg: string;
}

export const guideMeta: Record<string, GuideMeta> = {
  economy: { slug: "economy", label: "Economy", color: "#F1C40F", bg: "rgba(241,196,15,0.15)" },
  xp: { slug: "xp", label: "XP & Leveling", color: "#9B59B6", bg: "rgba(155,89,182,0.15)" },
  voice: { slug: "voice", label: "Voice Channels", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  confessions: { slug: "confessions", label: "Confessions", color: "#E67E22", bg: "rgba(230,126,34,0.15)" },
  moderation: { slug: "moderation", label: "Moderation", color: "#C0392B", bg: "rgba(192,57,43,0.15)" },
  manga: { slug: "manga", label: "Manga & NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { slug: "utility", label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { slug: "info", label: "Info & Help", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
  settings: { slug: "settings", label: "Settings", color: "#7289DA", bg: "rgba(114,137,218,0.15)" },
};
