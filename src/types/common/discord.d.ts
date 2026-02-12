import { Collection } from 'discord.js';
import { SlashCommand } from '../command';
import { ButtonHandler } from '../button';

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, SlashCommand>;
    buttons: Collection<string, ButtonHandler>;
  }
}
