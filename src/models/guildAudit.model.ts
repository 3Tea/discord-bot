// src/models/guildAudit.model.ts
import { Document, model, Schema } from "mongoose";

export interface IGuildAudit extends Document {
    guildId: string;
    name: string;
    ownerId: string;
    memberCount: number;
    iconURL?: string | null;
    joinedAt: Date;
    leftAt?: Date | null;
    currentlyIn: boolean;
}

const guildAuditSchema = new Schema<IGuildAudit>(
    {
        guildId: { type: String, required: true },
        name: { type: String, required: true },
        ownerId: { type: String, required: true },
        memberCount: { type: Number, required: true, default: 0 },
        iconURL: { type: String, default: null },
        joinedAt: { type: Date, required: true },
        leftAt: { type: Date, default: null },
        currentlyIn: { type: Boolean, required: true, default: true },
    },
    { timestamps: true, collection: "GuildAudits" }
);

guildAuditSchema.index({ guildId: 1 }, { unique: true });
guildAuditSchema.index({ currentlyIn: 1, updatedAt: -1 });

export default model<IGuildAudit>("GuildAudit", guildAuditSchema);
