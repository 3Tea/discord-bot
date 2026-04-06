export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How does the XP and leveling system work?",
    answer:
      "Members earn XP from messages, voice activity, and reactions. XP is tracked per server with configurable rates. Use /rank to view your level card, /leaderboard for rankings (with daily, weekly, monthly filters), and /server-rank to see your server's stats. Admins can configure XP rates and blacklist channels via /xp commands.",
  },
  {
    question: "How do I set up temporary voice channels?",
    answer:
      'Create a voice channel with "3AT " prefix (e.g., "3AT Create Room"). When users join it, the bot automatically creates a personal channel for them. No additional configuration needed.',
  },
  {
    question: "What is the economy system?",
    answer:
      "Each server has its own economy with coins and gems. Use /pray daily to earn coins (with streak bonuses at 3, 7, 14, and 30 days). Check your balance with /balance, and browse the server shop with /shop. Admins can manage currency with /economy commands.",
  },
  {
    question: "What languages are supported?",
    answer:
      "The bot supports 15 languages: English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, and Dutch. Set your personal language with /settings language, or set a server default with /settings server-language. The bot auto-detects your Discord client language as a fallback.",
  },
  {
    question: "Is the manga reader NSFW only?",
    answer:
      "Yes. All manga commands require an NSFW-enabled channel. The bot checks the channel setting before responding and will show an error if the channel is not marked as NSFW.",
  },
  {
    question: "What permissions does the bot need?",
    answer:
      "Administrator permission is recommended for full functionality. At minimum, the bot needs: Manage Channels (voice management), Send Messages, Embed Links, Attach Files (rank cards), and Connect + Move Members (voice features).",
  },
  {
    question: "How do I report a bug or request a feature?",
    answer:
      "Open an issue on our GitHub repository or start a discussion in GitHub Discussions. You can also reach us through the Support server link in the navbar.",
  },
];
