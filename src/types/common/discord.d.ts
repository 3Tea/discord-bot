import type { DisTube } from "distube";
import {
    Collection,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    UserSelectMenuInteraction,
} from "discord.js";

export interface SlashCommand {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ButtonHandler {
    id: string;
    execute(interaction: ButtonInteraction): Promise<void>;
}

export interface SelectMenuHandler {
    id: string;
    execute(interaction: UserSelectMenuInteraction): Promise<void>;
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, SlashCommand>;
        buttons: Collection<string, ButtonHandler>;
        selectMenus: Collection<string, SelectMenuHandler>;
        distube: DisTube;
    }
}
