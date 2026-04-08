import { model, Schema, Document } from "mongoose";

export interface IConfessionBan extends Document {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;
    active: boolean;
}

const confessionBanSchema = new Schema(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        moderatorId: { type: String, required: true },
        reason: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        active: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "ConfessionBans" }
);

confessionBanSchema.index({ guildId: 1, userId: 1, active: 1 });

export default model<IConfessionBan>("ConfessionBan", confessionBanSchema);
