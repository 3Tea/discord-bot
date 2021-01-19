import { model, Schema } from "mongoose";
import MongoosePaginate from "mongoose-paginate-v2";

import { IStatus } from "../interface/status.interface";

const StatusSchema: Schema = new Schema(
    {
        commandName: {
            type: Schema.Types.String,
            trim: true,
            unique: true,
            required: true,
        },
        commandDescription: {
            type: Schema.Types.String,
            required: true,
        },
        status: {
            type: Schema.Types.Number,
            enum: [0, 1, 2, 3, 4, 5],
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "Status",
    }
);

StatusSchema.set("toJSON", {
    transform: function (doc: any, ret: any) {
        delete ret.__v;
    },
});

StatusSchema.set("toObject", {
    transform: function (doc: any, ret: any) {
        delete ret.__v;
    },
});

StatusSchema.pre<IStatus>("save", function (next: any) {
    try {
        const _this = this;
        if (_this.isNew) {
            Object.assign(_this.$locals, { wasNew: _this.isNew });
            // _this.$locals.wasNew = _this.isNew;
            // _this.createdAt = Date.now();
            // _this.updatedAt = Date.now();
        } else {
            // _this.updatedAt = Date.now();
        }

        next();
    } catch (error) {
        console.error(error);
        throw new Error(error.message);
    }
});

StatusSchema.post<IStatus>("save", function (this: any) {
    try {
        const _this = this;
        //! This is a document after save
        if (_this?.$locals?.wasNew) {
            //new document
        } else {
            //old document
        }
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
});

StatusSchema.plugin(MongoosePaginate);

export default model<IStatus>("Status", StatusSchema);
