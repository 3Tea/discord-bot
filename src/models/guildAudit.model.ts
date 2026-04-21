// src/models/guildAudit.model.ts
import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IGuildAudit {
    guildId: string;
    name: string;
    ownerId: string;
    memberCount: number;
    iconURL?: string | null;
    joinedAt: Date;
    leftAt?: Date | null;
    currentlyIn: boolean;
}
export type GuildAuditDoc = HydratedDocument<IGuildAudit>;

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
