import { model, Schema } from "mongoose";

const userSchema = new Schema(
    {
        userID: {
            type: Schema.Types.Mixed,
            required: true,
            default: null,
        },
        totalPoint: {
            type: Schema.Types.Number,
            default: 0,
        },
        totalCoin: {
            type: Schema.Types.Number,
            default: 0,
        },
        topAllServer: {
            type: Schema.Types.Number,
            default: 0,
        },
        lastActivity: {
            type: Schema.Types.Date,
            default: null,
        },
        status: {
            type: Schema.Types.Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "Users",
    }
);

userSchema.pre("save", async function (this, next: any) {
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
        throw new Error(error);
    }
});

userSchema.post("save", function (this) {
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
userSchema.post("save", (error: any, doc: any, next: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(doc);
    }
    if (error.name === "MongoError" && error.code === 11000)
        next(new Error("This document already exists, please try again"));
    else next(error);
});

userSchema.set("toJSON", {
    transform: (doc: any, ret: any) => {
        // ret.user = decrypted(ret.user, ret._id);
        delete ret.__v;
    },
});

userSchema.set("toObject", {
    transform: (doc: any, ret: any) => {
        // ret.user = decrypted(ret.user, ret._id);
        delete ret.__v;
    },
});

// Default export
const UserModel = model("User", userSchema);

export default UserModel;
