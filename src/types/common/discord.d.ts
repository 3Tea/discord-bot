import {
    Collection,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
} from "discord.js";

export interface SlashCommand {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ButtonHandler {
    id: string;
    execute(interaction: ButtonInteraction): Promise<void>;
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, SlashCommand>;
        buttons: Collection<string, ButtonHandler>;
    }
}
