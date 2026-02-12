import { ButtonInteraction } from 'discord.js';

export interface ButtonHandler {
  id: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}
