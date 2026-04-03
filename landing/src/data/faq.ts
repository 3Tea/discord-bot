export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How do I set up temporary voice channels?",
    answer:
      'Create a voice channel with "TEST" prefix (e.g., "TEST Create Room"). When users join it, the bot automatically creates a personal channel for them. No additional configuration needed.',
  },
  {
    question: "Is the manga reader NSFW only?",
    answer:
      "Yes. All manga commands require an NSFW-enabled channel. The bot checks the channel setting before responding and will show an error if the channel is not marked as NSFW.",
  },
  {
    question: "What permissions does the bot need?",
    answer:
      "Administrator permission is recommended for full functionality. At minimum, the bot needs: Manage Channels (voice management), Send Messages, Embed Links, and Connect + Move Members (voice features).",
  },
  {
    question: "Can I self-host this bot?",
    answer:
      "Yes. The bot is open-source on GitHub. You need Node.js 18+, MongoDB, and optionally Redis. Check the README for Docker setup or manual installation instructions.",
  },
  {
    question: "How do I report a bug or request a feature?",
    answer:
      "Open an issue on our GitHub repository or start a discussion in GitHub Discussions. You can also reach us through the Support server link in the navbar.",
  },
];
