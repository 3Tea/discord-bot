// src/models/auditConfig.model.ts
import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface IAuditConfig {
    _id: string;
    criticalChannelId?: string | null;
    commandsChannelId?: string | null;
    snapshotEnabled: boolean;
    alertMemberDropPct: number;
    alertBgErrorsPerHour: number;
    alertGuildLeavesPerHour: number;
    alertRoleId?: string | null;
    alertCooldownMinutes: number;
    updatedBy?: string | null;
}
export type AuditConfigDoc = HydratedDocument<IAuditConfig>;

const auditConfigSchema = new Schema<IAuditConfig>(
    {
        _id: { type: String, default: "singleton" },
        criticalChannelId: { type: String, default: null },
        commandsChannelId: { type: String, default: null },
        snapshotEnabled: { type: Boolean, default: true },
        alertMemberDropPct: { type: Number, default: 20, min: 0, max: 100 },
        alertBgErrorsPerHour: { type: Number, default: 10, min: 0 },
        alertGuildLeavesPerHour: { type: Number, default: 3, min: 0 },
        alertRoleId: { type: String, default: null },
        alertCooldownMinutes: { type: Number, default: 60, min: 1 },
        updatedBy: { type: String, default: null },
    },
    {
        timestamps: true,
        collection: "AuditConfigs",
    }
);

export default model<IAuditConfig>("AuditConfig", auditConfigSchema);
