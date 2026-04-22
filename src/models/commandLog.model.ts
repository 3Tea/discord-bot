import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface ICommandLog {
    commandName: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    options: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
    createdAt: Date;
}
export type CommandLogDoc = HydratedDocument<ICommandLog>;

const commandLogSchema = new Schema<ICommandLog>(
    {
        commandName: { type: String, required: true },
        userId: { type: String, required: true },
        username: { type: String, required: true },
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        options: { type: Schema.Types.Mixed, default: {} },
        success: { type: Boolean, required: true },
        errorMessage: { type: String },
        latencyMs: { type: Number, required: true },
    },
    {
        timestamps: true,
        collection: "CommandLogs",
    }
);

commandLogSchema.index({ commandName: 1, createdAt: -1 });
commandLogSchema.index({ userId: 1, createdAt: -1 });
commandLogSchema.index({ guildId: 1, createdAt: -1 });

const CommandLogModel = model<ICommandLog>("CommandLog", commandLogSchema);

export default CommandLogModel;
