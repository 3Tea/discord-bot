// src/models/auditConfig.model.ts
import { Document, model, Schema } from "mongoose";

export interface IAuditConfig extends Document {
    criticalChannelId?: string | null;
    commandsChannelId?: string | null;
    snapshotEnabled: boolean;
    updatedBy?: string | null;
}

const auditConfigSchema = new Schema(
    {
        _id: { type: String, default: "singleton" },
        criticalChannelId: { type: String, default: null },
        commandsChannelId: { type: String, default: null },
        snapshotEnabled: { type: Boolean, default: true },
        updatedBy: { type: String, default: null },
    },
    {
        timestamps: true,
        collection: "AuditConfigs",
    }
);

export default model<IAuditConfig>("AuditConfig", auditConfigSchema);
