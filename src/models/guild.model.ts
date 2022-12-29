import { model, Schema } from "mongoose";

const guildSchema = new Schema(
    {
        guildID: {
            type: Schema.Types.Mixed,
            default: null,
        },
        totalPoint: {
            type: Schema.Types.Mixed,
            default: null,
        },
        topAllGuild: {
            type: Schema.Types.Mixed,
            default: null,
        },
        status: {
            type: Schema.Types.Boolean,
            default: true,
        },
        verify: {
            type: Schema.Types.Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "Guilds",
    }
);

guildSchema.pre("save", async function (this, next: any) {
    try {
        // TODO: Update time for document
        if (this.isNew) {
            Object.assign(this.$locals, { wasNew: this.isNew });
            // this.$locals.wasNew = this.isNew;
            // this.createdAt = Date.now();
            // this.updatedAt = Date.now();
        } else {
            // this.updatedAt = Date.now();
        }

        next();
    } catch (error: any) {
        console.error(error);
        throw new Error(error?.message);
    }
});

guildSchema.post("save", function (this) {
    try {
        // ! This is a document after save
        if (this?.$locals?.wasNew) {
            // new document
        } else {
            // old document
        }
    } catch (error: any) {
        throw new Error(error);
    }
});

// TODO: Log error
guildSchema.post("save", (error: any, doc: any, next: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error.name === "MongoError" && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

guildSchema.set("toJSON", {
    transform: (doc: any, ret: any) => {
        // ret.message = decrypted(ret.message, ret._id);
        delete ret.__v;
    },
});

guildSchema.set("toObject", {
    transform: (doc: any, ret: any) => {
        // ret.message = decrypted(ret.message, ret._id);
        delete ret.__v;
    },
});

// Default export
const GuildModel = model("Guild", guildSchema);

export default GuildModel;
