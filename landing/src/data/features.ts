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
    icon: "📊",
    title: "XP & Leveling",
    description:
      "Earn XP from messages, voice, and reactions. Track ranks, view canvas cards, and compete on leaderboards.",
  },
  {
    icon: "💰",
    title: "Economy System",
    description:
      "Coins, gems, daily prayers, streak rewards, and a server shop with purchasable roles and items.",
  },
  {
    icon: "📖",
    title: "Manga Reader",
    description:
      "Read from 6+ sources directly in Discord — nhentai, 3hentai, asmhentai, hentaifox & more.",
  },
  {
    icon: "🌐",
    title: "Multi-Language",
    description:
      "Supports 7 languages — English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean.",
  },
  {
    icon: "🌤️",
    title: "Utility Tools",
    description:
      "Weather, translation, avatar viewer, bot info — plus 100% slash commands with auto-complete.",
  },
];
