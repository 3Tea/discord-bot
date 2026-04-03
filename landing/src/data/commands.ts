export type Category = "voice" | "manga" | "utility" | "info";

export interface Command {
  name: string;
  description: string;
  category: Category;
  subcommands?: string[];
  options?: string[];
}

export const categoryMeta: Record<
  Category,
  { label: string; color: string; bg: string }
> = {
  voice: { label: "Voice", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  manga: { label: "NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { label: "Info", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
};

export const commands: Command[] = [
  {
    name: "voice",
    description:
      "Voice channel management — lock, unlock, hide, permit, block, kick, transfer, rename, limit",
    category: "voice",
    subcommands: [
      "limit", "name", "lock", "unlock", "hide", "permit", "block", "kick", "transfer",
    ],
  },
  {
    name: "nhentai",
    description: "H manga and D reader from nhentai.net",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "3hentai",
    description: "H manga and D from 3hentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "asmhentai",
    description: "Gets random doujinshi on asmhentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "hentaifox",
    description: "Gets random doujinshi on hentaifox",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "nhentai-lite",
    description: "H manga and D reader nhentai lite",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "pururin",
    description: "Gets random doujinshi on pururin",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "trans",
    description: "Translate all languages to Vietnamese",
    category: "utility",
    options: ["word (required)"],
  },
  {
    name: "weather",
    description: "Get weather information for any location",
    category: "utility",
    options: ["location (required)"],
  },
  {
    name: "ping",
    description: "Replies with Pong! Shows bot latency",
    category: "utility",
  },
  {
    name: "help",
    description: "Get the help commands list",
    category: "info",
  },
  {
    name: "info",
    description: "Information about bot — version, stats, tech stack",
    category: "info",
    subcommands: ["bot"],
  },
  {
    name: "avatar",
    description: "Get the avatar URL of the selected user, or your own avatar",
    category: "info",
    options: ["target (optional)"],
  },
];
