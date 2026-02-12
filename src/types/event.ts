import { Events } from 'discord.js';

export interface BotEvent {
  name: Events;
  once: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}
