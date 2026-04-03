export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: "🎙️",
    title: "Voice Management",
    description:
      "Create temporary voice channels with full control — lock, hide, permit, kick, transfer.",
  },
  {
    icon: "📖",
    title: "Manga Reader",
    description:
      "Read from 6 sources directly in Discord — nhentai, 3hentai, asmhentai, hentaifox & more.",
  },
  {
    icon: "🌐",
    title: "Translation",
    description:
      "Translate any language to Vietnamese instantly via Google Translate API.",
  },
  {
    icon: "🌤️",
    title: "Weather",
    description:
      "Real-time weather info for any location. Celsius, Vietnamese language support.",
  },
  {
    icon: "👤",
    title: "User Tools",
    description:
      "Avatar viewer, server info, bot info, ping — quick utility commands.",
  },
  {
    icon: "⚡",
    title: "Slash Commands",
    description:
      "100% slash commands — no prefix needed. Auto-complete, instant response.",
  },
];
